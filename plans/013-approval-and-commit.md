# Plan 013 — Approval Record + Commit Procedure

Utility doc: how to commit the Plan 013 files, and the authorization trail that permits it. Committing PLAN FILES ONLY is approved; implementation and DB changes remain HALTED pending separate owner go.

## Approval trail

- 2026-07-10 — design contract agreed (Claude review ⇄ codex synthesis).
- 2026-07-10 — codex cold review: 9 blockers (P0-1…P0-5, P1-6…P1-9) → Revision 1.
- 2026-07-10 — live-DB verification + 2 gaps (signature issuance, 3-node sequencing) → Revision 2.
- 2026-07-10 — coverage wording + obs-3 gate + cardinality → Revision 3; 7 corrections → Revision 3.1.
- 2026-07-10 — **codex verdict on Revision 3.1**: "Revision 3.1 passes my review. No remaining design blocker found. It now correctly covers: live profile/category structure and signature membership; signature eligibility without weakening failed-node consequences; correct node index mapping and issuance branches; awaited persistence before dependent requests; server-enforced interpretation completion; pre/post-commit information boundaries. No source or database changes occurred."
- Owner relayed the approval 2026-07-10 and requested this commit doc.

## Scope of the commit

Stage EXACTLY these paths — nothing else (the working tree carries many unrelated modified files):

```
plans/013-investigation-method-tiles-and-case-compiler.md
plans/README.md
plans/013-approval-and-commit.md
```

Guard: `git status --short plans/` first; confirm no source (`src/`), schema (`src/db/`), seed (`db/`), or docs paths are staged. `git diff --cached --stat` must show only the three files above.

## Commands

```bash
git add plans/013-investigation-method-tiles-and-case-compiler.md plans/README.md plans/013-approval-and-commit.md
git diff --cached --stat   # expect exactly 3 files
git commit -m "$(cat <<'MSG'
add plan 013: method tiles + case compiler (rev 3.1, codex-approved)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
MSG
)"
git show --stat HEAD       # verify 3 files, plans/ only
```

Do NOT push unless the owner asks. Do NOT `git add -A` / `git add .` under any circumstances — the dirty tree contains in-flight unrelated work.

## Standing constraints after commit

- Implementation (source, migrations, seeds) stays halted until the OWNER (not codex) gives the go.
- First implementation steps when authorized: Plan 013 Phase 0 (baseline + drift check), then Phase 0.5 (profile selection + signature authoring, owner sign-off STOP).
- Live-DB migrations always require the explicit owner-approval STOP in Phase 1.
