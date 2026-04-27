import { useState } from "react";
import { NameStep } from "./NameStep";
import { ToolsStep } from "./ToolsStep";
import { useStore } from "@/store";
import { rpc } from "@/lib/api";
import { Ic } from "@/components";

export function IntroRoot() {
  const [name, setName] = useState("");
  const integrations = useStore((s) => s.integrations);

  const onDone = (): void => {
    if (!name) return;
    // Settings stores a quick lookup of connected providers for downstream
    // services (idle service, etc). The tokens themselves live in the keychain.
    const connected: Record<string, boolean> = {};
    for (const i of integrations) {
      if (i.status === "connected") connected[i.id] = true;
    }
    void rpc("window:closeIntro", { name, connected });
  };

  const onSkip = (): void => {
    void rpc("window:closeIntro", undefined);
  };

  return (
    <div
      className="attensi"
      style={{
        height: "100%",
        background: "color-mix(in oklab, var(--ink) 35%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        className="window"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            onClick={onSkip}
            className="btn ghost icon"
            style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
            title="Skip for now"
          >
            <Ic.Close s={12} />
          </button>
        </div>

        <div
          className="scroll"
          style={{ flex: 1, padding: "32px 32px 4px", overflow: "auto" }}
        >
          <IntroHeader />
          <NameStep name={name} onChange={setName} onSubmit={onDone} />
          <ToolsStep />
        </div>

        <IntroFooter name={name} onDone={onDone} onSkip={onSkip} />
      </div>
    </div>
  );
}

function IntroHeader() {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ◴
        </div>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Attensi
        </span>
      </div>

      <div
        className="display"
        style={{
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        Let's make time tracking
        <br />
        actually painless.
      </div>
      <div
        className="ink-3"
        style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}
      >
        Two quick things and you're set. You can change everything later in
        Settings.
      </div>
    </>
  );
}

function IntroFooter({
  name,
  onDone,
  onSkip,
}: {
  name: string;
  onDone: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      style={{
        padding: "16px 32px",
        borderTop: "1px solid var(--line)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        background: "var(--bg-2)",
      }}
    >
      <div className="ink-3" style={{ fontSize: 11, flex: 1 }}>
        Takes{" "}
        <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>
          &lt; 30 sec
        </span>{" "}
        · nothing is logged yet
      </div>
      <button className="btn ghost" onClick={onSkip}>
        Skip for now
      </button>
      <button
        className="btn accent"
        disabled={!name}
        onClick={onDone}
        style={{
          opacity: name ? 1 : 0.5,
          cursor: name ? "pointer" : "not-allowed",
          padding: "8px 16px",
        }}
      >
        Get started
        <span style={{ marginLeft: 4 }}>→</span>
      </button>
    </div>
  );
}
