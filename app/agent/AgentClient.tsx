"use client";

/**
 * The agent runtime UI. A terminal-style transcript: the agent's text plus, for
 * every tool call, the Warden verdict rendered inline. The verdict is the point —
 * allow/deny/escalate in its semantic color, Warden's reason, the rule ids that
 * fired, and the agent's reaction (proceeded vs halted by Warden).
 */
import { useState, type CSSProperties } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import type { ErpAgentUIMessage } from "@/lib/agents/erp-agent";

const EXAMPLES = [
  "Capture a $4.2M crude trade, deal DEAL-CR-9001",
  "Now settle DEAL-CR-9001",
  "Capture a $6M crude trade, deal DEAL-CR-9002",
] as const;

type Verdict = "allow" | "deny" | "escalate";

/** The shape every erp-tool resolves to (mirrors gatedExecute in lib/tools/erp-tools.ts). */
interface ToolOutput {
  executed: boolean;
  verdict: Verdict;
  reason: string;
  firedRuleIds: string[];
  resource: string;
  amount: number;
}

const VERDICT_COLOR: Record<Verdict, string> = {
  allow: "#2BD576",
  deny: "#FF5C5C",
  escalate: "#F2B233",
};

function isToolOutput(value: unknown): value is ToolOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.verdict === "string" &&
    typeof v.executed === "boolean" &&
    typeof v.reason === "string" &&
    Array.isArray(v.firedRuleIds)
  );
}

function fmtAmount(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function AgentClient() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat<ErpAgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 860, width: "100%", margin: "0 auto", padding: "0 16px" }}>
      <section style={{ flex: 1, padding: "20px 0 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        {messages.length === 0 && (
          <div style={{ color: "#5A6A78", fontSize: 13, lineHeight: 1.7 }}>
            <p style={{ margin: 0, color: "#8AA0B0" }}>$ agent --boot</p>
            <p style={{ margin: "10px 0 0" }}>
              Simulated ERP desk agent online. Every action it takes is checked by Warden before it
              executes. Try a task below, or watch the segregation-of-duties trap: capture a deal,
              then try to settle the same deal.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Speaker role={message.role} />
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <p key={i} style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65, color: message.role === "user" ? "#E8EEF2" : "#C7D0D6", fontSize: 13.5 }}>
                    {part.text}
                  </p>
                );
              }

              if (isToolUIPart(part)) {
                const toolName = part.type.replace(/^tool-/, "");
                const args =
                  (part.state === "input-available" || part.state === "output-available") &&
                  part.input && typeof part.input === "object"
                    ? (part.input as { resource?: unknown; amount?: unknown })
                    : null;
                const output = part.state === "output-available" && isToolOutput(part.output) ? part.output : null;

                return (
                  <ToolCard
                    key={i}
                    toolName={toolName}
                    pending={part.state === "input-streaming" || part.state === "input-available"}
                    resource={typeof args?.resource === "string" ? args.resource : undefined}
                    amount={typeof args?.amount === "number" ? args.amount : undefined}
                    output={output}
                  />
                );
              }

              return null;
            })}
          </div>
        ))}

        {busy && (
          <p style={{ margin: 0, color: "#5A6A78", fontSize: 12.5 }}>
            <span style={{ color: "#2BD576" }}>▍</span> agent working…
          </p>
        )}
      </section>

      <section style={{ position: "sticky", bottom: 0, background: "#0A0E12", paddingBottom: 18, paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => submit(ex)}
              style={exampleBtn(busy)}
            >
              {ex}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          style={{ display: "flex", gap: 8, alignItems: "stretch" }}
        >
          <span style={{ color: "#2BD576", alignSelf: "center", fontSize: 14 }}>$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct the desk agent…"
            spellCheck={false}
            style={{
              flex: 1,
              background: "#0E141A",
              border: "1px solid #1B2530",
              color: "#E8EEF2",
              padding: "11px 13px",
              fontFamily: "inherit",
              fontSize: 13.5,
              borderRadius: 6,
              outline: "none",
            }}
          />
          <button type="submit" disabled={busy || !input.trim()} style={sendBtn(busy || !input.trim())}>
            run
          </button>
        </form>
      </section>
    </div>
  );
}

function Speaker({ role }: { role: string }) {
  const isUser = role === "user";
  return (
    <span style={{ fontSize: 11, letterSpacing: "0.08em", color: isUser ? "#8AA0B0" : "#2BD576", textTransform: "uppercase" }}>
      {isUser ? "▸ operator" : "◆ crude desk agent"}
    </span>
  );
}

function ToolCard({
  toolName,
  pending,
  resource,
  amount,
  output,
}: {
  toolName: string;
  pending: boolean;
  resource?: string;
  amount?: number;
  output: ToolOutput | null;
}) {
  const verdict = output?.verdict;
  const accent = verdict ? VERDICT_COLOR[verdict] : "#3A4754";

  return (
    <div
      style={{
        border: "1px solid #1B2530",
        borderLeft: `3px solid ${accent}`,
        background: "#0E141A",
        borderRadius: 6,
        padding: "12px 14px",
        fontSize: 12.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#8AA0B0", letterSpacing: "0.03em" }}>⚙ {toolName}</span>
        {resource && <span style={{ color: "#5A6A78" }}>· {resource}</span>}
        {typeof amount === "number" && <span style={{ color: "#5A6A78" }}>· {fmtAmount(amount)}</span>}
        <span style={{ flex: 1 }} />
        {pending && !output && <span style={{ color: "#5A6A78" }}>→ asking Warden…</span>}
        {verdict && (
          <span
            style={{
              color: accent,
              border: `1px solid ${accent}`,
              borderRadius: 4,
              padding: "1px 8px",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {verdict}
          </span>
        )}
      </div>

      {output && (
        <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ margin: 0, color: "#C7D0D6", lineHeight: 1.55 }}>
            <span style={{ color: "#5A6A78" }}>warden:</span> {output.reason}
          </p>
          {output.firedRuleIds.length > 0 && (
            <p style={{ margin: 0, color: "#8AA0B0" }}>
              <span style={{ color: "#5A6A78" }}>rules:</span> {output.firedRuleIds.join(" · ")}
            </p>
          )}
          <p style={{ margin: 0, color: accent, fontSize: 12 }}>
            {output.executed
              ? "▸ proceeding — action executed"
              : verdict === "escalate"
                ? "→ escalated — agent halted, awaiting higher authority"
                : "✕ halted by Warden — agent did not act"}
          </p>
        </div>
      )}
    </div>
  );
}

const exampleBtn = (disabled: boolean): CSSProperties => ({
  background: "#0E141A",
  border: "1px solid #1B2530",
  color: disabled ? "#3A4754" : "#8AA0B0",
  padding: "7px 11px",
  fontFamily: "inherit",
  fontSize: 12,
  borderRadius: 5,
  cursor: disabled ? "not-allowed" : "pointer",
});

const sendBtn = (disabled: boolean): CSSProperties => ({
  background: disabled ? "#13202B" : "#15412B",
  border: `1px solid ${disabled ? "#1B2530" : "#2BD576"}`,
  color: disabled ? "#3A4754" : "#2BD576",
  padding: "0 18px",
  fontFamily: "inherit",
  fontSize: 13,
  borderRadius: 6,
  cursor: disabled ? "not-allowed" : "pointer",
  letterSpacing: "0.04em",
});
