-- Async indexes. DSQL requires CREATE INDEX ASYNC on populated tables; we use it
-- uniformly. The migrate script polls pg_index.indisvalid until these are valid.
-- The unique indexes on request_id enforce idempotent appends (ON CONFLICT) and
-- one-decision-per-request; seq is unique to keep the ledger chain ordered.

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS decisions_request_id_uniq ON decisions (request_id);
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ledger_request_id_uniq ON ledger (request_id);
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ledger_seq_uniq ON ledger (seq);

CREATE INDEX ASYNC IF NOT EXISTS grants_principal_action_idx ON authority_grants (principal_id, action_type);
CREATE INDEX ASYNC IF NOT EXISTS org_units_path_idx ON org_units (path);
CREATE INDEX ASYNC IF NOT EXISTS decisions_created_at_idx ON decisions (created_at);
