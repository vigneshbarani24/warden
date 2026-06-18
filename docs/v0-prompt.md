# v0 prompt — Warden Decision Inspector

Paste the block below into **v0.app** to generate the console UI. It encodes the
exact tokens, layout, data shapes (matching our live API), motion, and copy so v0
produces the bespoke forensic console — not its generic default. After v0
generates it, the panes bind to these endpoints:

- `GET /api/decisions?limit=50` → `DecisionRow[]` (request feed)
- `GET /api/ledger?limit=200` → `LedgerView[]` (chain spine)
- `GET /api/ledger/verify` → `{ ok: true } | { ok: false, breakAtSeq: number }`
- `GET /api/grants?principal=<id>` → `GrantView[]` (authority/revoke control)
- `POST /api/grants/<id>/revoke` → `{ id, revokedAt }`
- `POST /api/pdp/decide` (body = `DecideInput`) → re-run a decision

---

## PROMPT (copy from here)

Build a **forensic governance console** called the **Decision Inspector** for "Warden," a policy decision point for enterprise AI agents. The user is a finance/risk operator. The vernacular is authority, revocation, seals, chain of custody, defensible record. This is NOT a SaaS dashboard and NOT an admin CRUD panel — design from that forensic world. Next.js App Router + React + TypeScript. Generate mock data (shapes below) so it renders standalone; the panes will be wired to real API routes afterward.

**Aesthetic — "vellum, ink, and wax seal," cooled and modern.** Deliberately AVOID the three AI-default looks: NO warm-cream serif, NO near-black-with-acid-green, NO broadsheet hairlines. Use these exact CSS tokens:
- `--paper #EEF1F0` cool bone base · `--ink #14171A` near-black cool · `--seal #6E1D24` oxblood (primary actions + chain seals; the authority accent) · `--panel #E3E7E6` surface behind mono data · `--line #C9CFCD` hairline rules
- Semantic, load-bearing (never decorative): `--allow #1F7A4D` · `--deny #B0271F` · `--escalate #B5790A`
- Fonts: **Geist Sans** for UI, **Geist Mono** for every hash, id, org path, and amount. The monospace data IS the aesthetic — make it prominent, don't hide it in tooltips.

**Layout — three full-height panes. The ledger chain on the right is the signature element:**
```
┌ REQUEST FEED ──┬ DECISION INSPECTOR ────────────┬ LEDGER CHAIN ┐
│ ▢ approve inv  │  DENY                           │  ◉ 0041 9f3a │
│ ▢ create vend  │  Priya Nair · approve_payment   │  │           │
│ ▢ approve pmt ◀│  vendor INV-88421               │  ◉ 0040 3a17 │
│ ▢ ...          │  $2,000,000                     │  │           │
│                │  Reason: authority revoked 31s  │  ◉ 0039 c0d2 │
│                │  Policies: LIMIT-02, SOD-07     │  │           │
│                │  ┌ context at decision ───────┐ │  ◉ 0038 7be5 │
│                │  │ active grants: 0           │ │              │
│                │  │ limit checked: revoked      │ │  [ Verify ]  │
│                │  └─────────────────────────────┘ │  intact ●    │
│                │  [ Revoke grant ]  [ Re-run ]   │              │
└────────────────┴─────────────────────────────────┴──────────────┘
```

**Components (bind each to the data shapes):**
1. **Request feed** (left): rows from `decisions`, each with a verdict badge in its semantic color. Selecting a row drives the inspector. Empty state copy: "No actions awaiting a decision."
2. **Decision Inspector** (center, HERO — give it the most design care): the selected decision in full — verdict large, then actor, actionType, resource, amount (mono), the reason string, the fired policy-rule ids, and the evaluated-context snapshot (active grants at decision time, limit checked, SoD result). This panel is the defensible "why" made visible.
3. **Authority / Revoke control** (in/near the inspector): the actor's authority grants with validity windows in mono. A **Revoke grant** button (flips the grant's revoked state). A **Re-run** button that re-evaluates the same proposed action. The allow→deny flip on re-run is a key beat.
4. **Ledger chain** (right, SIGNATURE): ledger rows as a vertical sealed spine, each block showing `seq` and a truncated `hash` linking to the block above. A **Verify** button runs a pass DOWN the spine; intact seals settle green. A tamper demo: editing one row turns that break and everything below it red from that seq down.

**Motion — restrained, exactly TWO moments:** (a) the verify pass traveling down the chain as seals lock; (b) the verdict flipping allow→deny on revoke. Nothing else animates. Honor `prefers-reduced-motion`.

**Copy — active voice, named by what the operator controls:** "Revoke grant" (not "Update authority_grants"). Verify states read "Chain intact through seq 0041" / "Break detected at seq 0039." The button that says "Revoke grant" produces a result that says "Grant revoked."

**Quality floor (don't announce it):** responsive to mobile, visible keyboard focus, reduced motion honored. No raw admin table is ever the hero screen — spend the boldness on the sealed chain, keep every other surface quiet.

**Data shapes (TypeScript) — generate mock arrays matching these exactly:**
```ts
type Verdict = "allow" | "deny" | "escalate";

interface DecisionRow {
  requestId: string;
  actor: string;
  actionType: string;
  resource: string;
  amount: number;
  verdict: Verdict;
  reason: string;
  evaluatedContext: {
    activeGrantCount: number;
    coveringGrantId: string | null;
    limitChecked: number | null;
    sodResult: "pass" | "conflict";
    firedRuleIds?: string[];
  };
  createdAt: string; // ISO
}

interface LedgerView {
  seq: number;
  requestId: string;
  prevHash: string;
  payload: Record<string, string>;
  hash: string;
  createdAt: string; // ISO
}

interface GrantView {
  id: string;
  principalId: string;
  orgPath: string;       // e.g. "/root/finance/ap/"
  actionType: string;
  approvalLimit: number;
  validFrom: string;     // ISO
  validTo: string;       // ISO
  revokedAt: string | null;
  active: boolean;
}
```

**Seed the mock with this scenario:** a clean `$2,000,000` `approve_payment` by `priya.nair` on resource `INV-88421` at org path `/root/finance/ap/` that was **allowed** and sealed into the chain; then the same action **denied** after her grant was revoked, with reason "authority revoked"; plus a few other decisions (a `create_vendor` allow, an over-limit `escalate`); and a ledger of ~6 sealed blocks with realistic truncated SHA-256 hashes.

## (end prompt)
