import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { asArray, asObject, asString, repoRoot } from "../lib/fixtures.ts";
import type { Json, JsonObject } from "../lib/fixtures.ts";

const BASE_URL = "https://1click.chaindefuser.com";
const AMOUNT_IN = "500000000";
const PLACEHOLDER_RECIPIENT = "0x1111111111111111111111111111111111111111";
const PLACEHOLDER_REFUND = "0000000000000000000000000000000000000000000000000000000000000000";

interface Preview {
  generatedAt: string;
  mainnet: true;
  noFundsMoved: true;
  tokensCount: number;
  quote: {
    originAsset: string;
    destinationAsset: string;
    amountIn: string;
    amountOut: string;
    fee?: string;
    etaSeconds?: number;
    dry: true;
  } | null;
  error: string | null;
}

function findToken(tokens: JsonObject[], symbol: string, blockchain: string): JsonObject | undefined {
  return tokens.find((t) => asString(t.symbol, "symbol").toUpperCase() === symbol && t.blockchain === blockchain);
}

async function getJson(url: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as Json;
}

async function main(): Promise<Preview> {
  const preview: Preview = {
    generatedAt: new Date().toISOString(),
    mainnet: true,
    noFundsMoved: true,
    tokensCount: 0,
    quote: null,
    error: null,
  };
  try {
    const tokens = asArray(await getJson(`${BASE_URL}/v0/tokens`), "tokens").map((t) => asObject(t, "token"));
    preview.tokensCount = tokens.length;
    const origin = findToken(tokens, "USDC", "near");
    const destination = findToken(tokens, "USDC", "base");
    if (origin === undefined || destination === undefined) {
      throw new Error("USDC on near or base not found in /v0/tokens");
    }
    const originAsset = asString(origin.assetId, "assetId");
    const destinationAsset = asString(destination.assetId, "assetId");
    const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const body = {
      dry: true,
      swapType: "EXACT_INPUT",
      originAsset,
      destinationAsset,
      amount: AMOUNT_IN,
      recipient: PLACEHOLDER_RECIPIENT,
      refundTo: PLACEHOLDER_REFUND,
      recipientType: "DESTINATION_CHAIN",
      refundType: "ORIGIN_CHAIN",
      depositType: "ORIGIN_CHAIN",
      slippageTolerance: 100,
      deadline,
    };
    const response = asObject(
      await getJson(`${BASE_URL}/v0/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      "quote response",
    );
    const quote = asObject(response.quote, "quote");
    preview.quote = {
      originAsset,
      destinationAsset,
      amountIn: asString(quote.amountIn, "amountIn"),
      amountOut: asString(quote.amountOut, "amountOut"),
      dry: true,
    };
    if (typeof quote.timeEstimate === "number") {
      preview.quote.etaSeconds = quote.timeEstimate;
    }
  } catch (error) {
    preview.quote = null;
    preview.error = error instanceof Error ? error.message : String(error);
  }
  return preview;
}

const result = await main();
writeFileSync(join(repoRoot, "deployments", "intents-preview.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log("Mainnet quote preview, no funds moved (unauthenticated dry quote, no deposit address requested).");
console.log(JSON.stringify(result, null, 2));
if (result.error !== null) {
  process.exitCode = 1;
}
