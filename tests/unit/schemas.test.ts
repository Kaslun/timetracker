import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  EVENTS,
  type ChannelName,
  type EventName,
} from "../../src/shared/schemas";
import {
  ZBootstrap,
  ZCurrentTaskView,
  ZSettings,
} from "../../src/shared/models";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";

describe("CHANNELS registry", () => {
  it("every channel has a [input, output] tuple of Zod schemas", () => {
    for (const name of Object.keys(CHANNELS) as ChannelName[]) {
      const tuple = CHANNELS[name];
      expect(Array.isArray(tuple)).toBe(true);
      expect(tuple.length).toBe(2);
      expect(typeof tuple[0].safeParse).toBe("function");
      expect(typeof tuple[1].safeParse).toBe("function");
    }
  });

  it("task:start requires a string taskId", () => {
    const [input] = CHANNELS["task:start"];
    expect(input.safeParse({}).success).toBe(false);
    expect(input.safeParse({ taskId: "abc" }).success).toBe(true);
  });

  it("export:csv accepts the documented preset/grouping enums", () => {
    const [input] = CHANNELS["export:csv"];
    const ok = input.safeParse({
      range: "week",
      columns: ["date", "duration"],
      grouping: "entry",
      preset: "sheets",
    });
    expect(ok.success).toBe(true);

    const bad = input.safeParse({
      range: "week",
      columns: ["x"],
      grouping: "unknown",
      preset: "sheets",
    });
    expect(bad.success).toBe(false);
  });
});

describe("EVENTS registry", () => {
  it("every event has a Zod schema", () => {
    for (const name of Object.keys(EVENTS) as EventName[]) {
      expect(typeof EVENTS[name].safeParse).toBe("function");
    }
  });

  it("expanded:state requires { visible: boolean }", () => {
    expect(EVENTS["expanded:state"].safeParse({ visible: true }).success).toBe(
      true,
    );
    expect(EVENTS["expanded:state"].safeParse({}).success).toBe(false);
    expect(EVENTS["expanded:state"].safeParse({ visible: "yes" }).success).toBe(
      false,
    );
  });
});

describe("ZSettings", () => {
  it("accepts the DEFAULT_SETTINGS constant", () => {
    expect(ZSettings.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });
  it("rejects unknown theme ids", () => {
    const bad = { ...DEFAULT_SETTINGS, theme: "plasma" };
    expect(ZSettings.safeParse(bad).success).toBe(false);
  });
});

describe("ZCurrentTaskView", () => {
  it("round-trips an idle current view", () => {
    const idle = {
      taskId: null,
      ticket: null,
      title: "",
      projectName: "",
      projectColor: "#000",
      elapsedSec: 0,
      todaySec: 0,
      running: false,
      entryId: null,
      startedAt: null,
    };
    expect(ZCurrentTaskView.safeParse(idle).success).toBe(true);
  });
});

describe("ZBootstrap", () => {
  it("requires the platform to be one of win/mac/linux", () => {
    const empty = {
      settings: DEFAULT_SETTINGS,
      current: {
        taskId: null,
        ticket: null,
        title: "",
        projectName: "",
        projectColor: "#000",
        elapsedSec: 0,
        todaySec: 0,
        running: false,
        entryId: null,
        startedAt: null,
      },
      tasks: [],
      todayEntries: [],
      captures: [],
      projects: [],
      fillSuggestions: [],
      platform: "win" as const,
    };
    expect(ZBootstrap.safeParse(empty).success).toBe(true);
    expect(ZBootstrap.safeParse({ ...empty, platform: "beos" }).success).toBe(
      false,
    );
  });
});
