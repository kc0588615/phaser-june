#!/usr/bin/env bash
# SessionStart: says when this checkout is behind origin/main (the other machine merges too; AGENTS.md "Two Machines").
timeout 10 git fetch -q origin main 2>/dev/null || exit 0
behind=$(git rev-list --count HEAD..origin/main)
[ "$behind" -gt 0 ] && echo "This checkout is $behind commits behind origin/main, AGENTS.md and deploy scripts included. Cut work from fresh origin/main."
exit 0
