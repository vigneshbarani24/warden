"use client";

import { useCallback, useEffect, useState } from "react";
import type { GrantView, PolicyRuleView } from "@/lib/pdp";
import type { CreateGrantInput } from "@/lib/types";
import { api } from "@/lib/api-client";
import styles from "./console.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const SNIPPET = `import { Warden } from "@warden/sdk";
const warden = new Warden({ endpoint: process.env.WARDEN_URL });

// Before the agent executes ANY business action:
const v = await warden.decide({
  actor:      "settlement-agent",
  actionType: "approve_settlement",
  resource:   "DEAL-CR-8801",
  amount:     2_000_000,
  orgPath:    "/global/trading/crude/",
});

if (v.verdict !== "allow") halt(v.reason);  // deny | escalate -> human`;

// The seeded action vocabulary the engine recognises — offered as a quick picklist
// so an operator authoring a grant or a rule speaks the same language as decide().
const ACTION_TYPES = [
  "capture_trade",
  "approve_settlement",
  "approve_confirmation",
  "approve_counterparty",
  "override_credit_limit",
  "approve_payment",
  "approve_invoice",
] as const;

const errText = (e: unknown): string => (e instanceof Error ? e.message : "unknown error");

const fieldCls =
  "w-full rounded-md border border-foreground/12 bg-background px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-[var(--color-seal)]/60";
const labelCls = "mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
const sealBtn =
  "rounded-md bg-[var(--color-seal)] px-4 py-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.07em] text-background transition-colors hover:bg-[var(--color-sealbright)] disabled:opacity-40";
const quietBtn =
  "rounded-md border border-foreground/12 bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.07em] text-foreground transition-colors hover:border-foreground/25 disabled:opacity-40";

export function ControlsView({ grants: initialGrants }: { grants: GrantView[] }) {
  const [grants, setGrants] = useState<GrantView[]>(initialGrants);
  const [rules, setRules] = useState<PolicyRuleView[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // Per-row busy flags so a single Revoke / toggle disables only its own button.
  const [busyGrant, setBusyGrant] = useState<string | null>(null);
  const [busyRule, setBusyRule] = useState<string | null>(null);

  // Add-grant form
  const [gPrincipal, setGPrincipal] = useState("");
  const [gOrgPath, setGOrgPath] = useState("/global/trading/crude/");
  const [gAction, setGAction] = useState<string>(ACTION_TYPES[0]);
  const [gLimit, setGLimit] = useState("");
  const [gBusy, setGBusy] = useState(false);
  const [gError, setGError] = useState<string | null>(null);

  // NL → policy author
  const [nlText, setNlText] = useState("");
  const [nlBusy, setNlBusy] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlCompiled, setNlCompiled] = useState<PolicyRuleView | null>(null);

  const refetchGrants = useCallback(async () => {
    // The prop is a server-render snapshot; after any mutation read the live table
    // straight from DSQL so a revoke / new grant shows immediately and consistently.
    try {
      setGrants(await api.allGrants());
    } catch {
      /* keep the last good grants on a transient read failure */
    }
  }, []);

  const refetchPolicies = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      setRules(await api.policies());
    } catch (e) {
      setRulesError(errText(e));
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetchPolicies();
  }, [refetchPolicies]);

  const addGrant = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const limit = Number(gLimit);
      if (!gPrincipal.trim() || !gOrgPath.trim() || !Number.isFinite(limit) || limit <= 0) {
        setGError("Principal, scope and a positive limit are all required.");
        return;
      }
      // The engine resolves authority by org path; a trailing slash is the contract
      // (e.g. /global/trading/crude/). Normalise so an operator can't silently miss it.
      const orgPath = gOrgPath.trim().endsWith("/") ? gOrgPath.trim() : `${gOrgPath.trim()}/`;
      const input: CreateGrantInput = {
        principalId: gPrincipal.trim(),
        orgPath,
        actionType: gAction,
        approvalLimit: limit,
      };
      setGBusy(true);
      setGError(null);
      try {
        await api.createGrant(input);
        setGPrincipal("");
        setGLimit("");
        await refetchGrants();
      } catch (err) {
        setGError(errText(err));
      } finally {
        setGBusy(false);
      }
    },
    [gPrincipal, gOrgPath, gAction, gLimit, refetchGrants],
  );

  const revokeGrant = useCallback(
    async (id: string) => {
      setBusyGrant(id);
      try {
        await api.revoke(id);
        await refetchGrants();
      } catch {
        /* leave the row as-is; status reflects the last good read */
      } finally {
        setBusyGrant(null);
      }
    },
    [refetchGrants],
  );

  const togglePolicy = useCallback(
    async (rule: PolicyRuleView) => {
      setBusyRule(rule.id);
      try {
        await api.togglePolicy(rule.id, !rule.active);
        await refetchPolicies();
      } catch (e) {
        setRulesError(errText(e));
      } finally {
        setBusyRule(null);
      }
    },
    [refetchPolicies],
  );

  const authorPolicy = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nlText.trim()) {
        setNlError("Describe the control in plain English first.");
        return;
      }
      setNlBusy(true);
      setNlError(null);
      setNlCompiled(null);
      try {
        const compiled = await api.authorPolicy(nlText.trim());
        setNlCompiled(compiled);
        setNlText("");
        await refetchPolicies();
      } catch (err) {
        setNlError(errText(err));
      } finally {
        setNlBusy(false);
      }
    },
    [nlText, refetchPolicies],
  );

  return (
    <div className={styles.controlsView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Controls</h2>
        <p className={styles.viewSub}>
          Warden&apos;s rules are data, not code — the live authority grants and segregation-of-duties rules the
          engine evaluates. Author your own below; the deterministic engine never changes, it just reads what you
          declare here.
        </p>
      </div>

      <div className={styles.flowTower}>Authority grants · the mandate matrix</div>
      <div className={styles.ctrlTable}>
        <div className={`${styles.ctrlRow} ${styles.ctrlHead}`}>
          <span>principal</span>
          <span>scope</span>
          <span>action</span>
          <span>limit</span>
          <span>window</span>
          <span>status</span>
        </div>
        {grants.length === 0 && <div className={styles.tlEmpty}>No authority grants yet — add one below.</div>}
        {grants.map((g) => (
          <div key={g.id} className={styles.ctrlRow}>
            <span className={styles.ctrlPrincipal}>{g.principalId}</span>
            <span className={styles.ctrlDim}>{g.orgPath}</span>
            <span>{g.actionType}</span>
            <span className={styles.ctrlDim}>{money.format(g.approvalLimit)}</span>
            <span className={styles.ctrlDim}>
              {day(g.validFrom)} → {day(g.validTo)}
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className={`${styles.tlBadge} ${g.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}>
                {g.active ? "ACTIVE" : g.revokedAt ? "REVOKED" : "INACTIVE"}
              </span>
              {g.active && (
                <button
                  type="button"
                  onClick={() => void revokeGrant(g.id)}
                  disabled={busyGrant === g.id}
                  className="rounded-md border border-deny/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.07em] text-deny transition-colors hover:bg-deny/10 disabled:opacity-40"
                  aria-label={`Revoke ${g.actionType} grant for ${g.principalId}`}
                >
                  {busyGrant === g.id ? "…" : "Revoke"}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Add a grant — the operator declares a new mandate the engine will honour on the next decide(). */}
      <form
        onSubmit={addGrant}
        className="mt-4 rounded-lg border border-foreground/12 bg-card p-4"
        aria-label="Add authority grant"
      >
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Add grant</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="g-principal" className={labelCls}>
              principal
            </label>
            <input
              id="g-principal"
              value={gPrincipal}
              onChange={(e) => setGPrincipal(e.target.value)}
              placeholder="maya.chen"
              className={fieldCls}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="g-orgpath" className={labelCls}>
              scope · org path
            </label>
            <input
              id="g-orgpath"
              value={gOrgPath}
              onChange={(e) => setGOrgPath(e.target.value)}
              placeholder="/global/trading/crude/"
              className={fieldCls}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="g-action" className={labelCls}>
              action
            </label>
            <select id="g-action" value={gAction} onChange={(e) => setGAction(e.target.value)} className={fieldCls}>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="g-limit" className={labelCls}>
              approval limit (USD)
            </label>
            <input
              id="g-limit"
              type="number"
              min={1}
              step={1}
              value={gLimit}
              onChange={(e) => setGLimit(e.target.value)}
              placeholder="5000000"
              className={fieldCls}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" disabled={gBusy} className={sealBtn}>
            {gBusy ? "Adding…" : "Add grant"}
          </button>
          {gError && <span className="font-mono text-[12px] text-deny">{gError}</span>}
        </div>
      </form>

      <div className={styles.flowTower} style={{ marginTop: "32px" }}>
        Segregation-of-duties rules
      </div>
      <div className={styles.ctrlRules}>
        {rulesLoading && <div className={styles.tlEmpty}>Loading policy rules…</div>}
        {!rulesLoading && rulesError && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-deny/30 bg-deny/5 px-3 py-2 font-mono text-[12px] text-deny">
            <span>Couldn&apos;t load rules — {rulesError}</span>
            <button type="button" onClick={() => void refetchPolicies()} className={quietBtn}>
              Retry
            </button>
          </div>
        )}
        {!rulesLoading && !rulesError && rules.length === 0 && (
          <div className={styles.tlEmpty}>No policy rules yet — describe one in plain English below.</div>
        )}
        {!rulesLoading &&
          !rulesError &&
          rules.map((r) => {
            const pairLeft = r.conflicting[0];
            const pairRight = r.conflicting[1];
            return (
              <div key={r.id} className={styles.ctrlRule}>
                <span className={styles.ctrlCode}>{r.code}</span>
                <span className={styles.ctrlPair}>
                  {r.conflicting.length === 2 && pairLeft && pairRight ? (
                    <>
                      <span className={styles.ctrlAction}>{pairLeft}</span>
                      <span className={styles.ctrlConflict}> ⊗ </span>
                      <span className={styles.ctrlAction}>{pairRight}</span>
                      <span className={styles.ctrlDim}> — same actor, same resource, denied</span>
                    </>
                  ) : (
                    <span className={styles.ctrlDim}>{r.conflicting.join(", ")}</span>
                  )}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <span className={`${styles.tlBadge} ${r.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}>
                    {r.active ? "ACTIVE" : "OFF"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void togglePolicy(r)}
                    disabled={busyRule === r.id}
                    className={quietBtn}
                    aria-label={`${r.active ? "Disable" : "Enable"} rule ${r.code}`}
                  >
                    {busyRule === r.id ? "…" : r.active ? "Disable" : "Enable"}
                  </button>
                </span>
              </div>
            );
          })}
      </div>

      {/* NL → policy: the operator describes a control in English; the FAST model COMPILES it
          to a deterministic rule. The LLM never decides a verdict — decide() reads this rule. */}
      <form
        onSubmit={authorPolicy}
        className="mt-4 rounded-lg border border-foreground/12 bg-card p-4"
        aria-label="Author a control in plain English"
      >
        <label htmlFor="nl-policy" className={labelCls}>
          describe a control in plain English
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="nl-policy"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder="Whoever captures a trade can't approve its settlement."
            className={fieldCls}
            autoComplete="off"
          />
          <button type="submit" disabled={nlBusy} className={`${sealBtn} shrink-0`}>
            {nlBusy ? "Compiling…" : "Compile rule"}
          </button>
        </div>
        {nlError && <div className="mt-2 font-mono text-[12px] text-deny">{nlError}</div>}
        {nlCompiled && (
          <div className="mt-3 rounded-md border border-allow/30 bg-allow/5 p-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-allow">Compiled rule</div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-foreground">
              <span className="font-semibold">{nlCompiled.code}</span>
              {nlCompiled.conflicting.length === 2 && nlCompiled.conflicting[0] && nlCompiled.conflicting[1] ? (
                <span className="text-muted-foreground">
                  {nlCompiled.conflicting[0]} ⊗ {nlCompiled.conflicting[1]}
                </span>
              ) : (
                <span className="text-muted-foreground">{nlCompiled.conflicting.join(", ")}</span>
              )}
              <span className={`${styles.tlBadge} ${nlCompiled.active ? styles.tlBadgeActive : styles.tlBadgeRevoked}`}>
                {nlCompiled.active ? "ACTIVE" : "OFF"}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              The English was compiled to data — decide() now reads it. The model never rules on a verdict.
            </div>
          </div>
        )}
      </form>

      <div className={styles.flowTower} style={{ marginTop: "32px" }}>
        Integrate · one call before every agent action
      </div>
      <p className={styles.ctrlIntegrateSub}>
        Warden is authorization middleware for agent actions — framework-agnostic. LangGraph, CrewAI, AWS
        AgentCore, or SAP Joule all POST the same contract.
      </p>
      <pre className={styles.codeBlock}>{SNIPPET}</pre>
    </div>
  );
}
