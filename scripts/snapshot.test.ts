import { describe, expect, test } from "bun:test";
import { normalizeRows, summarize, toCsv } from "./snapshot";

const input = [
  {
    coin: "#2",
    market_class: "named",
    market_name: "Yes, with comma",
    trades: 2,
    traders: 2,
    volume: 10.5,
    avg_px: 0.5,
  },
  {
    coin: "#1",
    market_class: "",
    market_name: "No",
    trades: 3,
    traders: 1,
    volume: 20,
    avg_px: 0.25,
  },
];

describe("snapshot helpers", () => {
  test("normalizes and deterministically sorts outcome-token rows", () => {
    const rows = normalizeRows({ data: input });

    expect(rows.map((row) => row.coin)).toEqual(["#1", "#2"]);
    expect(rows[0]?.target_price).toBe(0);
    expect(rows[0]?.underlying).toBe("");
  });

  test("summarizes additive fields without inventing unique traders", () => {
    const rows = normalizeRows(input);
    const stats = summarize(rows, "2026-08-03T00:00:00.000Z");

    expect(stats.outcomeTokenRows).toBe(2);
    expect(stats.indexedNotional).toBe(30.5);
    expect(stats.indexedFills).toBe(5);
    expect(stats).not.toHaveProperty("uniqueTraders");
  });

  test("escapes CSV text fields", () => {
    const csv = toCsv(normalizeRows(input));

    expect(csv).toContain('"Yes, with comma"');
    expect(csv.split("\n")).toHaveLength(4);
  });

  test("rejects malformed rows", () => {
    expect(() => normalizeRows([{ coin: "BTC", volume: 1 }])).toThrow(
      "invalid HIP-4 coin",
    );
    expect(() => normalizeRows([{ coin: "#1", volume: "nope" }])).toThrow(
      "invalid volume",
    );
  });
});
