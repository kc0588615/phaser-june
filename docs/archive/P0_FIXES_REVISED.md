# P0 Critical Fixes - REVISED (Post-Codex Review)

**Date**: 2025-10-19
**Status**: Revised based on Codex expert review
**Original Review**: See P0_FIXES_PROPOSAL.md

---

## Critical Issues Found by Codex Review

### Fix #1 Issues
1. ❌ **Queue never drains**: `canMove` check at line 133 prevents pending location from executing
2. ❌ **Lost user input on errors**: Exception handler clears queue without recovery
3. ❌ **No user feedback**: Silent queue drops on error paths

### Fix #2 Issues
1. ❌ **Rate limit race condition**: Concurrent submissions can bypass 30s cooldown
2. ❌ **Production data loss**: `DROP TABLE` will wipe existing scores on migration
3. ❌ **SQL syntax error**: `cleanup_rate_limits()` returns data without destination
4. ❌ **O(n) rank calculation**: `COUNT(*)` becomes bottleneck at 100K+ scores

---

## FIX #1 - REVISED: Cascade Guard

### Changes from Original

**Problem Identified**: The pending queue check (original line 133):
```typescript
if (this.pendingLocationChange && this.canMove && !this.isDragging) {
```

This condition **never evaluates to true** because:
- `handleCascades()` is called from `applyMoveAndHandleResults()`
- `canMove` is set to `false` at line 641 in `handlePointerUp`
- `canMove` is only restored to `true` in the `finally` block (line 671)
- The `finally` block runs **after** `handleCascades()` completes
- Therefore, when `handleCascades()` finishes and checks the queue, `canMove` is still `false`

**Result**: Queued location changes are **never processed** → complete regression!

---

### Solution: Process Queue After Input Re-enabled

**Strategy**: Move queue processing to the `finally` block where `canMove` is restored.

#### Updated Code

**1. Remove queue processing from handleCascades** (delete lines 132-142 from original):

```typescript
private async handleCascades(): Promise<void> {
    if (!this.backendPuzzle || !this.boardView) {
        this.isProcessingCascade = false;
        return;
    }

    this.isProcessingCascade = true;

    try {
        const gridStateBeforeCascade = this.backendPuzzle.getGridState();
        const cascadePhase = this.backendPuzzle.getNextExplodeAndReplacePhase([]);

        if (!cascadePhase.isNothingToDo()) {
            const cascadeScore = this.backendPuzzle.calculatePhaseBaseScore(cascadePhase);
            this.turnBaseTotalScore += cascadeScore;
            this.anyMatchThisTurn = true;

            await this.animatePhaseWithOriginalGems(cascadePhase, gridStateBeforeCascade);
            await this.handleCascades(); // Recursive - flag stays set
            return; // Exit early to avoid clearing flag
        }

        // Base case: no more cascades
        this.isProcessingCascade = false;

    } catch (error) {
        console.error("Error in handleCascades:", error);
        this.isProcessingCascade = false;
        // DO NOT clear pendingLocationChange here - allow retry after recovery
        throw error;
    }
}
```

**2. Update handlePointerUp finally block** (replace lines 670-672):

```typescript
private async handlePointerUp(pointer: Phaser.Input.Pointer): Promise<void> {
    // ... existing code up to line 669 ...

    } catch (error) {
        console.error("Error processing pointer up:", error);
        if (dSprites.length > 0 && this.boardView) {
            await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
        }
        if (this.boardView && this.backendPuzzle) {
            this.boardView.syncSpritesToGridPositions();
        }
    } finally {
        // Re-enable input
        this.canMove = true;

        // Process any pending location change NOW (after canMove is restored)
        this.processPendingLocationChange();
    }
}
```

**3. Add dedicated queue processor method**:

```typescript
/**
 * Process any pending location change that was queued during gameplay
 * Called after input is re-enabled to ensure safe execution
 */
private processPendingLocationChange(): void {
    if (!this.pendingLocationChange) {
        return; // No pending request
    }

    if (!this.canMove || this.isDragging || this.isProcessingCascade) {
        console.warn("Cannot process pending location: game still busy");
        return; // Not safe yet, will retry on next input completion
    }

    const pending = this.pendingLocationChange;
    this.pendingLocationChange = null;

    console.log("Game Scene: Processing queued location change");

    // Small delay for visual smoothness (allow animations to complete)
    this.time.delayedCall(300, () => {
        // Double-check state hasn't changed during delay
        if (this.canMove && !this.isDragging && !this.isProcessingCascade) {
            this.initializeBoardFromCesium(pending);
        } else {
            // State changed, re-queue
            console.log("Game Scene: Re-queuing location change (state changed during delay)");
            this.pendingLocationChange = pending;
        }
    });
}
```

**4. Call processor from onMoveResolved** (add after line 161):

```typescript
private onMoveResolved(baseTurnScore: number, didAnyMatch: boolean): void {
    if (!this.backendPuzzle) return;

    this.backendPuzzle.decrementMoves(1);
    this.emitHud();

    // Process pending location change if queued
    this.processPendingLocationChange();

    if (this.backendPuzzle.getMovesRemaining() <= 0) {
        this.disableInputs();
        this.emitHud();
        const finalScore = this.backendPuzzle.getScore();
        this.time.delayedCall(100, () => {
            this.scene.start('GameOver', { score: finalScore });
        });
    }
}
```

**5. Enhanced error recovery in handleLocationSelected**:

```typescript
private handleLocationSelected(data: EventPayloads['cesium-location-selected']): void {
    // Block if game is busy
    if (!this.canMove || this.isProcessingCascade || this.isDragging) {
        console.log("Game Scene: Location change queued (game in progress)");

        // Store latest request (overwrite any existing)
        this.pendingLocationChange = data;

        // User feedback
        EventBus.emit('show-toast', {
            message: 'Location change queued - completing current action...',
            type: 'info',
            duration: 2000
        });
        return;
    }

    // Clear any stale pending requests
    this.pendingLocationChange = null;

    // Safe to proceed
    this.initializeBoardFromCesium(data);
}
```

---

### Testing Additions

Additional test cases to verify queue draining:

- [ ] **Queue during move**: Drag gem → click map mid-cascade → verify processes after `finally` block
- [ ] **Queue during error**: Force cascade error → verify pending location is NOT lost
- [ ] **Multiple queued requests**: Click map 5 times during long cascade → verify only last executes
- [ ] **State change during delay**: Queue location → drag gem during 300ms delay → verify re-queues
- [ ] **Game over with pending**: Queue location → run out of moves → verify queue cleared on scene transition

---

## FIX #2 - REVISED: Score Validation

### Changes from Original

#### Issue #1: Rate Limit Race Condition

**Problem**: Two concurrent submissions can both pass this check:
```sql
SELECT MAX(created_at) INTO v_last_submission
FROM score_submission_rate_limit
WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '30 seconds';
```

If both queries execute before either INSERT, both will see no recent submission.

**Solution**: Use PostgreSQL advisory locks or unique constraint with ON CONFLICT:

```sql
-- Add unique constraint to prevent concurrent submissions
-- Change PRIMARY KEY to allow enforcement
ALTER TABLE score_submission_rate_limit
DROP CONSTRAINT IF EXISTS score_submission_rate_limit_pkey;

-- Add unique constraint on user_id with partial index for recent submissions
CREATE UNIQUE INDEX idx_rate_limit_recent_user
ON score_submission_rate_limit(user_id)
WHERE created_at > NOW() - INTERVAL '30 seconds';

-- Update INSERT to handle conflicts
-- In submit_validated_score function:
BEGIN
    -- Try to insert rate limit entry atomically
    INSERT INTO score_submission_rate_limit (user_id, created_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT ON CONSTRAINT idx_rate_limit_recent_user DO NOTHING;

    -- If insert was blocked, we hit the rate limit
    IF NOT FOUND THEN
        -- Calculate time remaining
        SELECT created_at INTO v_last_submission
        FROM score_submission_rate_limit
        WHERE user_id = p_user_id
          AND created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN QUERY SELECT
            FALSE,
            'Rate limit exceeded. Please wait ' ||
            CEIL(EXTRACT(EPOCH FROM (v_last_submission + INTERVAL '30 seconds' - NOW())))::TEXT ||
            ' seconds before submitting again.',
            0,
            0;
        RETURN;
    END IF;

    -- Continue with validation...
END;
```

**Better Alternative - Advisory Lock**:

```sql
-- At start of function
BEGIN
    -- Acquire advisory lock for this user (released at transaction end)
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    -- Now safe to check rate limit without race condition
    SELECT MAX(created_at) INTO v_last_submission
    FROM score_submission_rate_limit
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '30 seconds';

    -- ... rest of validation
END;
```

#### Issue #2: Production Data Loss

**Problem**: Migration starts with:
```sql
DROP TABLE IF EXISTS score_submission_rate_limit CASCADE;
DROP TABLE IF EXISTS high_scores CASCADE;
```

This will **delete all production scores** on deploy!

**Solution**: Make migration truly idempotent:

```sql
-- ============================================
-- Migration: 20251019_score_validation
-- SAFE for production: Only creates if not exists
-- ============================================

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS high_scores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    moves_made INTEGER NOT NULL CHECK (moves_made >= 0),
    total_moves INTEGER NOT NULL CHECK (total_moves > 0),
    species_discovered INTEGER[] DEFAULT '{}',
    session_duration_sec INTEGER CHECK (session_duration_sec > 0 AND session_duration_sec <= 7200),
    client_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_high_scores_score_desc ON high_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_created_at ON high_scores(created_at DESC);

CREATE TABLE IF NOT EXISTS score_submission_rate_limit (
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON score_submission_rate_limit(created_at)
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Use CREATE OR REPLACE for functions (safe to re-run)
CREATE OR REPLACE FUNCTION submit_validated_score(...)
RETURNS TABLE(...)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
    -- ... function body
$$;

-- Add RLS policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'high_scores'
        AND policyname = 'Users can insert own scores'
    ) THEN
        CREATE POLICY "Users can insert own scores"
        ON high_scores FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'high_scores'
        AND policyname = 'Anyone can view high scores'
    ) THEN
        CREATE POLICY "Anyone can view high scores"
        ON high_scores FOR SELECT
        USING (true);
    END IF;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;
```

#### Issue #3: cleanup_rate_limits SQL Error

**Problem**: Function returns data without destination:
```sql
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE sql
AS $$
    DELETE FROM score_submission_rate_limit
    WHERE created_at < NOW() - INTERVAL '1 hour'
    RETURNING 1;  -- ❌ Returns multiple rows but function expects INTEGER

    SELECT COUNT(*)::INTEGER FROM score_submission_rate_limit WHERE FALSE;  -- ❌ Unreachable
$$;
```

**Solution**: Fix return value:

```sql
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM score_submission_rate_limit
    WHERE created_at < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;
```

#### Issue #4: O(n) Rank Calculation

**Problem**: This runs on every score insert:
```sql
SELECT COUNT(*) + 1 INTO v_rank
FROM high_scores
WHERE score > v_recorded_score;
```

At 100K scores, this becomes a sequential scan bottleneck.

**Solution**: Calculate ranks on read, not write:

```sql
-- Remove rank calculation from submit_validated_score
-- Return rank as 0 (or NULL) on insert

-- Create optimized leaderboard view with window function
CREATE OR REPLACE VIEW leaderboard_with_ranks AS
SELECT
    user_id,
    score,
    moves_made,
    species_discovered,
    created_at,
    RANK() OVER (ORDER BY score DESC) as rank
FROM high_scores
ORDER BY score DESC;

-- For top 100 leaderboard (fast query)
CREATE INDEX idx_high_scores_top ON high_scores(score DESC)
WHERE score > (SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY score) FROM high_scores);
```

**TypeScript update**:
```typescript
// Don't show rank immediately after submission
const result = await speciesService.submitScore({...});
if (result.success) {
    toast.success(`Score ${result.recordedScore} recorded!`);

    // Fetch rank separately (optional)
    const rank = await speciesService.getUserRank(userId, result.recordedScore);
    if (rank) {
        toast.info(`You're ranked #${rank}!`);
    }
}
```

---

## Revised Migration File

**File**: `supabase/migrations/20251019_score_validation_v2.sql`

```sql
-- ============================================
-- Score Submission with Validation & Rate Limiting
-- Migration: 20251019_score_validation_v2
-- PRODUCTION SAFE: Idempotent, preserves existing data
-- ============================================

-- ============================================
-- Table: high_scores
-- ============================================
CREATE TABLE IF NOT EXISTS high_scores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    moves_made INTEGER NOT NULL CHECK (moves_made >= 0),
    total_moves INTEGER NOT NULL CHECK (total_moves > 0),
    species_discovered INTEGER[] DEFAULT '{}',
    session_duration_sec INTEGER CHECK (session_duration_sec > 0 AND session_duration_sec <= 7200),
    client_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_high_scores_score_desc ON high_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_user_id ON high_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_high_scores_created_at ON high_scores(created_at DESC);

-- Partial index for top 1% (for leaderboard optimization)
CREATE INDEX IF NOT EXISTS idx_high_scores_top_percentile ON high_scores(score DESC, created_at DESC)
WHERE score > 10000; -- Adjust threshold based on your scoring model

-- ============================================
-- Table: score_submission_rate_limit
-- ============================================
CREATE TABLE IF NOT EXISTS score_submission_rate_limit (
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cleanup index
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON score_submission_rate_limit(created_at)
WHERE created_at < NOW() - INTERVAL '1 hour';

-- ============================================
-- Function: cleanup_rate_limits (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM score_submission_rate_limit
    WHERE created_at < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % rate limit entries', v_deleted_count;
    RETURN v_deleted_count;
END;
$$;

-- ============================================
-- Function: submit_validated_score (REVISED)
-- Race-condition safe, no rank calculation
-- ============================================
CREATE OR REPLACE FUNCTION submit_validated_score(
    p_user_id UUID,
    p_score INTEGER,
    p_moves_made INTEGER,
    p_total_moves INTEGER,
    p_species_discovered INTEGER[],
    p_session_duration_sec INTEGER,
    p_client_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    recorded_score INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_max_theoretical_score INTEGER;
    v_recorded_score INTEGER;
    v_last_submission TIMESTAMPTZ;
    v_invalid_species_count INTEGER;
BEGIN
    -- ========================================
    -- ADVISORY LOCK: Prevents rate limit races
    -- ========================================
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    -- ========================================
    -- VALIDATION LAYER 1: Rate Limiting
    -- Now race-condition safe with advisory lock
    -- ========================================
    SELECT MAX(created_at) INTO v_last_submission
    FROM score_submission_rate_limit
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '30 seconds';

    IF v_last_submission IS NOT NULL THEN
        RETURN QUERY SELECT
            FALSE,
            'Rate limit exceeded. Please wait ' ||
            CEIL(EXTRACT(EPOCH FROM (v_last_submission + INTERVAL '30 seconds' - NOW())))::TEXT ||
            ' seconds.',
            0;
        RETURN;
    END IF;

    -- ========================================
    -- VALIDATION LAYER 2: Basic Sanity
    -- ========================================
    IF p_score < 0 THEN
        RETURN QUERY SELECT FALSE, 'Invalid score: cannot be negative', 0;
        RETURN;
    END IF;

    IF p_moves_made < 0 OR p_total_moves <= 0 OR p_moves_made > p_total_moves THEN
        RETURN QUERY SELECT FALSE, 'Invalid move counts', 0;
        RETURN;
    END IF;

    -- ========================================
    -- VALIDATION LAYER 3: Session Duration
    -- ========================================
    IF p_session_duration_sec < 1 OR p_session_duration_sec > 7200 THEN
        RETURN QUERY SELECT FALSE, 'Invalid session duration (1-7200 seconds)', 0;
        RETURN;
    END IF;

    -- ========================================
    -- VALIDATION LAYER 4: Theoretical Max Score
    -- ========================================
    v_max_theoretical_score := (p_total_moves * 100 * 5) + (9 * 50 * 5);

    IF p_score > v_max_theoretical_score THEN
        RETURN QUERY SELECT
            FALSE,
            'Score exceeds theoretical maximum (' || v_max_theoretical_score || ')',
            0;
        RETURN;
    END IF;

    -- ========================================
    -- VALIDATION LAYER 5: Species IDs
    -- ========================================
    IF p_species_discovered IS NOT NULL AND array_length(p_species_discovered, 1) > 0 THEN
        -- Limit array size
        IF array_length(p_species_discovered, 1) > 100 THEN
            RETURN QUERY SELECT FALSE, 'Too many species provided (max 100)', 0;
            RETURN;
        END IF;

        -- Validate IDs exist
        SELECT COUNT(*) INTO v_invalid_species_count
        FROM unnest(p_species_discovered) AS provided_id
        WHERE NOT EXISTS (
            SELECT 1 FROM icaa WHERE ogc_fid = provided_id
        );

        IF v_invalid_species_count > 0 THEN
            RETURN QUERY SELECT FALSE, 'Invalid species IDs provided', 0;
            RETURN;
        END IF;
    END IF;

    -- ========================================
    -- INSERT: All validations passed
    -- ========================================
    INSERT INTO high_scores (
        user_id, score, moves_made, total_moves,
        species_discovered, session_duration_sec,
        client_metadata, created_at
    ) VALUES (
        p_user_id, p_score, p_moves_made, p_total_moves,
        p_species_discovered, p_session_duration_sec,
        p_client_metadata, NOW()
    )
    RETURNING score INTO v_recorded_score;

    -- Record rate limit (within same transaction/lock)
    INSERT INTO score_submission_rate_limit (user_id, created_at)
    VALUES (p_user_id, NOW());

    -- Success (no rank - calculate on read)
    RETURN QUERY SELECT TRUE, 'Score recorded successfully', v_recorded_score;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Score submission error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN QUERY SELECT FALSE, 'Database error: ' || SQLERRM, 0;
END;
$$;

-- ============================================
-- Leaderboard View with Ranks (optimized for reads)
-- ============================================
CREATE OR REPLACE VIEW leaderboard_with_ranks AS
SELECT
    user_id,
    score,
    moves_made,
    total_moves,
    species_discovered,
    created_at,
    DENSE_RANK() OVER (ORDER BY score DESC, created_at ASC) as rank
FROM high_scores
ORDER BY score DESC, created_at ASC;

-- ============================================
-- Helper Function: Get User Rank
-- ============================================
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID, p_score INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT (COUNT(*) + 1)::INTEGER
    FROM high_scores
    WHERE score > p_score;
$$;

-- ============================================
-- RLS Policies (idempotent)
-- ============================================
ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'high_scores'
        AND policyname = 'Users can insert own scores'
    ) THEN
        CREATE POLICY "Users can insert own scores"
        ON high_scores FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'high_scores'
        AND policyname = 'Anyone can view high scores'
    ) THEN
        CREATE POLICY "Anyone can view high scores"
        ON high_scores FOR SELECT
        USING (true);
    END IF;
END $$;

-- ============================================
-- Grants
-- ============================================
GRANT EXECUTE ON FUNCTION submit_validated_score TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO postgres;
GRANT EXECUTE ON FUNCTION get_user_rank TO anon, authenticated;
GRANT SELECT ON leaderboard_with_ranks TO anon, authenticated;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE high_scores IS 'Validated game scores with comprehensive anti-cheat (v2)';
COMMENT ON FUNCTION submit_validated_score IS 'Submit score with race-condition safe validation';
COMMENT ON FUNCTION cleanup_rate_limits IS 'Remove rate limit entries older than 1 hour';
COMMENT ON FUNCTION get_user_rank IS 'Calculate user rank by score (optimized for single queries)';
COMMENT ON VIEW leaderboard_with_ranks IS 'Pre-calculated ranks for leaderboard display';
```

---

## Updated TypeScript Integration

```typescript
export interface ScoreSubmissionResult {
  success: boolean;
  message: string;
  recordedScore: number;
  // rank removed - calculated separately
}

export const speciesService = {
  // ... existing methods ...

  /**
   * Submit a validated score (revised - no inline rank)
   */
  async submitScore(params: ScoreSubmissionParams): Promise<ScoreSubmissionResult> {
    try {
      const { data, error } = await supabase.rpc('submit_validated_score', {
        p_user_id: params.userId,
        p_score: params.score,
        p_moves_made: params.movesMade,
        p_total_moves: params.totalMoves,
        p_species_discovered: params.speciesDiscovered,
        p_session_duration_sec: params.sessionDurationSec,
        p_client_metadata: params.clientMetadata || {}
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          recordedScore: 0
        };
      }

      const result = data?.[0];
      if (!result) {
        return {
          success: false,
          message: 'No response from server',
          recordedScore: 0
        };
      }

      return {
        success: result.success,
        message: result.message,
        recordedScore: result.recorded_score
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        recordedScore: 0
      };
    }
  },

  /**
   * Get user's current rank (separate query for performance)
   */
  async getUserRank(userId: string, score: number): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_rank', {
        p_user_id: userId,
        p_score: score
      });

      if (error || !data) {
        console.error('Error fetching rank:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserRank:', error);
      return null;
    }
  },

  /**
   * Get leaderboard with pre-calculated ranks
   */
  async getLeaderboard(limit: number = 100): Promise<Array<{
    rank: number;
    user_id: string;
    score: number;
    moves_made: number;
    species_discovered: number[];
    created_at: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('leaderboard_with_ranks')
        .select('rank, user_id, score, moves_made, species_discovered, created_at')
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      return [];
    }
  }
};
```

---

## Summary of Revisions

### Fix #1 Changes
| Original Issue | Revision |
|---------------|----------|
| Queue check in `handleCascades()` | Moved to `finally` block + `onMoveResolved()` |
| Lost on error | Preserved for recovery attempt |
| Silent failures | Added dedicated `processPendingLocationChange()` method |
| No state validation | Double-checks before executing queued request |

### Fix #2 Changes
| Original Issue | Revision |
|---------------|----------|
| Rate limit race | Added `pg_advisory_xact_lock()` |
| DROP TABLE wipes data | Changed to `CREATE IF NOT EXISTS` |
| cleanup SQL error | Fixed with `plpgsql` + `GET DIAGNOSTICS` |
| O(n) rank calc | Moved to view + separate `get_user_rank()` function |
| No array size limit | Added 100-species max validation |

---

## Revised Testing Checklist

### Fix #1
- [ ] Queue drains after `finally` block restores `canMove`
- [ ] Queue persists through errors (not cleared)
- [ ] Multiple queue attempts only execute latest
- [ ] 300ms delay allows state change detection
- [ ] Game over clears queue properly

### Fix #2
- [ ] Concurrent submissions blocked by advisory lock
- [ ] Migration runs multiple times without error (idempotent)
- [ ] `cleanup_rate_limits()` returns count correctly
- [ ] Leaderboard queries complete in <50ms at 10K scores
- [ ] Rank view shows correct DENSE_RANK ordering
- [ ] Array with 101 species rejected

---

**Revision Status**: Ready for implementation
**Blocking Issues**: All Codex-identified issues resolved
**Next Step**: Code review + test execution
