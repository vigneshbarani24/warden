import type { Metadata } from "next";
import { AgentClient } from "./AgentClient";

export const metadata: Metadata = {
  title: "Crude Desk Agent — runtime",
  description: "A simulated SAP-class ERP agent that calls Warden before every action.",
};

/**
 * STANDALONE surface with its own visual identity: a dark agent-runtime terminal.
 * Deliberately NOT the light institutional Warden console — in the demo these read
 * as two separate apps. This is the agent calling Warden; Warden is the other app.
 */
export default function AgentPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0A0E12",
        color: "#C7D0D6",
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1B2530",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#2BD576",
            boxShadow: "0 0 10px #2BD576",
            display: "inline-block",
          }}
        />
        <span style={{ color: "#E8EEF2", letterSpacing: "0.04em", fontSize: 13 }}>
          CRUDE&nbsp;DESK&nbsp;AGENT
        </span>
        <span style={{ color: "#5A6A78", fontSize: 12 }}>· runtime · acting as maya.chen</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "#5A6A78", fontSize: 11 }}>
          gated by <span style={{ color: "#8AA0B0" }}>Warden PDP</span> · /global/trading/crude/
        </span>
      </header>
      <AgentClient />
    </main>
  );
}
