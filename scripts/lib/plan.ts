export interface PlanStep {
  n: number;
  actor: string;
  target: string;
  method: string;
  args: Record<string, string | number>;
  gasTgas: number;
  depositYocto: string;
  note: string;
}

export const TGAS_PAY = 100;
export const TGAS_STD = 30;

// Budget (testnet NEAR). Storage staking is 1 NEAR per 100 KB (1e19 yocto per byte).
// Stripped wasm: mock_usdc 184,202 B = 1.84 NEAR, revvault 434,499 B = 4.34 NEAR.
// Headroom for state: ~0.55 NEAR (usdc, ~55 KB) and ~0.65 NEAR (vault, ~65 KB).
// Deployer keeps the rest (about 4 NEAR of 12) for gas, NEP-145 deposits and sub-account funding.
export const NEAR_USDC_INITIAL = "2.4";
export const NEAR_VAULT_INITIAL = "5";
export const NEAR_BIZ_INITIAL = "0.2";
export const NEAR_SMALL_INITIAL = "0.05";
export const MIN_DEPLOYER_RESERVE_NEAR = 1.5;

export interface Ids {
  revvault: string;
  usdc: string;
  vendors: string[];
  biz: string;
  bizCreator: string;
  payer: string;
}

export function accountIds(deployer: string): Ids {
  return {
    revvault: `revvault.${deployer}`,
    usdc: `usdc.${deployer}`,
    vendors: ["gpu-provider", "llm-api", "data-feed"].map((v) => `${v}.${deployer}`),
    biz: `biz-agent.${deployer}`,
    bizCreator: `biz-creator.${deployer}`,
    payer: `payer.${deployer}`,
  };
}

export function deployerFromEnv(): string {
  const value = process.env.NEAR_DEPLOYER_ACCOUNT_ID;
  return value !== undefined && value.length > 0 ? value : "<deployer>.testnet";
}

export function printPlan(title: string, steps: PlanStep[]): void {
  console.log(title);
  console.log("DRY RUN: nothing was signed, sent or created. No keys were read.");
  for (const step of steps) {
    console.log("");
    console.log(`${String(step.n).padStart(2, "0")}. ${step.actor} -> ${step.target}.${step.method}`);
    console.log(`    args: ${JSON.stringify(step.args)}`);
    console.log(`    gas: ${step.gasTgas} Tgas, deposit: ${step.depositYocto} yoctoNEAR`);
    console.log(`    ${step.note}`);
  }
}

export function refuseLive(script: string): never {
  console.error(`${script}: refusing to run. Use --dry-run (default plan only) or --live (testnet only, needs ~/.config/revvault/deployer.json).`);
  process.exit(2);
}
