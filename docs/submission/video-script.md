# Warden — H0 demo video script

**Target: under 3:00 (aim ~2:30). Track 2 (B2B). Database: Amazon Aurora DSQL.**
Narrative spine: *valid in the ERP, illegal in the business* — segregation of duties, caught at the moment of action and sealed.

> Record the screen capture first, lay voice-over second (a clean TTS take is fine — keep it tight).
> **Upload to YouTube early** — upload + processing can take longer than you expect on deadline day.
> Every on-screen action below maps to a real button on the live app; nothing is faked.

---

## Pre-flight (do this BEFORE you hit record — avoids the cold-start stall)

1. Open `https://warden-khaki.vercel.app/console` and let it fully load (warms the Vercel function + DSQL pool).
2. **Simulation** view → press **Play** once end-to-end, then **Reset**. (The take then starts warm, not on the "Resolving authority from Aurora DSQL…" cold state.)
3. **Cross-region** view → press **Run** once to warm it, then leave it idle/ready.
4. Optional B-roll: a second tab on `/agent`, pre-asked once so the model is warm.
5. 1920×1080, hide the bookmarks bar, zoom so the **mono** data (hashes, org paths, amounts) is legible — that monospace data *is* the aesthetic.
6. Have the live link ready to show on the closing card.

If any live call hiccups mid-take: the Simulation **scrubber replays captured snapshots without re-hitting the network** — drag back instead of re-running.

---

## The script (two columns)

| # | On screen (action) | Voice-over |
|---|---|---|
| **Hook — 0:00–0:15** | Cold: the Simulation Decision Inspector, then cut to a single row flipping **ALLOW → DENY** (scrub steps 1→3, or stage the capture/settle pair). | "An AI agent books a trade. Then it approves the settlement on that same trade. Both actions are valid in the ERP. **Together they're a segregation-of-duties breach — illegal in the business.** No one notices until the audit. Warden catches it at the moment of action, and seals exactly why." |
| **What it is — 0:15–0:30** | Console topbar in view: WARDEN · "Aurora DSQL · us-east-1 · strongly consistent"; pan the three panes (Request Feed · Decision Inspector · Ledger Chain). | "Warden is a policy decision point for enterprise AI agents. Any agent posts a proposed action *before* it acts; Warden returns allow, deny, or escalate — with a reason and the rule that fired — and seals every verdict into a hash-chained ledger." |
| **Solution in action — 0:30–1:15** | Simulation view. Press **Next** to step. Step 4 lands: crude-desk agent captures a **$4,200,000** deal → green **ALLOW** stamp. Then Step 5: same agent tries **approve_settlement** on that same deal → red **DENY**, `SOD-FBO-01`. Let the Decision Inspector "Duties: FAIL · SOD-FBO-01" line show. | "Here a crude-desk agent captures a four-point-two-million-dollar deal. It holds that mandate — Warden allows it, and seals it. Now the *same* agent tries to approve settlement on the deal it just booked. It has the settlement grant too — so in the ERP, this is allowed. Warden denies it: **front office cannot be back office.** Rule SOD-FBO-01 — the Barings wall — enforced at the tool call, against the agent's *real* prior action on this exact deal." |
| **Wow — the defensible record — 1:15–1:45** | Step to **Verify the chain** → seals lock green down the spine ("Chain intact"). Then **Tamper** (edit one sealed row). Then **Verify again** → break tints red from that seq down ("Break detected at seq …"). | "Every verdict is hash-chained. Verify the ledger — intact, end to end. Now tamper with one sealed row, the way a privileged actor might. Verify again — the break is caught at the exact sequence, and everything below it. This is tamper-**evidence**: a SOX-grade record of not just *what* was decided, but *why*." |
| **Under the hood — 1:45–2:15** | Switch to **Cross-region** view → **Run**. Watch **ALLOW on us-east-1 → ⊘ mandate revoked → DENY on us-west-2**, then the badge "✓ strongly consistent · denied N ms after the revoke, in a different region." | "And this isn't one database. It's **Amazon Aurora DSQL** — active-active across two AWS regions, one logical cluster. Approve a two-million-dollar trade in Virginia. Revoke the authority. The identical action, evaluated in Oregon, is denied — immediately, with no stale read. The whole decision — resolve the authority, lock the grant `FOR UPDATE`, evaluate, write the verdict, append the ledger — is one transaction. DSQL's strong consistency is what makes 'revoked everywhere, instantly' true. That property *is* the product." |
| **Impact + next — 2:15–2:30** | Closing card: "Warden — the control plane for enterprise AI agents" + live link `warden-khaki.vercel.app` + "Built on Amazon Aurora DSQL + Vercel". | "Those controls used to hold by accident: a human had to click, and approvals took a day. Agents erase the delay — and the control vanishes with it. Warden puts it back, at the speed the agent runs. Govern the action before it happens, or explain it at the audit. It's live now — try it at the link below." |

---

## Why these choices (so the cuts are intentional)

- **Aurora DSQL is named and shown doing something no other AWS option does** — the cross-region beat is the rubric's "explain the AWS Database" requirement satisfied by demonstration, not narration.
- **One wow moment**: the tamper-evident ledger ("seals exactly *why*") is the payoff to the cold open. Cross-region is the *depth* beat, not a second climax.
- **No live LLM dependency in the spine.** The Simulation drives the real engine deterministically. The `/agent` LLM tab is optional B-roll only, because OpenAI latency is the one flaky call.

## Flaky-beat fallbacks
- **Cold start** → mitigated by the pre-flight warm-up.
- **A live DSQL call stalls mid-take** → use the Simulation scrubber to replay captured snapshots (no network).
- **Cross-region returns 503** → it won't (verified live), but if a region is mid-maintenance, fall back to the in-region revoke→deny (Simulation steps 1–3) which proves the same consistency point single-region.
- **`/agent` is slow** → cut it; it's not in the critical path.

## Names note
On-screen actors are the live seeded handles (maya.chen — crude desk, liam.obrien — gas desk, raj.patel — products, sam.rivera — settlement). These are the *real* data on screen; narrate them naturally. Do not invent new personas for the video.
