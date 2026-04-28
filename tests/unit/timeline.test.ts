/**
 * Tests for the shared timeline overlap + snap helpers used by both the
 * renderer (drag/resize) and the main process (insert/update guards).
 */
import { describe, expect, it } from "vitest";
import {
  SNAP_MS,
  MIN_DURATION_MS,
  clampToNeighbours,
  findOverlaps,
  gridBounds,
  overlaps,
  resolveConflict,
  snapCeil,
  snapFloor,
  snapToGrid,
  splitAround,
  type Interval,
} from "@shared/lib/timeline";

const T0 = 1_700_000_000_000;

describe("snap helpers", () => {
  // Anchor on a value already on the 5-min grid so the math is unambiguous.
  const G = snapFloor(T0);

  it("snapToGrid rounds to nearest 5-minute boundary", () => {
    expect(snapToGrid(G)).toBe(G);
    // 60s past G → still nearer to G than to G + 5min
    expect(snapToGrid(G + 60_000)).toBe(G);
    // 4 min past G → nearer to G + 5min
    expect(snapToGrid(G + 4 * 60_000)).toBe(G + SNAP_MS);
  });

  it("snapFloor and snapCeil bracket the input on the grid", () => {
    const x = G + 90_000;
    expect(snapFloor(x)).toBe(G);
    expect(snapCeil(x)).toBe(G + SNAP_MS);
  });

  it("snapFloor === snapCeil when input lands on the grid", () => {
    expect(snapFloor(G)).toBe(G);
    expect(snapCeil(G)).toBe(G);
  });
});

describe("gridBounds", () => {
  it("computes display bounds, padded to MIN_DURATION_MS", () => {
    const start = snapFloor(T0);
    const b = gridBounds({
      startedAt: start + 30_000,
      endedAt: start + 60_000,
    });
    expect(b.gridStart).toBe(start);
    expect(b.gridEnd - b.gridStart).toBeGreaterThanOrEqual(MIN_DURATION_MS);
  });

  it("treats open entries as a single-snap-window block", () => {
    const start = snapFloor(T0);
    const b = gridBounds({ startedAt: start, endedAt: null });
    expect(b.gridStart).toBe(start);
    expect(b.gridEnd).toBe(start + MIN_DURATION_MS);
  });
});

describe("overlaps", () => {
  it("returns false when intervals only touch at the boundary", () => {
    const a = { startedAt: T0, endedAt: T0 + SNAP_MS };
    const b = { startedAt: T0 + SNAP_MS, endedAt: T0 + 2 * SNAP_MS };
    expect(overlaps(a, b)).toBe(false);
  });

  it("returns true for genuine overlap", () => {
    const a = { startedAt: T0, endedAt: T0 + 2 * SNAP_MS };
    const b = { startedAt: T0 + SNAP_MS, endedAt: T0 + 3 * SNAP_MS };
    expect(overlaps(a, b)).toBe(true);
  });

  it("treats an open-ended interval as extending to +Infinity", () => {
    const open = { startedAt: T0, endedAt: null };
    const later = {
      startedAt: T0 + 9_999_999,
      endedAt: T0 + 9_999_999 + SNAP_MS,
    };
    expect(overlaps(open, later)).toBe(true);
  });
});

describe("findOverlaps", () => {
  const others: Interval[] = [
    { id: "a", startedAt: T0, endedAt: T0 + SNAP_MS },
    { id: "b", startedAt: T0 + 2 * SNAP_MS, endedAt: T0 + 3 * SNAP_MS },
    { id: "c", startedAt: T0 + 4 * SNAP_MS, endedAt: null },
  ];

  it("returns every overlapping neighbour", () => {
    const hits = findOverlaps(
      { startedAt: T0 - SNAP_MS, endedAt: T0 + 2.5 * SNAP_MS },
      others,
    );
    expect(hits.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("excludeId removes self from the candidate list", () => {
    const hits = findOverlaps(
      { startedAt: T0, endedAt: T0 + SNAP_MS },
      others,
      "a",
    );
    expect(hits).toEqual([]);
  });
});

describe("clampToNeighbours", () => {
  it("trims the leading edge against an earlier neighbour", () => {
    const others: Interval[] = [
      { id: "before", startedAt: T0, endedAt: T0 + 2 * SNAP_MS },
    ];
    const out = clampToNeighbours(
      { startedAt: T0 + SNAP_MS, endedAt: T0 + 4 * SNAP_MS },
      others,
    );
    expect(out).toEqual({
      startedAt: T0 + 2 * SNAP_MS,
      endedAt: T0 + 4 * SNAP_MS,
    });
  });

  it("trims the trailing edge against a later neighbour", () => {
    const others: Interval[] = [
      { id: "after", startedAt: T0 + 3 * SNAP_MS, endedAt: T0 + 5 * SNAP_MS },
    ];
    const out = clampToNeighbours(
      { startedAt: T0, endedAt: T0 + 4 * SNAP_MS },
      others,
    );
    expect(out).toEqual({
      startedAt: T0,
      endedAt: T0 + 3 * SNAP_MS,
    });
  });

  it("returns null when the surviving range is below MIN_DURATION_MS", () => {
    const others: Interval[] = [
      { id: "x", startedAt: T0, endedAt: T0 + SNAP_MS },
      { id: "y", startedAt: T0 + SNAP_MS + 30_000, endedAt: T0 + 3 * SNAP_MS },
    ];
    const out = clampToNeighbours(
      { startedAt: T0 + 30_000, endedAt: T0 + 2 * SNAP_MS },
      others,
    );
    expect(out).toBeNull();
  });

  it("ignores neighbours that don't intersect the proposed range", () => {
    const others: Interval[] = [
      {
        id: "way-before",
        startedAt: T0 - 100 * SNAP_MS,
        endedAt: T0 - 50 * SNAP_MS,
      },
      {
        id: "way-after",
        startedAt: T0 + 50 * SNAP_MS,
        endedAt: T0 + 100 * SNAP_MS,
      },
    ];
    const out = clampToNeighbours(
      { startedAt: T0, endedAt: T0 + SNAP_MS },
      others,
    );
    expect(out).toEqual({ startedAt: T0, endedAt: T0 + SNAP_MS });
  });

  it("respects excludeId", () => {
    const proposed = { startedAt: T0, endedAt: T0 + SNAP_MS };
    const others: Interval[] = [
      { id: "self", startedAt: T0, endedAt: T0 + SNAP_MS },
    ];
    expect(clampToNeighbours(proposed, others, "self")).toEqual(proposed);
  });
});

describe("splitAround", () => {
  it("yields no pieces when the cut covers the entire entry", () => {
    const out = splitAround(
      { startedAt: T0, endedAt: T0 + SNAP_MS },
      { startedAt: T0, endedAt: T0 + SNAP_MS },
    );
    expect(out).toEqual([]);
  });

  it("yields a leading piece when the cut starts after the entry", () => {
    const out = splitAround(
      { startedAt: T0, endedAt: T0 + 4 * SNAP_MS },
      { startedAt: T0 + 2 * SNAP_MS, endedAt: T0 + 4 * SNAP_MS },
    );
    expect(out).toEqual([{ startedAt: T0, endedAt: T0 + 2 * SNAP_MS }]);
  });

  it("yields both leading and trailing pieces for a middle cut", () => {
    const out = splitAround(
      { startedAt: T0, endedAt: T0 + 4 * SNAP_MS },
      { startedAt: T0 + SNAP_MS, endedAt: T0 + 3 * SNAP_MS },
    );
    expect(out).toEqual([
      { startedAt: T0, endedAt: T0 + SNAP_MS },
      { startedAt: T0 + 3 * SNAP_MS, endedAt: T0 + 4 * SNAP_MS },
    ]);
  });

  it("drops sub-MIN_DURATION_MS slivers", () => {
    const out = splitAround(
      { startedAt: T0, endedAt: T0 + 4 * SNAP_MS },
      { startedAt: T0 + 30_000, endedAt: T0 + 4 * SNAP_MS - 30_000 },
    );
    expect(out).toEqual([]);
  });

  it("treats an open entry as ending at the cut", () => {
    const out = splitAround(
      { startedAt: T0, endedAt: null },
      { startedAt: T0, endedAt: T0 + SNAP_MS },
    );
    expect(out).toEqual([]);
  });
});

describe("resolveConflict", () => {
  it("returns ok when there are no overlaps", () => {
    const out = resolveConflict({ startedAt: T0, endedAt: T0 + SNAP_MS }, [
      { id: "x", startedAt: T0 + 5 * SNAP_MS, endedAt: T0 + 6 * SNAP_MS },
    ]);
    expect(out.kind).toBe("ok");
  });

  it("returns trim when clamping recovers a viable range", () => {
    const out = resolveConflict(
      { startedAt: T0 + SNAP_MS, endedAt: T0 + 4 * SNAP_MS },
      [{ id: "x", startedAt: T0, endedAt: T0 + 2 * SNAP_MS }],
    );
    expect(out.kind).toBe("trim");
    if (out.kind === "trim") {
      expect(out.adjusted.startedAt).toBe(T0 + 2 * SNAP_MS);
      expect(out.adjusted.endedAt).toBe(T0 + 4 * SNAP_MS);
    }
  });

  it("returns conflict when neighbours straddle the proposed range", () => {
    const others: Interval[] = [
      { id: "x", startedAt: T0, endedAt: T0 + 3 * SNAP_MS },
      { id: "y", startedAt: T0 + SNAP_MS, endedAt: T0 + 4 * SNAP_MS },
    ];
    const out = resolveConflict(
      { startedAt: T0 + SNAP_MS, endedAt: T0 + 3 * SNAP_MS },
      others,
    );
    expect(out.kind).toBe("conflict");
    if (out.kind === "conflict") {
      expect(out.conflictsWith.map((c) => c.id).sort()).toEqual(["x", "y"]);
    }
  });
});
