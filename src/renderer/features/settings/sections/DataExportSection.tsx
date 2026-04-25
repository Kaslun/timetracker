import { Field, SectionTitle } from "../Field";
import { rpc } from "@/lib/api";

export function DataExportSection() {
  return (
    <>
      <SectionTitle
        title="Data & export"
        sub="Everything lives locally in a single SQLite file."
      />
      <Field
        label="Database location"
        sub="%APPDATA%\Attensi Time Tracker\timetracker.sqlite"
      >
        <span className="mono ink-3" style={{ fontSize: 11 }}>
          read-only — view in your file manager
        </span>
      </Field>
      <Field
        label="CSV export"
        sub="Use the Dashboard window for full export controls."
      >
        <button
          className="btn"
          onClick={() => void rpc("window:openDashboard")}
        >
          Open dashboard
        </button>
      </Field>
    </>
  );
}
