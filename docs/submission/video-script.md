# Warden — H0 demo video script

**Target: under 3:00 (aim ~2:40). Track 2 (B2B). Database: Amazon Aurora DSQL.**
Narrative spine: *valid in the ERP, illegal in the business* — a **real AI agent** gets governed live.

> Record the screen capture first, lay voice-over second (clean TTS is fine — keep it tight).
> **Upload to YouTube early** — upload + processing can take longer than you expect on deadline day.
> The hero is the **two-window split**: a real LLM agent on the left, Warden on the right, governance happening live between them.

---

## Setup — the split view (this is the whole point)

Arrange **two browser windows side by side**:
- **LEFT:** `warden-khaki.vercel.app/agent` — the dark "Crude Desk Agent" runtime terminal. A separate app, deliberately.
- **RIGHT:** `warden-khaki.vercel.app/console` — the light Warden console, on the **Operations** view (Request Feed · Decision Inspector · Ledger Chain).

The console polls every ~2.5s, so when the agent acts on the left, the verdict **seals into the ledger on the right within a couple of seconds**. That real-time link is the shot.

## Pre-flight (BEFORE you record — avoids cold-start + starts clean)
1. Open both windows, position side by side (agent left, console right on **Operations**).
2. On the console, click **Reset** — clears the ledger/decisions and re-arms grants, so the chain builds up live on camera.
3. Warm the agent: click one example button once, wait for the verdict, then **Reset** the console again. (Now the first take is warm, not the cold "asking Warden…" stall.)
4. 1920×1080, hide bookmarks bar, zoom so the mono data (verdicts, reasons, rule ids, ledger hashes) is legible.

If OpenAI stalls mid-take: it's a pre-recorded video — just retake. Hard fallback: the console's **Simulation → Play** runs the identical allow→deny→escalate→verify→tamper beats deterministically with **no** LLM call.

---

## The script (two columns)

| # | On screen (action) | Voice-over |
|---|---|---|
| **Hook — 0:00–0:15** | Both windows visible. Cursor rests on the left (agent terminal): "CRUDE DESK AGENT · acting as maya.chen · gated by Warden PDP". | "An AI agent books a trade. Then it approves the settlement on that same trade. Both actions are valid in the ERP. Together they're a segregation-of-duties breach — illegal in the business. Let's watch it try — and watch it get caught." |
| **Two apps — 0:15–0:28** | Gesture left, then right. | "Two separate apps. On the left, a real AI agent on a commodity trading desk. On the right, Warden — the authority layer it must clear before it can act. Every tool call goes through Warden first." |
| **Live ALLOW — 0:28–0:52** | LEFT: click the example **"Capture a $4.2M crude trade, deal DEAL-CR-9001."** Tool card shows `⚙ captureTrade · DEAL-CR-9001 · $4,200,000 → asking Warden…` then a green **ALLOW** badge, Warden's reason, "▸ proceeding — action executed." RIGHT: ~2s later the decision appears in the Request Feed and a new sealed block lands on the Ledger Chain. | "I tell the agent to book a four-point-two-million-dollar deal. It calls its capture tool — but first, Warden. Authority resolved up the desk, limit checked: allowed. The agent proceeds. And on the right, with no prompting, Warden has sealed that verdict into the ledger — live." |
| **The valid-but-illegal DENY — 0:52–1:25** | LEFT: click **"Now settle DEAL-CR-9001."** Tool card `⚙ approveSettlement · DEAL-CR-9001` → red **DENY** badge → `warden: Segregation of duties … cannot also approve_settlement` → `rules: SOD-FBO-01` → "✕ halted by Warden — agent did not act." RIGHT: the deny seals onto the chain; click it in the feed to show the Decision Inspector's reason + SOD-FBO-01. | "Now I tell the *same* agent to settle the deal it just booked. It holds the settlement grant — so in the ERP, this is allowed. Warden denies it: front office cannot be back office. And notice — the agent doesn't retry, doesn't route around it. It halts, and cites the rule: SOD-FBO-01. The breach never happens, and the reason why is sealed on the right." |
| **ESCALATE (optional, cut if tight) — 1:25–1:35** | LEFT: click **"Capture a $6M crude trade, deal DEAL-CR-9002."** → amber **ESCALATE** → "→ escalated — agent halted, awaiting higher authority." | "Over its limit? Not denied — escalated to the authority that covers it. Allow, deny, escalate — all from the same agent, all enforced before the action." |
| **Wow — the defensible record — 1:35–2:00** | RIGHT console: click **Verify** → seals lock green down the spine ("chain intact"). Click **Tamper** → click **Verify** again → the break tints red from that sequence down ("Break detected at seq …"). | "Every verdict is hash-chained. Verify the ledger — intact, end to end. Now tamper with one sealed row, the way a privileged actor might. Verify again — the break is caught at the exact sequence, and everything below it. A SOX-grade record of not just what was decided, but why." |
| **Under the hood — 2:00–2:30** | RIGHT: switch to the **Cross-region** view → **Run**. Watch **ALLOW on us-east-1 → ⊘ mandate revoked → DENY on us-west-2** → "✓ strongly consistent · denied N ms after the revoke, in a different region." | "And this runs on Amazon Aurora DSQL — active-active across two AWS regions, one logical cluster. Allow a trade in Virginia, revoke the authority, and the identical action in Oregon is denied — immediately, no stale read. The whole decision — resolve the authority, lock the grant FOR UPDATE, evaluate, seal — is one transaction. That strong consistency is the product." |
| **Impact — 2:30–2:45** | Closing card: "Warden — the control plane for enterprise AI agents" + `warden-khaki.vercel.app` + "Built on Amazon Aurora DSQL + Vercel". | "Those controls used to hold by accident: a human had to click, and approvals took a day. Agents erase the delay — and the control vanishes with it. Warden puts it back, at the speed the agent runs. Govern the action before it happens, or explain it at the audit." |

---

## Why these choices (so the cuts are intentional)
- **The hero is a real, live LLM agent being governed** — not a slide, not a scripted sim. The split-view shows cause (agent acts) and effect (Warden seals it) in one frame.
- The **example buttons** make it deterministic: the same three taps produce allow → deny → escalate every time, so you can nail a clean take.
- **One wow moment**: the tamper-evident ledger ("seals exactly *why*") is the payoff to the cold open. Cross-region is the DSQL *depth* beat, not a second climax.
- Aurora DSQL is **named and shown** doing something no other AWS option does — the "explain the AWS Database" requirement, satisfied by demonstration.

## Flaky-beat fallbacks
- **OpenAI stalls mid-take** → retake (pre-recorded video). Hard fallback: console **Simulation → Play** runs the same allow/deny/escalate/verify/tamper beats with no LLM.
- **Cold start** → mitigated by the pre-flight warm-up.
- **Cross-region 503** → won't happen (verified live), but if a region is mid-maintenance, the agent's in-region beats already carry the story.

## Names note
On-screen actor is the live seeded handle **maya.chen** (Crude Desk Agent). It's the real data on screen — narrate it naturally ("a crude-desk trading agent"). Don't invent new personas.
