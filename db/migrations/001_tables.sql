-- Warden schema for Amazon Aurora DSQL.
-- DSQL notes: no foreign keys, UUID primary keys (gen_random_uuid is native),
-- jsonb is supported natively. Primary keys are defined at table creation (the
-- only time an index may be created synchronously, on an empty table); all other
-- indexes are created async in 002_indexes.sql.

CREATE TABLE IF NOT EXISTS org_units (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path       text NOT NULL,
  name       text NOT NULL,
  unit_type  text NOT NULL
);

CREATE TABLE IF NOT EXISTS authority_grants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id   text NOT NULL,
  org_path       text NOT NULL,
  action_type    text NOT NULL,
  approval_limit numeric NOT NULL,
  valid_from     timestamptz NOT NULL,
  valid_to       timestamptz NOT NULL,
  revoked_at     timestamptz
);

CREATE TABLE IF NOT EXISTS policy_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type   text NOT NULL,
  definition  jsonb NOT NULL,
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS decisions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         text NOT NULL,
  actor              text NOT NULL,
  action_type        text NOT NULL,
  resource           text NOT NULL,
  amount             numeric NOT NULL,
  verdict            text NOT NULL,
  reason             text NOT NULL,
  evaluated_context  jsonb NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq         bigint NOT NULL,
  request_id  text NOT NULL,
  prev_hash   text NOT NULL,
  payload     jsonb NOT NULL,
  hash        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
