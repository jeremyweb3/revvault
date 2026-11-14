import { asArray, asBig, asNumber, asObject, asString, readJson, usdc } from "./lib/fixtures.ts";

const BPS = 10_000n;

function limitOf(routed: bigint, advanceBps: bigint, cap: bigint): bigint {
  if (routed === 0n) {
    return 0n;
  }
  const raw = (routed * advanceBps) / BPS;
  return raw < cap ? raw : cap;
}

function mulUp(amount: bigint, bps: bigint): bigint {
  return (amount * bps + BPS - 1n) / BPS;
}

function estDays(debtLeft: bigint, routed: bigint, windowDays: bigint, splitBps: bigint): bigint | null {
  if (debtLeft === 0n || routed === 0n || splitBps === 0n) {
    return null;
  }
  const numerator = debtLeft * windowDays * BPS;
  const denominator = routed * splitBps;
  return (numerator + denominator - 1n) / denominator;
}

function check(label: string, actual: bigint | string, expected: bigint | string): void {
  if (actual !== expected) {
    console.error(`MISMATCH ${label}: got ${String(actual)} expected ${String(expected)}`);
    process.exit(1);
  }
}

function runMock(): void {
  const vectors = asArray(readJson("contracts/fixtures/math-vectors.json"), "math-vectors");
  const golden = vectors
    .map((v) => asObject(v, "vector"))
    .find((v) => v.name === "golden-demo-agent");
  if (golden === undefined) {
    throw new Error("golden-demo-agent vector not found");
  }
  const params = asObject(golden.params, "params");
  const expect = asObject(golden.expect, "expect");
  const steps = asArray(asObject(golden.action, "action").steps, "steps").map((s) => asObject(s, "step"));
  const feeBps = BigInt(asNumber(params.fee_bps, "fee_bps"));
  const cap = asBig(params.per_biz_cap, "per_biz_cap");
  const windowDays = BigInt(asNumber(params.window_days, "window_days"));
  const advanceBps = BigInt(asNumber(params.advance_bps, "advance_bps"));
  const splitBps = BigInt(asNumber(params.split_bps, "split_bps"));
  let routed = asBig(params.routed_30d, "routed_30d");
  const cash = asBig(params.vault_cash, "vault_cash");

  console.log("RevVault demo agent (MOCK, offline, no network, no keys)");
  console.log("All numbers are mock USDC from contracts/fixtures/math-vectors.json. Testnet only, unaudited, mock USDC is not money.");
  console.log("Only revenue routed through the RevVault pay link counts as collateral. Repayment is economic, not legal.");
  console.log("");
  console.log("Business: biz-agent.testnet (kind agent), split 20%, term 60 days");
  console.log(`Vault cash: ${usdc(cash)} USDC`);
  console.log(`Routed in last 30 days: ${usdc(routed)} USDC`);

  let limit = limitOf(routed, advanceBps, cap);
  check("limit_before", limit.toString(), asString(expect.limit_before, "limit_before"));
  console.log(`Credit limit: ${usdc(limit)} USDC (min(${usdc(routed)} x 40%, cap ${usdc(cap)}))`);

  let debt = 0n;
  let principal = 0n;
  let noteStatus = "none";
  let payIndex = 0;
  const repays = asArray(expect.repays, "repays").map((r, i) => asString(r, `repays[${i}]`));
  const debts = asArray(expect.debt_left, "debt_left").map((r, i) => asString(r, `debt_left[${i}]`));

  for (const step of steps) {
    const op = asString(step.op, "op");
    const amount = asBig(step.amount, "amount");
    if (op === "draw") {
      const available = limit - debt;
      if (amount > available || amount > cash) {
        throw new Error("draw exceeds available credit");
      }
      const fee = mulUp(amount, feeBps);
      principal = amount;
      debt = amount + fee;
      noteStatus = "open";
      const availableAfter = limit - debt;
      check("available_after_draw", availableAfter.toString(), asString(expect.available_after_draw, "available_after_draw"));
      console.log("");
      console.log(`Agent draws ${usdc(amount)} USDC to GPU-Provider (Paid (mock))`);
      console.log(`  fee ${usdc(fee)} (3% flat, rounded up), debt ${usdc(debt)}`);
      console.log(`  note ln_001 minted, status open, held by the vault (not transferable)`);
      console.log(`  available now ${usdc(availableAfter)} USDC`);
      console.log(`  est. days to clear at current routing: ${String(estDays(debt, routed, windowDays, splitBps))}`);
    } else if (op === "pay") {
      const repay = (() => {
        const slice = mulUp(amount, splitBps);
        return slice < debt ? slice : debt;
      })();
      const toBiz = amount - repay;
      debt -= repay;
      routed += amount;
      check(`repay[${payIndex}]`, repay.toString(), repays[payIndex] ?? "");
      check(`debt_left[${payIndex}]`, debt.toString(), debts[payIndex] ?? "");
      payIndex += 1;
      console.log("");
      console.log(`Customer pays ${usdc(amount)} USDC through the pay link`);
      console.log(`  20% to repay: ${usdc(repay)}, to business: ${usdc(toBiz)}, debt left ${usdc(debt)}`);
      if (debt === 0n) {
        noteStatus = "settled";
        console.log("  loan closed, note ln_001 settled");
      }
    } else {
      throw new Error(`unknown op ${op}`);
    }
  }

  limit = limitOf(routed, advanceBps, cap);
  check("limit_after", limit.toString(), asString(expect.limit_after, "limit_after"));
  check("principal", principal.toString(), "500000000");
  check("note", noteStatus, "settled");
  console.log("");
  console.log(`Routed in last 30 days: ${usdc(routed)} USDC`);
  console.log(`Credit limit grew from 960 to ${usdc(limit)} USDC, available ${usdc(limit - debt)}`);
  console.log("");
  console.log("Golden story reproduced from fixtures. Mode: mock. No testnet call, no NEAR Intents call was made.");
}

function runTestnet(): void {
  console.error("testnet mode is not implemented in this build.");
  console.error("It needs an owner-funded throwaway testnet account and deployed contracts (see scripts/deploy.ts --dry-run).");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.includes("--testnet")) {
  runTestnet();
} else if (args.includes("--mock") || args.length === 0) {
  runMock();
} else {
  console.error("usage: scripts/agent [--mock]");
  process.exit(64);
}
