# MISSING PROFILES - Root Cause Found & Fixed

## Problem Identified ✅

The error logs reveal the **actual root cause**:

```
Error tracking clue unlock: {
  code: '23503',
  details: 'Key is not present in table "profiles".',
  message: 'insert or update on table "player_clue_unlocks" violates
           foreign key constraint "player_clue_unlocks_player_id_fkey"'
}
```

**Translation:** You're trying to insert player data with `player_id = '1cb0565c-9e08-4db2-b16d-ba5aca23d9d2'`, but there's **no matching row in the `profiles` table**.

## Why This Happens

When a user signs in with Google OAuth:
1. Supabase creates a row in `auth.users` with their user ID
2. **BUT** it does NOT automatically create a row in `public.profiles`
3. All player tracking tables have foreign keys pointing to `profiles.user_id`
4. When you try to insert clue/discovery/session data, the database rejects it because the profile doesn't exist

## The Fix: Auto-Create Profiles on Signup

I've created a SQL migration that:
1. **Creates a trigger function** to auto-create profiles when users sign up
2. **Backfills missing profiles** for existing users
3. **Pulls user metadata** from Google OAuth (name, email, picture)

### Step 1: Run the Migration

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase_auto_create_profiles.sql`
5. Click **Run**

The migration will:
- Create the `handle_new_user()` trigger function
- Set up the trigger on `auth.users`
- **Immediately create a profile for your existing user** (`1cb0565c-9e08-4db2-b16d-ba5aca23d9d2`)
- Return `users_without_profiles = 0` to confirm success

### Step 2: Test Again

After running the migration:

1. **Refresh your browser** (to get a new session)
2. **Sign in again** with Google
3. **Play the game**
4. **Make matches** to reveal clues
5. **Check console logs** - should now see:
   ```
   ✅ New clue tracked! Total for species: 1
   ✅ New clue tracked! Total for species: 2
   ```

6. **Check Supabase tables**:
   - `profiles` → should have your row
   - `player_clue_unlocks` → should populate with clues
   - `player_species_discoveries` → should get row on correct guess

### Step 3: Verify Profile Was Created

Run this in Supabase SQL Editor:

```sql
SELECT
  p.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.created_at,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id;
```

Should see your profile with data from Google!

## What the Trigger Does

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name, avatar_url)
  VALUES (
    NEW.id,                                                       -- user ID from auth
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),   -- username or email
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name'),                    -- Google name
    COALESCE(NEW.raw_user_meta_data->>'avatar_url',
             NEW.raw_user_meta_data->>'picture')                 -- Google picture
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Skip if already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

When a user signs in via Google:
- `raw_user_meta_data->>'name'` → Full name from Google
- `raw_user_meta_data->>'picture'` → Profile picture URL
- `raw_user_meta_data->>'email'` → Email (fallback for username)

## Expected Behavior After Fix

### Console Logs (Success)
```
🔐 Auth check complete: {authenticated: true, userId: "1cb0565c-9e08-4db2-b16d-ba5aca23d9d2", email: "user@gmail.com"}
📊 Player tracking initialized: {userId: "1cb0565c-9e08-4db2-b16d-ba5aca23d9d2", sessionId: "abc-123", mode: "Supabase"}
🎧 Registering EventBus listeners for authenticated tracking

[Make first match...]

🔔 handleClueRevealed called: {hasCurrentUserId: true, currentUserId: "1cb0565c-9e08-4db2-b16d-ba5aca23d9d2", ...}
📝 Calling trackClueUnlock with: {userId: "1cb0565c-9e08-4db2-b16d-ba5aca23d9d2", ...}
✅ New clue tracked! Total for species: 1
✅ New clue tracked! Total for species: 2
✅ New clue tracked! Total for species: 3
```

### Database Tables (Success)

**profiles:**
| user_id | username | full_name | avatar_url |
|---------|----------|-----------|------------|
| 1cb0565c-9e08-4db2-b16d-ba5aca23d9d2 | user@gmail.com | John Doe | https://lh3.googleusercontent.com/... |

**player_clue_unlocks:**
| id | player_id | species_id | clue_category | clue_field | clue_value |
|----|-----------|------------|---------------|------------|------------|
| ... | 1cb0565c-... | 13 | classification | phylum | Chordata |
| ... | 1cb0565c-... | 13 | habitat | realm | Afrotropics |

**player_species_discoveries:**
| id | player_id | species_id | clues_unlocked_before_guess | score_earned |
|----|-----------|------------|----------------------------|--------------|
| ... | 1cb0565c-... | 13 | 5 | 1250 |

## Why the Previous Code Looked Correct

The auth flow WAS working correctly:
- ✅ User was authenticated
- ✅ `currentUserId` was set properly
- ✅ EventBus listeners were registered
- ✅ `handleClueRevealed` was being called
- ✅ Database inserts were attempted

The ONLY issue was the missing profile row causing foreign key constraint violations!

## Prevention for Future Users

With this trigger in place:
- ✅ New users automatically get profiles
- ✅ Google OAuth metadata is captured
- ✅ No manual profile creation needed
- ✅ Player tracking "just works" for all new signups

## Rollback (If Needed)

If something goes wrong, you can remove the trigger:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

But this will mean **new users won't get profiles automatically** and you'll need to create them manually.

---

## Summary

✅ **Root Cause**: Missing `profiles` row for authenticated user
✅ **Solution**: Auto-create profiles via database trigger
✅ **File**: `supabase_auto_create_profiles.sql`
✅ **Action**: Run migration in Supabase SQL Editor
✅ **Expected Result**: Player stats save correctly for all users

**Once you run the migration, everything should work!** 🎉
