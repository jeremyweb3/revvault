use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::{near, AccountId};

pub const NS_PER_MS: u64 = 1_000_000;
pub const NS_PER_DAY: u64 = 86_400_000_000_000;
pub const BUCKET_RETENTION_DAYS: u64 = 90;
pub const MIN_REPAY_SHARE_BPS: u32 = 1000;
pub const MAX_REPAY_SHARE_BPS: u32 = 9000;
pub const MAX_REF_LEN: usize = 64;
pub const MAX_MEMO_LEN: usize = 128;
pub const MAX_PAGE: u64 = 100;

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Agent,
    Creator,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "snake_case")]
pub enum LoanStatus {
    Open,
    PastDue,
    Settled,
    WrittenOff,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Config {
    pub advance_bps_agent: u32,
    pub advance_bps_creator: u32,
    pub per_biz_cap: U128,
    pub starter_limit: U128,
    pub fee_bps: u32,
    pub loan_term_ns: u64,
    pub grace_ns: u64,
    pub window_days: u64,
    pub repay_share_bps_default: u32,
    pub past_due_split_bps: u32,
    pub reserve_bps: u32,
    pub min_amount: U128,
    pub token: AccountId,
    pub attestor_pk: Option<Base64VecU8>,
}

#[near(serializers = [json])]
#[derive(Default)]
pub struct ParamsUpdate {
    pub advance_bps_agent: Option<u32>,
    pub advance_bps_creator: Option<u32>,
    pub per_biz_cap: Option<U128>,
    pub fee_bps: Option<u32>,
    pub loan_term_ns: Option<u64>,
    pub grace_ns: Option<u64>,
    pub repay_share_bps_default: Option<u32>,
    pub past_due_split_bps: Option<u32>,
    pub reserve_bps: Option<u32>,
    pub min_amount: Option<U128>,
}

#[near(serializers = [borsh])]
#[derive(Clone, Copy)]
pub struct Attestation {
    pub advance_bps: u32,
    pub valid_until_ms: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Business {
    pub kind: Kind,
    pub repay_share_bps: u32,
    pub paused: bool,
    pub defaulted: bool,
    pub open_loan: Option<String>,
    pub loans: Vec<String>,
    pub buckets: Vec<(u64, u128)>,
    pub attested: Option<Attestation>,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Loan {
    pub id: String,
    pub seq: u64,
    pub business: AccountId,
    pub kind: Kind,
    pub vendor: AccountId,
    pub principal: u128,
    pub fee: u128,
    pub repaid: u128,
    pub fee_repaid: u128,
    pub repay_share_bps: u32,
    pub opened_at_ns: u64,
    pub due_at_ns: u64,
    pub memo: String,
    pub status: LoanStatus,
    pub pending: bool,
}

#[near(serializers = [borsh])]
#[derive(Clone, Default)]
pub struct Accounting {
    pub cash: u128,
    pub outstanding: u128,
    pub reserve: u128,
    pub fees_retained: u128,
    pub fees_to_reserve: u128,
    pub lp_in: u128,
    pub lp_out: u128,
    pub nav_loss: u128,
}

#[near(serializers = [json])]
pub struct CreditView {
    pub limit: U128,
    pub available: U128,
    pub outstanding: U128,
    pub trailing_revenue: U128,
    pub advance_rate_bps: u32,
    pub repay_share_bps: u32,
    pub status: String,
    pub no_history: bool,
    pub kind: Kind,
    pub effective_split_bps: u32,
    pub due_at_ms: Option<u64>,
    pub past_due: bool,
    pub attested: bool,
    pub est_days_to_clear: Option<u64>,
}

#[near(serializers = [json])]
pub struct LoanView {
    pub id: String,
    pub business: AccountId,
    pub vendor: AccountId,
    pub principal: U128,
    pub fee: U128,
    pub repaid: U128,
    pub opened_at_ms: u64,
    pub due_at_ms: u64,
    pub memo: String,
    pub status: String,
}

#[near(serializers = [json])]
pub struct NoteView {
    pub id: String,
    pub business: AccountId,
    pub kind: Kind,
    pub holder: AccountId,
    pub principal: U128,
    pub fee: U128,
    pub repaid: U128,
    pub repay_share_bps: u32,
    pub minted_at_ms: u64,
    pub due_at_ms: u64,
    pub status: String,
    pub vendor: AccountId,
    pub memo: String,
}

#[near(serializers = [json])]
pub struct LedgerDay {
    pub day: String,
    pub amount: U128,
}

#[near(serializers = [json])]
pub struct VaultStats {
    pub tvl: U128,
    pub cash: U128,
    pub reserve: U128,
    pub utilisation_bps: u32,
    pub illustrative_apy_bps: u32,
    pub open_loans: u32,
    pub delinquent: u32,
    pub total_shares: U128,
}

#[near(serializers = [json])]
pub struct AccountingView {
    pub cash: U128,
    pub outstanding_principal: U128,
    pub reserve: U128,
    pub fees_retained: U128,
    pub fees_to_reserve: U128,
    pub lp_in: U128,
    pub lp_out: U128,
    pub nav_loss: U128,
    pub tracked_balance: U128,
}

#[near(serializers = [json])]
pub struct LpView {
    pub shares: U128,
    pub value: U128,
    pub earned: U128,
}

#[near(serializers = [json])]
pub struct PayReceipt {
    pub biz: AccountId,
    pub payer: AccountId,
    pub reference: String,
    pub amount: U128,
    pub repay: U128,
    pub fee_part: U128,
    pub reserve_part: U128,
    pub loan_id: Option<String>,
    pub day: u64,
    pub closed: bool,
    pub was_past_due: bool,
}

#[near(serializers = [json])]
pub struct PayMsg {
    pub action: String,
    pub biz: Option<AccountId>,
    #[serde(rename = "ref")]
    pub reference: Option<String>,
}

#[near(serializers = [json])]
pub struct AttestationPayload {
    pub biz: AccountId,
    pub advance_bps: u32,
    pub valid_until_ms: u64,
    pub nonce: u64,
}
