## Postgres Database Access

You have access to a PostgreSQL database via the `pg-claude` command. This bridges to Claude Code's postgres-mcp
tools.

Usage: pg-claude "your request"

Available operations:
- pg-claude "list schemas"
- pg-claude "list tables in <schema>"
- pg-claude "get details for table <schema>.<table>"
- pg-claude "explain query: <SQL>"
- pg-claude "execute: <SQL>"
- pg-claude "check database health"
- pg-claude "analyze workload indexes"
- pg-claude "get top queries"

Examples:
  pg-claude "list tables in public"
  pg-claude "get details for table public.species"
  pg-claude "execute: SELECT * FROM species LIMIT 5"
  pg-claude "explain query: SELECT * FROM species WHERE id = 1"

Always use this command when you need to inspect or query the database.
