// Live testnet helpers. Reads the throwaway deployer key file in-process only; never prints it.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { Account, JsonRpcProvider, KeyPair } from "near-api-js";
import type { KeyPairString } from "near-api-js";

export const RPC_URL = "https://test.rpc.fastnear.com";
export const KEY_FILE = resolve(homedir(), ".config/revvault/deployer.json");
export const EXPLORER = "https://explorer.testnet.near.org";
export const root = resolve(import.meta.dirname, "../..");

export interface Live {
  deployer: string;
  provider: JsonRpcProvider;
  secret: KeyPairString;
  publicKey: string;
  account: (id: string) => Account;
}

export interface RpcBody {
  error?: unknown;
  result?: { chain_id?: string; permission?: string; error?: string; amount?: string; code_hash?: string; storage_usage?: number };
}

export async function rpcRaw(method: string, params: unknown): Promise<RpcBody> {
  const res = await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return (await res.json()) as RpcBody;
}

export async function connectLive(): Promise<Live> {
  const raw = JSON.parse(readFileSync(KEY_FILE, "utf8")) as Record<string, unknown>;
  const network = raw["network"];
  const fileId = raw["account_id"];
  // The file's account_id may be an implicit id; the named account is passed via --deployer=<id>.testnet or NEAR_DEPLOYER_ACCOUNT_ID
  // and is accepted only if the file's public key is a full-access key on it (verified on chain below).
  const named = process.argv.find((a) => a.startsWith("--deployer="))?.slice(11) ?? process.env.NEAR_DEPLOYER_ACCOUNT_ID;
  const deployer = named !== undefined && named.length > 0 ? named : fileId;
  const secret = raw["private_key"];
  const pub = raw["public_key"];
  if (network !== "testnet") throw new Error(`refusing: key file network is not testnet`);
  if (typeof deployer !== "string" || !deployer.endsWith(".testnet")) throw new Error("refusing: deployer account must end with .testnet");
  if (typeof secret !== "string" || typeof pub !== "string") throw new Error("key file malformed");
  const derived = KeyPair.fromString(secret as KeyPairString).getPublicKey().toString();
  if (derived !== pub) throw new Error("key file public_key does not match private_key");
  const status = await rpcRaw("status", []);
  const chain = status?.result?.chain_id;
  if (chain !== "testnet") throw new Error(`refusing: RPC ${RPC_URL} reports chain_id=${String(chain)}`);
  const provider = new JsonRpcProvider({ url: RPC_URL });
  const ak = await rpcRaw("query", { request_type: "view_access_key", finality: "final", account_id: deployer, public_key: pub });
  if (ak?.result?.permission !== "FullAccess") throw new Error(`refusing: file key is not a full-access key on ${deployer}`);
  return { deployer, provider, secret: secret as KeyPairString, publicKey: pub, account: (id) => new Account(id, provider, secret as KeyPairString) };
}

export function assertTestnet(id: string): void {
  if (!id.endsWith(".testnet")) throw new Error(`refusing non-testnet account ${id}`);
}

export function fmtErr(e: unknown): string {
  const anyE = e as { message?: string; type?: string; data?: unknown; context?: unknown };
  let extra = "";
  try { extra = JSON.stringify({ type: anyE.type, data: anyE.data, context: anyE.context }, (_k, v) => (typeof v === "bigint" ? v.toString() : v)).slice(0, 3000); } catch { /* ignore */ }
  return `${anyE.message ?? String(e)} ${extra}`;
}

export interface TxResult { hash: string; value: unknown; failures: string[] }

export interface TxLike {
  status?: unknown;
  transaction?: { hash?: string };
  transaction_outcome?: { id?: string };
  receipts_outcome?: { outcome?: { status?: unknown; executor_id?: string } }[];
}

export function failureOf(status: unknown): unknown {
  return status !== null && typeof status === "object" && "Failure" in status ? (status as { Failure: unknown }).Failure : undefined;
}

function collectFailures(res: TxLike): string[] {
  const out: string[] = [];
  const txFail = failureOf(res.status);
  if (txFail !== undefined) out.push(`tx: ${JSON.stringify(txFail)}`);
  for (const r of res.receipts_outcome ?? []) {
    const f = failureOf(r.outcome?.status);
    if (f !== undefined) out.push(`receipt ${String(r.outcome?.executor_id)}: ${JSON.stringify(f)}`);
  }
  return out;
}

export function parseRes(res: TxLike): TxResult {
  const sv = (res.status as { SuccessValue?: unknown } | undefined)?.SuccessValue;
  let value: unknown = undefined;
  if (typeof sv === "string" && sv.length > 0) {
    const text = Buffer.from(sv, "base64").toString("utf8");
    try { value = JSON.parse(text); } catch { value = text; }
  }
  return { hash: String(res.transaction?.hash ?? res.transaction_outcome?.id ?? "?"), value, failures: collectFailures(res) };
}

export async function call(acct: Account, contractId: string, methodName: string, args: Record<string, unknown>, gasTgas: number, depositYocto = "0"): Promise<TxResult> {
  assertTestnet(contractId);
  const res = await acct.callFunctionRaw({ contractId, methodName, args, gas: BigInt(gasTgas) * 10n ** 12n, deposit: BigInt(depositYocto), waitUntil: "FINAL" });
  const r = parseRes(res);
  if (r.failures.length > 0) throw new Error(`${acct.accountId} -> ${contractId}.${methodName} failed (tx ${r.hash}): ${r.failures.join(" | ")}`);
  console.log(`  ${methodName} ${contractId} tx ${r.hash}`);
  return r;
}

export async function view<T>(live: Live, contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await live.provider.callFunction({ contractId, method, args })) as T;
}

export async function viewMaybe<T>(live: Live, contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T | undefined> {
  try { return await view<T>(live, contractId, method, args); } catch { return undefined; }
}

export interface AccountInfo { amount: string; code_hash: string; storage_usage: number }
export async function accountInfo(id: string): Promise<AccountInfo | undefined> {
  const r = await rpcRaw("query", { request_type: "view_account", finality: "final", account_id: id });
  if (r.error !== undefined || r.result?.error !== undefined) return undefined;
  return r.result as unknown as AccountInfo;
}

export const ZERO_HASH = "11111111111111111111111111111111";

export function sha58(buf: Uint8Array): string {
  const digest = createHash("sha256").update(buf).digest();
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = BigInt("0x" + digest.toString("hex"));
  let out = "";
  while (n > 0n) { out = alphabet[Number(n % 58n)] + out; n /= 58n; }
  return out;
}

export function nearToYocto(n: string): bigint {
  const [w = "0", f = ""] = n.split(".");
  return BigInt(w) * 10n ** 24n + BigInt(f.padEnd(24, "0").slice(0, 24));
}
export const yoctoToNear = (y: bigint | string): string => { const v = BigInt(y); return `${v / 10n ** 24n}.${(v % 10n ** 24n).toString().padStart(24, "0").slice(0, 4)}`; };

export function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}
export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
export const explorerTx = (h: string): string => `${EXPLORER}/transactions/${h}`;
export const explorerAcct = (a: string): string => `${EXPLORER}/accounts/${a}`;
