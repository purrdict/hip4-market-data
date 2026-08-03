import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export type MarketRow = {
  coin: string;
  market_class: string;
  underlying: string;
  period: string;
  target_price: number;
  market_name: string;
  trades: number;
  traders: number;
  volume: number;
  avg_px: number;
};

const sourceUrl = "https://api.purrdict.xyz/api/markets/overview";
const columns: Array<keyof MarketRow> = [
  "coin",
  "market_class",
  "underlying",
  "period",
  "target_price",
  "market_name",
  "trades",
  "traders",
  "volume",
  "avg_px",
];

const numericFields = new Set<keyof MarketRow>([
  "target_price",
  "trades",
  "traders",
  "volume",
  "avg_px",
]);

export function normalizeRows(input: unknown): MarketRow[] {
  const payload = input as { data?: unknown };
  const candidates = Array.isArray(input) ? input : payload?.data;
  if (!Array.isArray(candidates)) {
    throw new TypeError("Expected an array or an object with a data array");
  }

  return candidates
    .map((candidate, index) => {
      if (!candidate || typeof candidate !== "object") {
        throw new TypeError(`Row ${index} is not an object`);
      }

      const raw = candidate as Record<string, unknown>;
      const row = Object.fromEntries(
        columns.map((field) => {
          if (numericFields.has(field)) {
            const value = Number(raw[field] ?? 0);
            if (!Number.isFinite(value)) {
              throw new TypeError(`Row ${index} has an invalid ${field}`);
            }
            return [field, value];
          }
          return [field, String(raw[field] ?? "")];
        }),
      ) as MarketRow;

      if (!row.coin.startsWith("#")) {
        throw new TypeError(`Row ${index} has an invalid HIP-4 coin`);
      }
      return row;
    })
    .sort(
      (a, b) =>
        b.volume - a.volume ||
        b.trades - a.trades ||
        a.coin.localeCompare(b.coin),
    );
}

export function summarize(rows: MarketRow[], generatedAt: string) {
  const byMarketClass = Object.entries(
    Object.groupBy(rows, (row) => row.market_class || "unclassified"),
  )
    .map(([marketClass, values]) => ({
      marketClass,
      outcomeTokenRows: values?.length ?? 0,
      indexedNotional: (values ?? []).reduce((sum, row) => sum + row.volume, 0),
      indexedFills: (values ?? []).reduce((sum, row) => sum + row.trades, 0),
    }))
    .sort((a, b) => b.indexedNotional - a.indexedNotional);

  return {
    source: sourceUrl,
    generatedAt,
    rowDefinition: "One row per indexed HIP-4 outcome token",
    outcomeTokenRows: rows.length,
    indexedNotional: rows.reduce((sum, row) => sum + row.volume, 0),
    indexedFills: rows.reduce((sum, row) => sum + row.trades, 0),
    classifiedRows: rows.filter((row) => row.market_class).length,
    unclassifiedRows: rows.filter((row) => !row.market_class).length,
    byMarketClass,
  };
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(rows: MarketRow[]) {
  return (
    [
      columns.join(","),
      ...rows.map((row) =>
        columns.map((field) => csvCell(row[field])).join(","),
      ),
    ].join("\n") + "\n"
  );
}

async function main() {
  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "purrdict/hip4-market-data snapshot",
    },
  });
  if (!response.ok) {
    throw new Error(`Snapshot request failed with HTTP ${response.status}`);
  }

  const generatedAt = new Date().toISOString();
  const date = generatedAt.slice(0, 10);
  const rows = normalizeRows(await response.json());
  if (rows.length === 0)
    throw new Error("Refusing to publish an empty snapshot");

  const overview = {
    source: sourceUrl,
    generatedAt,
    rowDefinition: "One row per indexed HIP-4 outcome token",
    rows,
  };
  const stats = summarize(rows, generatedAt);
  const targets = ["latest", join("snapshots", date)];

  for (const target of targets) {
    await mkdir(target, { recursive: true });
    await Promise.all([
      Bun.write(
        join(target, "overview.json"),
        JSON.stringify(overview, null, 2) + "\n",
      ),
      Bun.write(join(target, "overview.csv"), toCsv(rows)),
      Bun.write(
        join(target, "stats.json"),
        JSON.stringify(stats, null, 2) + "\n",
      ),
    ]);
  }

  console.log(
    `Wrote ${rows.length.toLocaleString("en-US")} outcome-token rows for ${date}`,
  );
}

if (import.meta.main) await main();
