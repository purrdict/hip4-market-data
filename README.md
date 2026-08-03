# Purrdict HIP-4 Market Data

Open, dated snapshots of independently indexed [HIP-4 prediction-market](https://www.purrdict.xyz/hip4/) activity on Hyperliquid.

This repository is published by [Purrdict](https://www.purrdict.xyz/), an independent HIP-4 trading, launch, and developer platform. It provides a reproducible distribution of the data behind the [Purrdict HIP-4 market-data report](https://www.purrdict.xyz/hip4-market-data/).

## Latest snapshot

- [Overview rows (JSON)](latest/overview.json)
- [Overview rows (CSV)](latest/overview.csv)
- [Aggregate statistics (JSON)](latest/stats.json)
- [Dated archive](snapshots/)

Each row represents one HIP-4 outcome token, such as `#1731`. It does **not** represent one unique prediction-market question: binary questions normally create two outcome tokens, while multi-outcome questions create more.

Available fields:

| Field          | Meaning                                   |
| -------------- | ----------------------------------------- |
| `coin`         | HIP-4 outcome-token identifier            |
| `market_class` | Defensively parsed market class           |
| `underlying`   | Parsed underlying asset, when available   |
| `period`       | Parsed recurrence period, when available  |
| `target_price` | Parsed target price, when available       |
| `market_name`  | Human-readable outcome label              |
| `trades`       | Cumulative indexed fill count for the row |
| `traders`      | Distinct indexed addresses for the row    |
| `volume`       | Cumulative indexed notional for the row   |
| `avg_px`       | Average indexed execution price           |

## Methodology

1. Purrdict indexes public HIP-4 fills and preserves the protocol's outcome-token identifiers.
2. The public overview API groups cumulative fills, notional, row-level traders, and average price by outcome token.
3. Known description shapes are parsed into market classes. Missing or ambiguous metadata remains unclassified.
4. The snapshot script validates numeric fields, sorts rows deterministically, and emits JSON, CSV, and transparent aggregate statistics.

Source API: [`https://api.purrdict.xyz/api/markets/overview`](https://api.purrdict.xyz/api/markets/overview)

## Important limitations

- Cumulative notional is not current liquidity, TVL, open interest, or an execution quote.
- Row-level trader counts overlap; summing them would not produce protocol-wide unique traders.
- Outcome-token row counts are not unique-question counts.
- Totals include only successfully indexed records; no estimate is added for missing intervals.
- Historical average prices and volume do not predict future results.

For current prices and executable order-book depth, use [Purrdict](https://app.purrdict.xyz/) or query Hyperliquid directly.

## Reproduce a snapshot

```bash
bun run snapshot
```

The script requires Bun and writes both `latest/` and `snapshots/YYYY-MM-DD/` from the public API. A scheduled GitHub Actions workflow refreshes the repository weekly.

## Citation

Suggested attribution:

> Purrdict HIP-4 Market Data, dated snapshot, https://github.com/purrdict/hip4-market-data

Link to the [methodology report](https://www.purrdict.xyz/hip4-market-data/) when publishing derived figures so readers receive the limitations alongside the data.

## Publisher and independence

Purrdict also publishes the [`@purrdict/hip4` TypeScript SDK](https://www.npmjs.com/package/@purrdict/hip4), the [HIP-4 UI registry](https://ui.purrdict.xyz/), and the independent [hip4.fun protocol reference](https://hip4.fun/).

Neither this repository nor Purrdict is affiliated with, endorsed by, or operated by Hyperliquid Labs.

Data and documentation in this repository are licensed under [CC BY 4.0](LICENSE).
