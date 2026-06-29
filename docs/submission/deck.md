# Warden — demo deck + video plan (deck-framed, with live clips)

**Format:** a ~2:40 video built from slides **intercut with short live screen-capture clips** of the real app.
The deck carries the story (pain → why-now → architecture → impact); the clips prove it runs.
**Do not** make this slides-only — the brief requires "footage that shows your working application,"
and the judges explicitly reward seeing real, shippable software over slides.

**Why hybrid is also the easy path:** record the three app clips once (they're in `video-script.md`,
click-by-click), then drop them between slides. No flawless one-take needed.

---

## Look (match the product, so "design feels related to the back-end" — a rubric line)
- **Paper** `#EEF1F0` · **Ink** `#14171A` · **Seal/accent** `#6E1D24` (oxblood) · semantic: allow `#1F7A4D`, deny `#B0271F`, escalate `#B5790A`
- **Type:** Geist Sans for headings/body, **Geist Mono** for any code, hash, org path, amount, rule id
- Quiet, institutional, lots of whitespace. One idea per slide. The mono data is the texture — don't hide it.

---

## Slides (intercut clips marked ▶ LIVE)

| # | Slide (on screen) | Voice-over | Rubric |
|---|---|---|---|
| 1 | **Title.** "WARDEN — the control plane for enterprise AI agents." Sub: Track 2 · Amazon Aurora DSQL + Vercel. Oxblood seal mark. | *(2s, let it sit)* "Warden." | — |
| 2 | **The pain.** Big line: "Valid in the ERP. Illegal in the business." Small: an agent books a trade, then settles its own deal. | "An AI agent books a trade, then approves the settlement on that same trade. Valid in the ERP. Illegal in the business — a segregation-of-duties breach. For the finance and risk teams now pointing agents at their ERP, that's the nightmare." | Impact · Originality |
| 3 | **Why now (the insight).** "The controls were never in the ERP. They were in the latency." | "These controls used to hold by accident — a human had to click, approvals took a day. Agents erase the delay, and the control vanishes with it. The gap is invisible: every action looks valid, and it widens with every agent you deploy." | Originality |
| 4 | **What Warden is.** Two boxes: PDP (before) + hash-chained ledger (after). One-line contract `decide({actor, action, resource, amount, orgPath})`. | "Warden puts the control back. A decision point the agent calls before it acts — allow, deny, or escalate, with a reason — and a tamper-evident ledger it writes to after." | Technical |
| 5 | **▶ LIVE — the split view.** Clip: agent (left) + console (right). Capture $4.2M DEAL-CR-9001 → ALLOW (seals on right); settle same deal → DENY · SOD-FBO-01 → agent halts. (Shot list in `video-script.md`.) | "Here's a real agent. It books a four-point-two-million-dollar deal — Warden allows it, and seals it on the right. Then it tries to settle the deal it just booked. Warden denies it — SOD-FBO-01 — and the agent halts. No retry, no workaround." | Technical · Design · Impact |
| 6 | **▶ LIVE — the defensible record.** Clip: console Verify (green) → Tamper → Verify (red break). | "Every verdict is hash-chained. Verify — intact. Tamper with one sealed row, verify again — the break is caught at the exact sequence. Not just what was decided. Why." | Technical · Design |
| 7 | **Architecture.** Embed `docs/context.drawio` (or `warden-architecture.drawio`). agent → @warden/sdk → Warden PDP (one txn, FOR UPDATE, withRetry) → Aurora DSQL (multi-Region) + ledger. | "Any agent calls one HTTP contract. Warden resolves authority up the org hierarchy, locks the grant for update, evaluates, and seals the verdict — all in one transaction on Amazon Aurora DSQL." | Technical |
| 8 | **▶ LIVE — cross-region + why DSQL.** Clip: Cross-region → Run → ALLOW us-east-1 → revoke → DENY us-west-2 · "strongly consistent." Slide overlay: the one-sentence why. | "Why DSQL? It's active-active across regions. Allow a trade in Virginia, revoke the authority, and Oregon denies the identical action immediately — no stale read. That's the property the whole product rests on, and DSQL is the only AWS-native database that gives it with full SQL transactions." | Technical · Originality |
| 9 | **Impact + what's next.** "Govern the action before it happens — or explain it at the audit." Monetization one-liner; roadmap (DB-enforced immutability) as *next*. | "Govern the action before it happens, or explain it at the audit. Warden's live today, and any agent can call the same contract." | Impact |
| 10 | **Close card.** warden-khaki.vercel.app · github.com/vigneshbarani24/warden · "Built on Amazon Aurora DSQL + Vercel." | *(silent / 2s)* | — |

**Running time:** ~2:40. Slides 2–4 move fast (story); 5, 6, 8 are the live clips (the meat); 7 is the diagram.

---

## Rubric coverage check
- **Technological Implementation** — slides 4, 5, 6, 7, 8 (one-txn decide, FOR UPDATE, hash chain, multi-Region DSQL).
- **Design** — the deck matches the console palette; slides 5–6 show the designed console.
- **Impact & Real-world** — slides 2, 3, 9 (felt pain, the stakes, monetization).
- **Originality** — slides 3, 8 ("controls were in the latency"; DB-as-thesis).
- **Hackathon must-haves** — pain/for-whom/why (2–3), footage of working app (5, 6, 8), AWS DB named + shown (7, 8).

## Production notes
- Build slides in **Canva / Google Slides / Keynote** with the palette above. Export the two `.drawio` diagrams to PNG (diagrams.net → Export → PNG) for slide 7.
- Record the three live clips per `video-script.md` (pre-flight warm-up included there). Keep each clip 15–40s.
- Assemble: slide → clip → slide. Lay the VO last (clean TTS is fine).
- Keep it **under 3:00**. Upload to YouTube early.
- Fallback if a live clip flakes: the console **Simulation → Play** runs the same allow/deny/escalate/verify/tamper beats with no LLM.
