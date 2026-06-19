import styles from "./console.module.css";

/**
 * Static architecture diagram (also the submission diagram). Reads top→bottom:
 * the knowledge graph feeds the agent (context); the agent proposes an action;
 * the coarse MCP gateway delegates the business decision to Warden; Warden
 * decides and seals the verdict; Aurora DSQL underpins authority + ledger.
 */
export function ArchitectureView() {
  return (
    <div className={styles.archView}>
      <div className={styles.viewHead}>
        <h2 className={styles.viewTitle}>Architecture</h2>
        <p className={styles.viewSub}>The knowledge graph is memory · MCP is hands · Warden is authority.</p>
      </div>

      <div className={styles.archDiagram}>
        <div className={styles.archRow}>
          <div className={`${styles.archBox} ${styles.archCtx}`}>
            <div className={styles.archBoxTitle}>Enterprise Knowledge Graph</div>
            <div className={styles.archBoxSub}>context — what the agent knows</div>
          </div>
          <div className={styles.archArrowH}>context →</div>
          <div className={`${styles.archBox} ${styles.archAgent}`}>
            <div className={styles.archBoxTitle}>AI Agent Fleet</div>
            <div className={styles.archBoxSub}>SAP · Workday · Oracle — reasoning + planning</div>
          </div>
        </div>

        <div className={styles.archArrowV}>proposes action · @warden/sdk ↓</div>

        <div className={`${styles.archBox} ${styles.archGate}`}>
          <div className={styles.archBoxTitle}>MCP Gateway / AWS AgentCore</div>
          <div className={styles.archBoxSub}>coarse — identity · OAuth 2.1 · which tool · content guardrails</div>
        </div>

        <div className={styles.archArrowV}>delegates the business decision ↓</div>

        <div className={`${styles.archBox} ${styles.archHero}`}>
          <div className={styles.archBoxTitle}>WARDEN — Business-Authority PDP</div>
          <div className={styles.archBoxSub}>
            active grants up the org hierarchy · approval limits · segregation of duties →
            allow · deny · escalate, with the reason and rules that fired
          </div>
        </div>

        <div className={styles.archArrowV}>↓</div>

        <div className={styles.archSplit}>
          <div className={styles.archBranch}>
            <div className={`${styles.archBox} ${styles.archExec}`}>
              <div className={styles.archBoxTitle}>ERP / Tool Executes</div>
              <div className={styles.archBoxSub}>only on allow</div>
            </div>
          </div>
          <div className={styles.archBranch}>
            <div className={`${styles.archBox} ${styles.archLedger}`}>
              <div className={styles.archBoxTitle}>Hash-chained Ledger</div>
              <div className={styles.archBoxSub}>append-only · tamper-evident · the defensible &ldquo;why&rdquo;</div>
            </div>
          </div>
        </div>

        <div className={styles.archBase}>
          <div className={styles.archBoxTitle}>Amazon Aurora DSQL</div>
          <div className={styles.archBoxSub}>
            strongly consistent · active-active multi-region (us-east-1 ⇄ us-west-2 + witness) · IAM-token auth —
            a revoked authority is denied everywhere, the instant it commits
          </div>
        </div>
      </div>
    </div>
  );
}
