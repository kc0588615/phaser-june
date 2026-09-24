// Create the playtest Clerk user (dev instance only) via the Clerk Backend API.
// Run from the repo root: node .claude/skills/playtest/scripts/create-test-player.mjs
// Reads CLERK_SECRET_KEY from .env.local and never prints it.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(line => /^[A-Z_]+=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const key = env.CLERK_SECRET_KEY;
if (!key?.startsWith('sk_test_')) {
  console.log('refusing: CLERK_SECRET_KEY is not a dev (sk_test_) key');
  process.exit(1);
}

const email = 'playtest+clerk_test@example.com';
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
try {
  const found = await (await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, { headers })).json();
  if (Array.isArray(found) && found.length) {
    console.log('exists', found[0].id);
    process.exit(0);
  }
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST', headers,
    body: JSON.stringify({ email_address: [email], skip_password_requirement: true, first_name: 'Playtest', last_name: 'Agent' }),
  });
  const body = await res.json();
  console.log(res.status, res.ok ? `created ${body.id}` : JSON.stringify(body.errors?.map(e => e.long_message || e.message)));
} catch (error) {
  console.error('Clerk request failed:', error.message);
  process.exit(1);
}
