import { accountIds, deployerFromEnv, printPlan, refuseLive, TGAS_PAY, TGAS_STD } from "./lib/plan.ts";
import type { PlanStep } from "./lib/plan.ts";

const dry = process.argv.includes("--dry-run");
const liveRun = process.argv.includes("--live");
if (dry === liveRun) refuseLive("scripts/seed");
const net = process.argv.find((a) => a.startsWith("--network="))?.slice(10);
if (net !== undefined && net !== "testnet") {
  console.error(`scripts/seed: refusing network "${net}". Testnet only.`);
  process.exit(2);
}

const deployer = deployerFromEnv();
const ids = accountIds(deployer);
const U = (n: number): string => `${n}000000`;
const steps: PlanStep[] = [];
let n = 0;
const add = (actor: string, target: string, method: string, args: Record<string, string | number>, gas: number, deposit: string, note: string): void => {
  n += 1;
  steps.push({ n, actor, target, method, args, gasTgas: gas, depositYocto: deposit, note });
};

const storage = "1250000000000000000000";
for (const account of [ids.revvault, ids.biz, ids.bizCreator, ids.payer, deployer, ...ids.vendors]) {
  add(deployer, ids.usdc, "storage_deposit", { account_id: account, registration_only: "true" }, TGAS_STD, storage, "Register the account on mock USDC (NEP-145).");
}
add(deployer, ids.usdc, "mint", { account_id: deployer, amount: U(10000) }, TGAS_STD, "0", "Faucet mint, at most 10,000 USDC per call.");
add(deployer, ids.usdc, "ft_transfer_call", { receiver_id: ids.revvault, amount: U(10000), msg: '{"action":"lp_deposit"}' }, TGAS_PAY, "1", "LP seed deposit into the vault (testnet liquidity).");
add(ids.biz, ids.revvault, "register_business", { kind: "agent" }, TGAS_STD, "0", "Agent business registers itself.");
add(deployer, ids.usdc, "mint", { account_id: ids.payer, amount: U(2400) }, TGAS_STD, "0", "Mint the payer 2,400 mock USDC.");
for (const [i, amount] of [800, 800, 800].entries()) {
  add(ids.payer, ids.usdc, "ft_transfer_call", { receiver_id: ids.revvault, amount: U(amount), msg: `{"action":"pay","biz":"${ids.biz}","ref":"seed-${i + 1}"}` }, TGAS_PAY, "1", "Routes revenue through the pay link; this is the only thing that counts as collateral.");
}

if (dry) {
  printPlan(`RevVault testnet seed plan for ${deployer}`, steps);
  console.log("");
  console.log("Seeded revenue lands on the chain's current day in one go (block time cannot be backdated), so on-chain history is");
  console.log("seeded demo revenue, not live history. The 30-day shaped history lives in deployments/history/*.json (source: fixture).");
} else {
  await liveSeed();
}

async function liveSeed(): Promise<void> {
  const { call, parseRes, connectLive, explorerTx, fmtErr, view, writeJson, readJson, root } = await import("./lib/live.ts");
  const { resolve } = await import("node:path");
  const L = await connectLive();
  const ids2 = accountIds(L.deployer);
  const dep = L.account(L.deployer);
  const payer = L.account(ids2.payer);
  const agent = L.account(ids2.biz);
  const creator = L.account(ids2.bizCreator);
  const dpath = resolve(root, "deployments/testnet.json");
  const dj = readJson<Record<string, unknown>>(dpath);
  if (dj === undefined) throw new Error("deployments/testnet.json missing: run scripts/deploy.ts --live first");
  const txs: Record<string, string> = {};
  const rec = (k: string, r: { hash: string }): void => { txs[k] = r.hash; };
  const usdc = ids2.usdc;
  const vault = ids2.revvault;
  const pay = (biz: string, amount: number, ref: string) =>
    call(payer, usdc, "ft_transfer_call", { receiver_id: vault, amount: U(amount), msg: JSON.stringify({ action: "pay", biz, ref }) }, 100, "1");
  try {
    // 0. gas top-ups: a call reserves gas x price up front (100 Tgas is about 0.1 NEAR, unused part is refunded)
    const { actions } = await import("near-api-js");
    const { accountInfo, nearToYocto } = await import("./lib/live.ts");
    for (const [id, want] of [[ids2.payer, "0.5"], [ids2.biz, "0.35"], [ids2.bizCreator, "0.35"]] as const) {
      const have = BigInt((await accountInfo(id))?.amount ?? "0");
      if (have < nearToYocto(want)) {
        const r = await dep.signAndSendTransaction({ receiverId: id, actions: [actions.transfer(nearToYocto(want) - have)] });
        console.log(`  top-up ${id} to ${want} NEAR tx ${parseRes(r).hash}`);
      }
    }
    // 1. register on mock USDC
    const bounds = await view<{ min: string }>(L, usdc, "storage_balance_bounds");
    for (const a of [vault, ids2.biz, ids2.bizCreator, ids2.payer, L.deployer, ...ids2.vendors]) {
      const bal = await view<unknown>(L, usdc, "storage_balance_of", { account_id: a });
      if (bal !== null) continue;
      rec(`storage_deposit:${a}`, await call(dep, usdc, "storage_deposit", { account_id: a, registration_only: true }, TGAS_STD, bounds.min));
    }
    // 2. LP deposit
    const lp0 = await view<{ shares: string }>(L, vault, "get_lp", { account: L.deployer });
    if (lp0.shares === "0") {
      rec("mint:lp", await call(dep, usdc, "mint", { account_id: L.deployer, amount: U(10000) }, TGAS_STD));
      rec("lp_deposit", await call(dep, usdc, "ft_transfer_call", { receiver_id: vault, amount: U(10000), msg: '{"action":"lp_deposit"}' }, 150, "1"));
    } else console.log("skip LP deposit (already has shares)");
    // 3. register businesses
    for (const [acct, kind] of [[agent, "agent"], [creator, "creator"]] as const) {
      rec(`register:${acct.accountId}`, await call(acct, vault, "register_business", { kind }, TGAS_STD)); // idempotent
    }
    // 4. routed revenue
    const ca = await view<{ trailing_revenue: string }>(L, vault, "get_credit", { account: ids2.biz });
    if (ca.trailing_revenue === "0") {
      rec("mint:payer", await call(dep, usdc, "mint", { account_id: ids2.payer, amount: U(3600) }, TGAS_STD));
      for (let i = 1; i <= 3; i++) rec(`pay:agent:${i}`, await pay(ids2.biz, 800, `seed-${i}`));
      for (let i = 1; i <= 3; i++) rec(`pay:creator:${i}`, await pay(ids2.bizCreator, 400, `seed-c${i}`));
    } else console.log("skip routed payments (revenue exists)");
    console.log("agent credit  :", JSON.stringify(await view(L, vault, "get_credit", { account: ids2.biz })));
    console.log("creator credit:", JSON.stringify(await view(L, vault, "get_credit", { account: ids2.bizCreator })));
    // 5. draws
    const loansA = await view<{ id: string }[]>(L, vault, "get_loans", { account: ids2.biz });
    if (loansA.length === 0) {
      const d = await call(agent, vault, "request_draw", { amount: U(500), vendor: ids2.vendors[0], memo: "GPU credits (seed demo)" }, 100);
      rec("draw:agent", d);
      console.log("  agent draw returned loan id:", JSON.stringify(d.value));
      if (d.value === null) throw new Error("vendor transfer failed, draw returned null");
      rec("repay_share:agent", await call(agent, vault, "set_repay_share", { bps: 9000 }, TGAS_STD));
      console.log("agent notes (open) :", JSON.stringify(await view(L, vault, "get_notes", { account: ids2.biz })));
      // 6. repay via routed payment
      rec("pay:agent:repay", await pay(ids2.biz, 800, "seed-repay"));
    } else console.log("skip agent draw (loan exists)");
    const loansC = await view<{ id: string }[]>(L, vault, "get_loans", { account: ids2.bizCreator });
    if (loansC.length === 0) {
      const d = await call(creator, vault, "request_draw", { amount: U(200), vendor: ids2.vendors[2], memo: "Data feed (seed demo)" }, 100);
      rec("draw:creator", d);
      console.log("  creator draw returned loan id:", JSON.stringify(d.value));
    } else console.log("skip creator draw (loan exists)");
    // 7. results
    const notesA = await view<{ id: string }[]>(L, vault, "get_notes", { account: ids2.biz });
    const notesC = await view<{ id: string }[]>(L, vault, "get_notes", { account: ids2.bizCreator });
    console.log("agent notes   :", JSON.stringify(notesA));
    console.log("creator notes :", JSON.stringify(notesC));
    console.log("agent loans   :", JSON.stringify(await view(L, vault, "get_loans", { account: ids2.biz })));
    console.log("vault stats   :", JSON.stringify(await view(L, vault, "get_vault_stats")));
    console.log("lp            :", JSON.stringify(await view(L, vault, "get_lp", { account: L.deployer })));
    console.log("usdc balances : vendor gpu", await view(L, usdc, "ft_balance_of", { account_id: ids2.vendors[0] }), "vendor data", await view(L, usdc, "ft_balance_of", { account_id: ids2.vendors[2] }), "biz-agent", await view(L, usdc, "ft_balance_of", { account_id: ids2.biz }));
    const prev = ((dj["seed"] ?? {}) as { txs?: Record<string, string> }).txs ?? {};
    dj["seed"] = { seeded_at: new Date().toISOString(), note_ids: { agent: notesA.map((n) => n.id), creator: notesC.map((n) => n.id) }, txs: { ...prev, ...txs }, explorer: Object.fromEntries(Object.entries({ ...prev, ...txs }).map(([k, h]) => [k, explorerTx(h)])) };
    writeJson(dpath, dj);
    console.log("updated deployments/testnet.json (seed section)");
  } catch (e) {
    console.error(`SEED STOPPED (no retry): ${fmtErr(e)}`);
    console.error("progress so far:", JSON.stringify(txs));
    const prevF = (dj["seed"] ?? {}) as Record<string, unknown>;
    dj["seed"] = { ...prevF, partial: true, txs: { ...((prevF["txs"] as Record<string, string> | undefined) ?? {}), ...txs } };
    writeJson(dpath, dj);
    process.exit(1);
  }
}
