/**
 * Tests for the shared integration metadata registry. The renderer chips
 * and main-process audit log both depend on these helpers; keep them
 * locked in so adding a new provider is a one-line change with no
 * surprises elsewhere.
 */
import { describe, expect, it } from "vitest";
import {
  TASK_SOURCES,
  buildExternalUrl,
  sourceColor,
  sourceLabel,
  taskSource,
} from "@shared/integrations/registry";

describe("sourceLabel", () => {
  it("returns 'Local' for the local pseudo-source", () => {
    expect(sourceLabel("local")).toBe("Local");
  });

  it("returns the brand label for known providers", () => {
    expect(sourceLabel("linear")).toBe("Linear");
    expect(sourceLabel("jira")).toBe("Jira");
    expect(sourceLabel("github")).toBe("GitHub");
  });
});

describe("sourceColor", () => {
  it("returns a neutral grey for local tasks", () => {
    expect(sourceColor("local")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns the brand colour for known providers", () => {
    expect(sourceColor("linear")).toMatch(/^#[0-9a-f]{6}$/i);
    // Jira's blue is not the local grey.
    expect(sourceColor("jira")).not.toBe(sourceColor("local"));
  });
});

describe("buildExternalUrl", () => {
  it("returns null for local tasks", () => {
    expect(buildExternalUrl({ source: "local", ticket: "PROJ-1" })).toBeNull();
  });

  it("returns null when the provider has no URL template (Slack)", () => {
    expect(buildExternalUrl({ source: "slack", ticket: null })).toBeNull();
  });

  it("substitutes {workspace} and {ticket} for Linear", () => {
    expect(
      buildExternalUrl({
        source: "linear",
        ticket: "MOB-104",
        workspace: "acme",
      }),
    ).toBe("https://linear.app/acme/issue/MOB-104");
  });

  it("substitutes {workspace} and {ticket} for Jira", () => {
    expect(
      buildExternalUrl({
        source: "jira",
        ticket: "ACC-9",
        workspace: "acme",
      }),
    ).toBe("https://acme.atlassian.net/browse/ACC-9");
  });

  it("substitutes {id} for Asana / GCal / Notion", () => {
    expect(
      buildExternalUrl({ source: "asana", ticket: null, externalId: "9999" }),
    ).toBe("https://app.asana.com/0/0/9999");
    expect(
      buildExternalUrl({ source: "notion", ticket: null, externalId: "abcd" }),
    ).toBe("https://www.notion.so/abcd");
  });

  it("returns null when a required token is missing", () => {
    expect(
      buildExternalUrl({ source: "linear", ticket: null, workspace: "acme" }),
    ).toBeNull();
    expect(buildExternalUrl({ source: "asana", ticket: null })).toBeNull();
  });
});

describe("taskSource", () => {
  it("returns 'local' for null integrationId", () => {
    expect(taskSource(null)).toBe("local");
  });

  it("returns the integration id when known", () => {
    expect(taskSource("linear")).toBe("linear");
    expect(taskSource("jira")).toBe("jira");
  });

  it("falls back to 'local' for unknown integrationIds", () => {
    expect(taskSource("definitely-not-a-real-provider")).toBe("local");
  });
});

describe("TASK_SOURCES", () => {
  it("starts with 'local' so filter chips render it first", () => {
    expect(TASK_SOURCES[0]).toBe("local");
  });
});
