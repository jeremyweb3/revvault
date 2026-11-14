import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { accountIds, deployerFromEnv, MIN_DEPLOYER_RESERVE_NEAR, NEAR_BIZ_INITIAL, NEAR_SMALL_INITIAL, NEAR_USDC_INITIAL, NEAR_VAULT_INITIAL, printPlan, refuseLive, TGAS_STD } from "./lib/plan.ts";
import type { PlanStep } from "./lib/plan.ts";

const dry = process.argv.includes("--dry-run");
const live = process.argv.includes("--live");
if (dry === live) refuseLive("scripts/deploy"); // exactly one of --dry-run / --live
const net = process.argv.find((a) => a.startsWith("--network="))?.slice(10);
if (net !== undefined && net !== "testnet") {
  console.error(`scripts/deploy: refusing network "${net}". Testnet only.`);
  process.exit(2);
}

const wasmDir = "target/mvp/deploy";
const yocto = (near: string): string => (BigInt(Math.round(Number(near) * 1e6)) * 10n ** 18n).toString();

if (dry) {
  const deployer = deployerFromEnv();
  const ids = accountIds(deployer);
  const steps: PlanStep[] = [
    { n: 1, actor: deployer, target: ids.usdc, method: "(create sub-account, add key)", args: { initial_balance_near: NEAR_USDC_INITIAL }, gasTgas: 0, depositYocto: yocto(NEAR_USDC_INITIAL), note: "Sub-account of the throwaway deployer, deployer public key added as full access. Covers 184 KB code (1.84 NEAR) plus state headroom." },
    { n: 2, actor: deployer, target: ids.usdc, method: "(deploy contract)", args: { wasm: `${wasmDir}/mock_usdc.wasm` }, gasTgas: TGAS_STD, depositYocto: "0", note: "Mock USDC, 6 decimals. Not money." },
    { n: 3, actor: deployer, target: ids.usdc, method: "new", args: {}, gasTgas: TGAS_STD, depositYocto: "0", note: "Initialise mock USDC." },
    { n: 4, actor: deployer, target: ids.revvault, method: "(create sub-account, add key)", args: { initial_balance_near: NEAR_VAULT_INITIAL }, gasTgas: 0, depositYocto: yocto(NEAR_VAULT_INITIAL), note: "Covers 434 KB code (4.34 NEAR) plus state headroom." },
    { n: 5, actor: deployer, target: ids.revvault, method: "(deploy contract)", args: { wasm: `${wasmDir}/revvault.wasm` }, gasTgas: TGAS_STD, depositYocto: "0", note: "RevVault pool, notes and rvUSDC share ledger." },
    { n: 6, actor: deployer, target: ids.revvault, method: "new", args: { owner: deployer, token: ids.usdc }, gasTgas: TGAS_STD, depositYocto: "0", note: "Initialise the vault with the mock USDC account as the only accepted token." },
    { n: 7, actor: deployer, target: "(demo sub-accounts)", method: "(create sub-account, add key)", args: { biz: NEAR_BIZ_INITIAL, vendors_and_payer: NEAR_SMALL_INITIAL }, gasTgas: 0, depositYocto: "0", note: `${ids.biz}, ${ids.bizCreator}, ${ids.payer}, ${ids.vendors.join(", ")}. Budget: deployer keeps at least ${MIN_DEPLOYER_RESERVE_NEAR} NEAR for gas.` },
    { n: 8, actor: "(R3)", target: "deployments/testnet.json", method: "(write ids)", args: { revvault: ids.revvault, usdc: ids.usdc }, gasTgas: 0, depositYocto: "0", note: "Written only after a real deploy succeeds; never invented. Not written in a dry run." },
  ];
  printPlan(`RevVault testnet deploy plan for ${deployer}`, steps);
  console.log("");
  console.log("Build first (one heavy compile at a time): contracts/build-wasm.sh. Live run: node scripts/deploy.ts --live");
} else {
  const { assertTestnet, failureOf, parseRes, accountInfo, call, connectLive, explorerAcct, explorerTx, fmtErr, nearToYocto, readJson, root, sha58, view, viewMaybe, writeJson, yoctoToNear, ZERO_HASH } = await import("./lib/live.ts");
  const L = await connectLive();
  const ids = accountIds(L.deployer);
  for (const id of [ids.usdc, ids.revvault, ids.biz, ids.bizCreator, ids.payer, ...ids.vendors]) assertTestnet(id);
  const progressPath = resolve(root, "deployments/.testnet-progress.json");
  const progress = readJson<Record<string, string>>(progressPath) ?? {};
  const save = (k: string, h: string): void => { progress[k] = h; writeJson(progressPath, progress); };
  const dep = L.account(L.deployer);
  const start = await accountInfo(L.deployer);
  console.log(`chain testnet, deployer ${L.deployer}, balance ${yoctoToNear(start?.amount ?? "0")} NEAR`);

  const ensureAccount = async (id: string, near: string): Promise<void> => {
    if ((await accountInfo(id)) !== undefined) { console.log(`skip create ${id} (exists)`); return; }
    const res = await dep.createSubAccount({ accountOrPrefix: id, publicKey: L.publicKey, nearToTransfer: nearToYocto(near) });
    const hash = parseRes(res).hash;
    const fail = failureOf(res.status);
    if (fail !== undefined) throw new Error(`create ${id} failed: ${JSON.stringify(fail)}`);
    save(`create:${id}`, hash);
    console.log(`created ${id} with ${near} NEAR, tx ${hash}`);
  };
  const ensureCode = async (id: string, file: string): Promise<void> => {
    const code = readFileSync(resolve(root, wasmDir, file));
    const want = sha58(code);
    const info = await accountInfo(id);
    if (info?.code_hash === want) { console.log(`skip deploy ${id} (code hash ${want} already there)`); return; }
    if (info !== undefined && info.code_hash !== ZERO_HASH) console.log(`WARNING: ${id} has different code ${info.code_hash}; redeploying (state is kept, no account is deleted)`);
    const res = await L.account(id).deployContract(code);
    const hash = parseRes(res).hash;
    save(`deploy:${id}`, hash);
    console.log(`deployed ${file} (${code.length} bytes) to ${id}, tx ${hash}`);
  };

  const budget = (Number(NEAR_USDC_INITIAL) + Number(NEAR_VAULT_INITIAL) + 2 * Number(NEAR_BIZ_INITIAL) + 4 * Number(NEAR_SMALL_INITIAL));
  const haveNear = Number(BigInt(start?.amount ?? "0") / 10n ** 20n) / 1e4;
  if (haveNear < budget + MIN_DEPLOYER_RESERVE_NEAR) {
    // Only matters for accounts not yet created; existing ones are skipped.
    console.log(`note: full plan needs ${budget} NEAR + ${MIN_DEPLOYER_RESERVE_NEAR} reserve, deployer has ${haveNear}`);
  }

  try {
    await ensureAccount(ids.usdc, NEAR_USDC_INITIAL);
    await ensureCode(ids.usdc, "mock_usdc.wasm");
    if ((await viewMaybe(L, ids.usdc, "ft_metadata")) === undefined) {
      const r = await call(dep, ids.usdc, "new", {}, TGAS_STD);
      save("new:usdc", r.hash);
    } else console.log("skip new usdc (initialised)");

    await ensureAccount(ids.revvault, NEAR_VAULT_INITIAL);
    await ensureCode(ids.revvault, "revvault.wasm");
    if ((await viewMaybe(L, ids.revvault, "get_owner")) === undefined) {
      const r = await call(dep, ids.revvault, "new", { owner: L.deployer, token: ids.usdc }, TGAS_STD);
      save("new:revvault", r.hash);
    } else console.log("skip new revvault (initialised)");

    for (const id of [ids.biz, ids.bizCreator]) await ensureAccount(id, NEAR_BIZ_INITIAL);
    for (const id of [ids.payer, ...ids.vendors]) await ensureAccount(id, NEAR_SMALL_INITIAL);

    const owner = await view<string>(L, ids.revvault, "get_owner");
    const meta = await view<{ symbol: string; decimals: number }>(L, ids.usdc, "ft_metadata");
    console.log(`vault owner ${owner}, usdc ${meta.symbol}/${meta.decimals}`);
    const end = await accountInfo(L.deployer);
    const out = {
      network: "testnet",
      deployer: L.deployer,
      deployed_at: new Date().toISOString(),
      contracts: { revvault: ids.revvault, usdc: ids.usdc },
      demo_accounts: { biz_agent: ids.biz, biz_creator: ids.bizCreator, payer: ids.payer, vendors: ids.vendors },
      code_hashes: { revvault: (await accountInfo(ids.revvault))?.code_hash, usdc: (await accountInfo(ids.usdc))?.code_hash },
      txs: progress,
      explorer: { revvault: explorerAcct(ids.revvault), usdc: explorerAcct(ids.usdc), txs: Object.fromEntries(Object.entries(progress).map(([k, h]) => [k, explorerTx(h)])) },
      deployer_balance_near: yoctoToNear(end?.amount ?? "0"),
    };
    writeJson(resolve(root, "deployments/testnet.json"), out);
    console.log(`wrote deployments/testnet.json; deployer balance ${out.deployer_balance_near} NEAR`);
  } catch (e) {
    console.error(`DEPLOY STOPPED (no retry): ${fmtErr(e)}`);
    process.exit(1);
  }
}
