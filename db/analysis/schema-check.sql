BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
-- Schema check: the live definitions of the database's own objects, one line each in a fixed sorted order, to
-- compare with db/schema.sql by reading both (docs/DATABASE_SCHEMA.md#schema-check). Read only: it changes nothing.
--   ./scripts/db -qAt -f db/analysis/schema-check.sql > schema-check.out
-- Run it on the live database and on the dev copy (docs/DATABASE_ACCESS.md) and diff the two outputs: owners and the
-- database's grants differ by design (docs/DATABASE_SCHEMA.md#dev-copy-phaser_june_dev); anything else is drift.
--
-- Covers the schemas public, oneearth and natural_earth. Extension members (PostGIS's spatial_ref_sys and views, any
-- schema) aren't listed: the grant section sums their privileges per extension as "<k> of <n>" members. Grants read
-- a NULL ACL as its default (PUBLIC keeps CONNECT, TEMPORARY on a database and EXECUTE on a function), mark a privilege
-- held WITH GRANT OPTION "*" (as aclitem does; one entry per privilege, whatever the grantors), and include role
-- memberships and column grants. Columns are numbered by position (not attnum, which a dump and restore renumbers).
-- Each line is "<section> <object> <detail>"; sections run database, extension, schema, relation, column, constraint,
-- index, sequence, view, function, trigger, grant, role.
WITH rel AS (
  SELECT c.oid, c.relname, c.relkind, c.relowner, c.relacl, n.nspname,
         CASE WHEN n.nspname = 'public' THEN '' ELSE n.nspname || '.' END || c.relname AS name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
), kind AS (
  SELECT oid, CASE relkind WHEN 'r' THEN 'table' WHEN 'p' THEN 'partitioned table' WHEN 'v' THEN 'view'
                           WHEN 'm' THEN 'materialized view' WHEN 'f' THEN 'foreign table' ELSE 'sequence' END AS label
  FROM rel
), fn AS (
  SELECT p.oid, n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name,
         p.proacl, p.proowner, p.prokind
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
), acl AS (
  -- Every ACL in scope, one row per object: the direct ones (ext NULL; a NULL relation, schema or column ACL means no
  -- grants) and extension members (ext names the sum they count in).
  SELECT r.name AS object, r.relacl AS acl, r.relowner AS owner, NULL::text AS ext
  FROM rel r
  UNION ALL
  SELECT 'schema ' || n.nspname, n.nspacl, n.nspowner, NULL
  FROM pg_namespace n WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
  UNION ALL
  SELECT 'database', coalesce(d.datacl, acldefault('d', d.datdba)), d.datdba, NULL
  FROM pg_database d WHERE d.datname = current_database()
  UNION ALL
  SELECT 'function ' || f.name, coalesce(f.proacl, acldefault('f', f.proowner)), f.proowner, NULL
  FROM fn f
  UNION ALL
  SELECT r.name || '.' || a.attname, a.attacl, r.relowner, NULL
  FROM rel r JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT k.kind || ' ' || k.objid, k.acl, k.owner, 'extension ' || e.extname || ' ' || k.kind
  FROM pg_extension e
  JOIN pg_depend d ON d.refclassid = 'pg_extension'::regclass AND d.refobjid = e.oid AND d.deptype = 'e'
  CROSS JOIN LATERAL (
    SELECT 'functions' AS kind, coalesce(p.proacl, acldefault('f', p.proowner)) AS acl, p.proowner AS owner, p.oid AS objid
    FROM pg_proc p WHERE d.classid = 'pg_proc'::regclass AND p.oid = d.objid
    UNION ALL
    SELECT 'relations', c.relacl, c.relowner, c.oid
    FROM pg_class c WHERE d.classid = 'pg_class'::regclass AND c.oid = d.objid AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  ) k
), held AS (
  -- One line per object and grantee. aclexplode gives a row per grantor, so each privilege is folded to one first,
  -- marked '*' if any grantor gave it with grant option.
  SELECT p.object, p.ext, p.grantee,
         string_agg(p.privilege_type || CASE WHEN p.grantable THEN '*' ELSE '' END, ',' ORDER BY p.privilege_type) AS privileges
  FROM (
    SELECT c.object, c.ext, CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
           a.privilege_type, bool_or(a.is_grantable) AS grantable
    FROM acl c CROSS JOIN LATERAL aclexplode(c.acl) a
    WHERE a.grantee <> c.owner
    GROUP BY c.object, c.ext, a.grantee, a.privilege_type
  ) p
  GROUP BY p.object, p.ext, p.grantee
), grants AS (
  SELECT object, grantee, privileges FROM held WHERE ext IS NULL
  UNION ALL
  -- Role memberships, without built-in pg_* members (a pg_* role granted to one of ours still prints).
  SELECT DISTINCT 'role ' || pg_get_userbyid(m.roleid), pg_get_userbyid(m.member),
         coalesce(nullif(concat_ws(',', CASE WHEN m.admin_option THEN 'ADMIN' END, CASE WHEN m.inherit_option THEN 'INHERIT' END,
                                   CASE WHEN m.set_option THEN 'SET' END), ''), 'MEMBER')
  FROM pg_auth_members m
  WHERE pg_get_userbyid(m.member) NOT LIKE 'pg\_%'
  UNION ALL
  -- Extension members, summed: k members of that kind give the grantee these privileges, of n in all.
  SELECT h.ext, h.grantee, h.privileges || ' ' || count(*) || ' of ' || max(x.n)
  FROM held h
  JOIN (SELECT ext, count(*) AS n FROM acl WHERE ext IS NOT NULL GROUP BY ext) x USING (ext)
  GROUP BY h.ext, h.grantee, h.privileges
), lines AS (
  SELECT 1 AS section, '' AS object, 0 AS pos,
         'database ' || current_database() || ' server ' || current_setting('server_version_num') AS line
  UNION ALL
  SELECT 2, e.extname, 0, 'extension ' || e.extname || ' ' || e.extversion || ' schema ' || e.extnamespace::regnamespace::text
  FROM pg_extension e
  UNION ALL
  SELECT 3, n.nspname, 0, 'schema ' || n.nspname || ' owner ' || pg_get_userbyid(n.nspowner)
  FROM pg_namespace n WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
  UNION ALL
  SELECT 4, r.name, 0, 'relation ' || r.name || ' ' || k.label || ' owner ' || pg_get_userbyid(r.relowner)
  FROM rel r JOIN kind k USING (oid)
  UNION ALL
  SELECT 5, r.name, row_number() OVER (PARTITION BY r.oid ORDER BY a.attnum)::int,
         'column ' || r.name || ' ' || lpad((row_number() OVER (PARTITION BY r.oid ORDER BY a.attnum))::text, 2, '0') || ' '
         || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
         || coalesce(' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid), '')
         || CASE a.attidentity WHEN 'a' THEN ' GENERATED ALWAYS AS IDENTITY' WHEN 'd' THEN ' GENERATED BY DEFAULT AS IDENTITY' ELSE '' END
         || CASE WHEN a.attgenerated = 's' THEN ' GENERATED' ELSE '' END
  FROM rel r
  JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE r.relkind <> 'S'
  UNION ALL
  SELECT 6, r.name, 0, 'constraint ' || r.name || ' ' || con.conname || ' ' || pg_get_constraintdef(con.oid)
  FROM rel r JOIN pg_constraint con ON con.conrelid = r.oid
  UNION ALL
  SELECT 7, r.name, 0, 'index ' || r.name || ' ' || pg_get_indexdef(ix.indexrelid)
  FROM rel r JOIN pg_index ix ON ix.indrelid = r.oid
  UNION ALL
  SELECT 8, r.name, 0, 'sequence ' || r.name || ' ' || format_type(s.seqtypid, NULL)
         || coalesce(' owned by ' || (SELECT o.relname || '.' || a.attname
                                        FROM pg_depend d
                                        JOIN pg_class o ON o.oid = d.refobjid
                                        JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
                                       WHERE d.classid = 'pg_class'::regclass AND d.objid = r.oid AND d.deptype IN ('a', 'i')), '')
  FROM rel r JOIN pg_sequence s ON s.seqrelid = r.oid
  UNION ALL
  SELECT 9, r.name, 0, 'view ' || r.name || ' md5 ' || md5(pg_get_viewdef(r.oid)) || E'\n' || pg_get_viewdef(r.oid, true)
  FROM rel r WHERE r.relkind IN ('v', 'm')
  UNION ALL
  SELECT 10, f.name, 0, 'function ' || f.name || ' owner ' || pg_get_userbyid(f.proowner)
         || CASE WHEN f.prokind IN ('f', 'p') THEN E'\n' || pg_get_functiondef(f.oid) ELSE ' kind ' || f.prokind::text END
  FROM fn f
  UNION ALL
  SELECT 11, r.name, 0, 'trigger ' || r.name || ' ' || pg_get_triggerdef(t.oid)
  FROM rel r JOIN pg_trigger t ON t.tgrelid = r.oid AND NOT t.tgisinternal
  UNION ALL
  SELECT 12, g.object, 0, 'grant ' || g.object || ' to ' || g.grantee || ' ' || g.privileges
  FROM grants g
  UNION ALL
  SELECT 13, ro.rolname, 0, 'role ' || ro.rolname || CASE WHEN ro.rolsuper THEN ' superuser' ELSE '' END
         || CASE WHEN ro.rolcanlogin THEN ' login' ELSE ' nologin' END || coalesce(' settings ' || ro.rolconfig::text, '')
  FROM pg_roles ro WHERE ro.rolname IN (SELECT grantee FROM grants)
  UNION ALL
  SELECT 12, 'default acl', 0, 'grant default for ' || pg_get_userbyid(da.defaclrole)
         || coalesce(' in schema ' || nullif(da.defaclnamespace, 0::oid)::regnamespace::text, '') || ' on ' || da.defaclobjtype::text || ' ' || da.defaclacl::text
  FROM pg_default_acl da
)
SELECT line FROM lines ORDER BY section, object, pos, line;
ROLLBACK;
