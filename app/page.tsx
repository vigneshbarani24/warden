export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.6 }}>
      <h1 style={{ marginBottom: 0 }}>Warden</h1>
      <p style={{ color: "var(--seal)", marginTop: "0.25rem", fontWeight: 600 }}>
        Governance for enterprise AI agents
      </p>
      <p>
        A Policy Decision Point agents call <em>before</em> acting, and a hash-chained audit
        ledger they write to <em>after</em> — on Amazon Aurora DSQL. Revoke an authority grant
        in one region and the next action is denied everywhere, instantly.
      </p>
      <p>The Decision Inspector console is in progress. PDP API surface:</p>
      <ul className="mono">
        <li>POST /api/pdp/decide</li>
        <li>POST /api/grants/&lt;id&gt;/revoke</li>
        <li>GET /api/ledger</li>
        <li>GET /api/ledger/verify</li>
        <li>GET /api/health</li>
      </ul>
    </main>
  );
}
