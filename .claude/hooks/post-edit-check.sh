#!/usr/bin/env bash
# PostToolUse for Edit|Write: typecheck on src/ .ts(x) edits, run matching test file on tests/ edits.
input=$(cat)
read -r file < <(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s).tool_input||{};console.log(i.file_path||"")})')
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
rel=${file#"$root"/}
case "$rel" in
  src/*.ts|src/*.tsx)
    out=$(npm run -s typecheck 2>&1) || { echo "typecheck failed after editing $rel:"; echo "$out" | tail -25; }
    ;;
  tests/*.test.ts)
    name=$(basename "$rel" .test.ts)
    out=$(npm test -s -- --test-name-pattern="$name" 2>&1) || { echo "tests failed for $rel:"; echo "$out" | tail -40; }
    ;;
esac
exit 0
