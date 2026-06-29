# YouTube — title + description (copy-paste ready)

> Tweak to your voice, then paste into YouTube. Pick one title. The description block is ready as-is.

## Title (pick one)
1. **Warden — stopping an AI agent from approving its own $2M deal (Aurora DSQL + Vercel)**  ← recommended
2. Warden: the permission check AI agents call *before* they act — on Aurora DSQL
3. Valid in the ERP, illegal in the business — governing AI agents with Aurora DSQL

Keep it ~70–95 characters. Title 1 leads with the concrete stakes and names the stack.

---

## Description (paste this block)

Warden is a control plane for enterprise AI agents: a pre-execution authority check an agent calls before it acts, and a tamper-evident, hash-chained ledger of every decision — built on Amazon Aurora DSQL and deployed on Vercel.

The problem: ERP agents (SAP Joule, Oracle, Workday) understand transactions, not a company's approval limits, authority grants, or segregation-of-duties rules. So an agent can take an action that's valid in the ERP yet illegal in the business — like approving the settlement of a deal it just booked. Warden catches that at the moment of action, returns allow / deny / escalate with a reason and the rule that fired, and seals the verdict into an append-only ledger.

Why Amazon Aurora DSQL: a revoked authority has to be denied in every region instantly, with no stale read. That needs synchronous, active-active, multi-Region strong consistency AND a real SQL transaction (SELECT … FOR UPDATE). DSQL is the only AWS-native database that gives both — shown live in the video: a $2M trade is allowed in us-east-1, the mandate is revoked, and the identical action is denied in us-west-2, immediately.

▶ Try it (no login): https://warden-khaki.vercel.app
   /console → Simulation → Play, then Cross-region → Run
💻 Code: https://github.com/vigneshbarani24/warden

Chapters:
0:00 The problem — valid in the ERP, illegal in the business
0:15 Two apps: a real AI agent, and Warden
0:28 Live: the agent books a $4.2M deal → allowed and sealed
0:52 The same agent tries to settle its own deal → denied (SOD-FBO-01)
1:30 The defensible record — verify, tamper, watch the chain break
1:55 Why Amazon Aurora DSQL — the one database that does both
2:15 Live: revoked in us-east-1, denied in us-west-2
2:40 Impact

Stack: Next.js + TypeScript on Vercel · Amazon Aurora DSQL (multi-Region active-active) · pg + IAM-token auth.

I created this video for the purpose of entering the H0 "Hack the Zero Stack" hackathon (AWS Databases × Vercel).

#H0Hackathon

---

## Notes
- Adjust the chapter timestamps to your final cut (these match `video-script.md`).
- Set visibility to **Public** (or Unlisted, but then paste the link into Devpost's testing instructions — judges must reach it without requesting access).
- The `#H0Hackathon` tag + the "created for this hackathon" line also help if you cross-post the video as bonus content.
