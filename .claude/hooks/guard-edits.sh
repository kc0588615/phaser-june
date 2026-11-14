#!/usr/bin/env bash
# PreToolUse guard for Edit|Write. Exit 2 blocks the tool call.
# 1. Never edit an env file: base name .env, .env.* or *.env (DATABASE_URL and keys live there, e.g. deploy/app.env).
# 2. Never add a Prisma file (*.prisma, by path) or a Supabase/Prisma reference (by content): Drizzle only (AGENTS.md).
input=$(cat)
read -r file < <(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s).tool_input||{};console.log(i.file_path||"")})')
case "$(basename "$file")" in
  .env|.env.*|*.env) echo "blocked: $file is an env file; edit it manually" >&2; exit 2 ;;
  *.prisma) echo "blocked: $file is a Prisma file; project is Drizzle-only (AGENTS.md)" >&2; exit 2 ;;
esac
content=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s).tool_input||{};process.stdout.write(i.content||i.new_string||"")})')
if printf '%s' "$content" | grep -qiE '@supabase|supabase\.co|@prisma|schema\.prisma|from ["'"'"']prisma'; then
  echo "blocked: Supabase/Prisma reference in edit to $file; project is Drizzle-only (AGENTS.md)" >&2
  exit 2
fi
exit 0
