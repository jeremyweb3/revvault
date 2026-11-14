mod notes;
mod types;
mod util;
mod views;

use near_contract_standards::fungible_token::{FungibleToken, FungibleTokenCore};
use near_sdk::borsh::BorshSerialize;
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::serde_json::{self, json};
use near_sdk::store::{IterableMap, LookupMap, LookupSet};
use near_sdk::{
    assert_one_yocto, env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken,
    PanicOnDefault, Promise, PromiseOrValue,
};
use underwriting::{
    available as uw_available, est_days_to_clear, fee_part as uw_fee_part, fee_up,
    limit as uw_limit, mul_bps_down, repay_slice, BASE_ADVANCE_AGENT_BPS, BASE_ADVANCE_CREATOR_BPS,
    BPS,
};

pub use types::*;
use util::{add, chk, emit, loan_id, sub};

const GAS_FT_TRANSFER: Gas = Gas::from_tgas(15);
const GAS_CALLBACK: Gas = Gas::from_tgas(20);
const DAYS_60_NS: u64 = 60 * NS_PER_DAY;
const DAYS_14_NS: u64 = 14 * NS_PER_DAY;
const MAX_ATTESTATION_TTL_MS: u64 = 30 * 86_400_000;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Businesses,
    Loans,
    Shares,
    LpBasis,
    Nonces,
}

#[ext_contract(ext_ft)]
pub trait ExtFt {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct RevVault {
    pub(crate) owner: AccountId,
    pub(crate) config: Config,
    pub(crate) businesses: LookupMap<AccountId, Business>,
    pub(crate) loans: IterableMap<String, Loan>,
    pub(crate) loan_seq: u64,
    pub(crate) shares: FungibleToken,
    pub(crate) lp_basis: LookupMap<AccountId, u128>,
    pub(crate) acct: Accounting,
    pub(crate) open_loans: u32,
    pub(crate) delinquent_loans: u32,
    pub(crate) used_nonces: LookupSet<u64>,
}

impl RevVault {
    pub(crate) fn now_ns() -> u64 {
        env::block_timestamp()
    }

    pub(crate) fn today() -> u64 {
        Self::now_ns() / NS_PER_DAY
    }

    pub(crate) fn trailing(&self, biz: &Business) -> u128 {
        let today = Self::today();
        let start = today.saturating_sub(self.config.window_days.saturating_sub(1));
        biz.buckets
            .iter()
            .filter(|(day, _)| *day >= start && *day <= today)
            .fold(0u128, |acc, (_, amount)| add(acc, *amount))
    }

    pub(crate) fn base_bps(&self, kind: Kind) -> u32 {
        match kind {
            Kind::Agent => self.config.advance_bps_agent,
            Kind::Creator => self.config.advance_bps_creator,
        }
    }

    pub(crate) fn advance_bps(&self, biz: &Business) -> (u32, bool) {
        let base = self.base_bps(biz.kind);
        let now_ms = Self::now_ns() / NS_PER_MS;
        match biz.attested {
            Some(a) if a.valid_until_ms > now_ms => {
                (underwriting::clamp_attested_bps(a.advance_bps, base), true)
            }
            _ => (base, false),
        }
    }

    pub(crate) fn loan_past_due(&self, loan: &Loan) -> bool {
        match loan.status {
            LoanStatus::PastDue => true,
            LoanStatus::Open => !loan.pending && Self::now_ns() > loan.due_at_ns,
            _ => false,
        }
    }

    pub(crate) fn mark_past_due(&mut self, loan: &mut Loan) -> bool {
        if loan.status != LoanStatus::Open || loan.pending {
            return false;
        }
        loan.status = LoanStatus::PastDue;
        self.delinquent_loans = self.delinquent_loans.saturating_add(1);
        emit(
            "loan_past_due",
            json!({"biz": loan.business, "loan_id": loan.id}),
        );
        true
    }

    pub(crate) fn effective_split(&self, biz: &Business, loan: Option<&Loan>) -> u32 {
        match loan {
            Some(l) if self.loan_past_due(l) => {
                biz.repay_share_bps.max(self.config.past_due_split_bps)
            }
            _ => biz.repay_share_bps,
        }
    }

    pub(crate) fn open_loan_of(&self, biz: &Business) -> Option<Loan> {
        biz.open_loan
            .as_ref()
            .and_then(|id| self.loans.get(id))
            .cloned()
    }

    pub(crate) fn total_assets(&self) -> u128 {
        add(self.acct.cash, self.acct.outstanding)
    }

    fn new_business(&self, kind: Kind) -> Business {
        Business {
            kind,
            repay_share_bps: self.config.repay_share_bps_default,
            paused: false,
            defaulted: false,
            open_loan: None,
            loans: Vec::new(),
            buckets: Vec::new(),
            attested: None,
        }
    }

    fn credit_bucket(biz: &mut Business, day: u64, amount: u128) {
        match biz.buckets.iter_mut().find(|(d, _)| *d == day) {
            Some(entry) => entry.1 = add(entry.1, amount),
            None => biz.buckets.push((day, amount)),
        }
        biz.buckets
            .retain(|(d, _)| d.saturating_add(BUCKET_RETENTION_DAYS) >= day);
    }

    fn debit_bucket(biz: &mut Business, day: u64, amount: u128) {
        if let Some(entry) = biz.buckets.iter_mut().find(|(d, _)| *d == day) {
            entry.1 = entry.1.saturating_sub(amount);
        }
        biz.buckets.retain(|(_, a)| *a > 0);
    }

    fn lp_deposit(&mut self, sender: AccountId, amount: u128) -> PromiseOrValue<U128> {
        let refund = PromiseOrValue::Value(U128(amount));
        if amount == 0 || amount < self.config.min_amount.0 {
            return refund;
        }
        let total_shares = self.shares.total_supply;
        let minted = if total_shares == 0 {
            amount
        } else {
            let assets = self.total_assets();
            if assets == 0 {
                return refund;
            }
            chk(amount.checked_mul(total_shares))
                .checked_div(assets)
                .unwrap_or(0)
        };
        if minted == 0 {
            return refund;
        }
        if !self.shares.accounts.contains_key(&sender) {
            self.shares.internal_register_account(&sender);
        }
        self.shares.internal_deposit(&sender, minted);
        self.acct.cash = add(self.acct.cash, amount);
        self.acct.lp_in = add(self.acct.lp_in, amount);
        let basis = self.lp_basis.get(&sender).copied().unwrap_or(0);
        self.lp_basis.insert(sender.clone(), add(basis, amount));
        emit(
            "lp_deposit",
            json!({"account": sender, "amount": U128(amount), "shares": U128(minted)}),
        );
        PromiseOrValue::Value(U128(0))
    }

    fn route_payment(
        &mut self,
        payer: AccountId,
        amount: u128,
        biz_id: AccountId,
        reference: String,
    ) -> PromiseOrValue<U128> {
        let refund = PromiseOrValue::Value(U128(amount));
        if amount == 0
            || reference.len() > MAX_REF_LEN
            || payer == biz_id
            || biz_id == env::current_account_id()
            || biz_id == self.config.token
        {
            return refund;
        }
        let mut biz = match self.businesses.get(&biz_id) {
            Some(b) => b.clone(),
            None => {
                if amount < self.config.min_amount.0 {
                    return refund;
                }
                emit(
                    "business_registered",
                    json!({"biz": biz_id, "kind": Kind::Agent}),
                );
                self.new_business(Kind::Agent)
            }
        };
        let day = Self::today();
        Self::credit_bucket(&mut biz, day, amount);

        let mut repay = 0u128;
        let mut fee_part = 0u128;
        let mut reserve_part = 0u128;
        let mut receipt_loan: Option<String> = None;
        let mut closed = false;
        let mut was_past_due = false;

        if let Some(mut loan) = self.open_loan_of(&biz) {
            if !loan.pending && matches!(loan.status, LoanStatus::Open | LoanStatus::PastDue) {
                if self.loan_past_due(&loan) {
                    self.mark_past_due(&mut loan);
                    was_past_due = true;
                }
                let split = self.effective_split(&biz, Some(&loan));
                let total = add(loan.principal, loan.fee);
                let debt_left = sub(total, loan.repaid);
                repay = chk(repay_slice(amount, split, debt_left));
                if repay > 0 {
                    fee_part = chk(uw_fee_part(
                        repay,
                        loan.principal,
                        loan.fee,
                        loan.repaid,
                        loan.fee_repaid,
                    ));
                    reserve_part = chk(mul_bps_down(fee_part, self.config.reserve_bps));
                    let principal_part = sub(repay, fee_part);
                    loan.repaid = add(loan.repaid, repay);
                    loan.fee_repaid = add(loan.fee_repaid, fee_part);
                    self.acct.outstanding = sub(self.acct.outstanding, principal_part);
                    self.acct.cash = add(self.acct.cash, sub(repay, reserve_part));
                    self.acct.reserve = add(self.acct.reserve, reserve_part);
                    self.acct.fees_to_reserve = add(self.acct.fees_to_reserve, reserve_part);
                    self.acct.fees_retained =
                        add(self.acct.fees_retained, sub(fee_part, reserve_part));
                    receipt_loan = Some(loan.id.clone());
                    if loan.repaid == total {
                        closed = true;
                        loan.status = LoanStatus::Settled;
                        biz.open_loan = None;
                        self.open_loans = self.open_loans.saturating_sub(1);
                        if was_past_due {
                            self.delinquent_loans = self.delinquent_loans.saturating_sub(1);
                        }
                    }
                    let left = sub(total, loan.repaid);
                    emit(
                        "repay_applied",
                        json!({"biz": biz_id, "loan_id": loan.id, "amount": U128(repay), "debt_left": U128(left)}),
                    );
                    if closed {
                        emit("loan_closed", json!({"biz": biz_id, "loan_id": loan.id}));
                        emit("note_settled", json!({"id": loan.id}));
                    }
                }
                self.loans.insert(loan.id.clone(), loan);
            }
        }

        self.businesses.insert(biz_id.clone(), biz);
        emit(
            "payment_routed",
            json!({"biz": biz_id, "payer": payer, "amount": U128(amount), "ref": reference}),
        );

        let to_business = sub(amount, repay);
        if to_business == 0 {
            return PromiseOrValue::Value(U128(0));
        }
        let receipt = PayReceipt {
            biz: biz_id.clone(),
            payer,
            reference,
            amount: U128(amount),
            repay: U128(repay),
            fee_part: U128(fee_part),
            reserve_part: U128(reserve_part),
            loan_id: receipt_loan,
            day,
            closed,
            was_past_due,
        };
        PromiseOrValue::Promise(
            ext_ft::ext(self.config.token.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(GAS_FT_TRANSFER)
                .ft_transfer(biz_id, U128(to_business), None)
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_CALLBACK)
                        .on_business_paid(receipt),
                ),
        )
    }

    fn revert_payment(&mut self, receipt: &PayReceipt) {
        let repay = receipt.repay.0;
        let fee_part = receipt.fee_part.0;
        let reserve_part = receipt.reserve_part.0;
        if let Some(mut biz) = self.businesses.get(&receipt.biz).cloned() {
            Self::debit_bucket(&mut biz, receipt.day, receipt.amount.0);
            if let Some(id) = &receipt.loan_id {
                if let Some(mut loan) = self.loans.get(id).cloned() {
                    let principal_part = repay.saturating_sub(fee_part);
                    loan.repaid = loan.repaid.saturating_sub(repay);
                    loan.fee_repaid = loan.fee_repaid.saturating_sub(fee_part);
                    self.acct.outstanding = add(self.acct.outstanding, principal_part);
                    if receipt.closed && loan.status == LoanStatus::Settled {
                        loan.status = if receipt.was_past_due {
                            self.delinquent_loans = self.delinquent_loans.saturating_add(1);
                            LoanStatus::PastDue
                        } else {
                            LoanStatus::Open
                        };
                        biz.open_loan = Some(loan.id.clone());
                        self.open_loans = self.open_loans.saturating_add(1);
                    }
                    self.loans.insert(loan.id.clone(), loan);
                }
            }
            self.businesses.insert(receipt.biz.clone(), biz);
        }
        if repay > 0 {
            self.acct.cash = self
                .acct
                .cash
                .saturating_sub(repay.saturating_sub(reserve_part));
            self.acct.reserve = self.acct.reserve.saturating_sub(reserve_part);
            self.acct.fees_to_reserve = self.acct.fees_to_reserve.saturating_sub(reserve_part);
            self.acct.fees_retained = self
                .acct
                .fees_retained
                .saturating_sub(fee_part.saturating_sub(reserve_part));
        }
    }

    fn write_off(&mut self, loan: &mut Loan, biz: &mut Business) {
        let total = add(loan.principal, loan.fee);
        let fee_unpaid = sub(loan.fee, loan.fee_repaid);
        let principal_unpaid = sub(sub(total, loan.repaid), fee_unpaid);
        let covered = principal_unpaid.min(self.acct.reserve);
        self.acct.reserve = sub(self.acct.reserve, covered);
        self.acct.cash = add(self.acct.cash, covered);
        self.acct.outstanding = sub(self.acct.outstanding, principal_unpaid);
        self.acct.nav_loss = add(self.acct.nav_loss, sub(principal_unpaid, covered));
        if loan.status == LoanStatus::PastDue {
            self.delinquent_loans = self.delinquent_loans.saturating_sub(1);
        }
        loan.status = LoanStatus::WrittenOff;
        biz.open_loan = None;
        biz.defaulted = true;
        self.open_loans = self.open_loans.saturating_sub(1);
        emit("note_written_off", json!({"id": loan.id}));
    }

    pub(crate) fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
    }
}

#[near]
impl RevVault {
    #[init]
    pub fn new(owner: AccountId, token: AccountId) -> Self {
        Self {
            owner,
            config: Config {
                advance_bps_agent: BASE_ADVANCE_AGENT_BPS,
                advance_bps_creator: BASE_ADVANCE_CREATOR_BPS,
                per_biz_cap: U128(underwriting::DEFAULT_CAP),
                starter_limit: U128(0),
                fee_bps: 300,
                loan_term_ns: DAYS_60_NS,
                grace_ns: DAYS_14_NS,
                window_days: underwriting::WINDOW_DAYS,
                repay_share_bps_default: 2000,
                past_due_split_bps: 5000,
                reserve_bps: 5000,
                min_amount: U128(1_000_000),
                token,
                attestor_pk: None,
            },
            businesses: LookupMap::new(StorageKey::Businesses),
            loans: IterableMap::new(StorageKey::Loans),
            loan_seq: 0,
            shares: FungibleToken::new(StorageKey::Shares),
            lp_basis: LookupMap::new(StorageKey::LpBasis),
            acct: Accounting::default(),
            open_loans: 0,
            delinquent_loans: 0,
            used_nonces: LookupSet::new(StorageKey::Nonces),
        }
    }

    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(
            env::predecessor_account_id() == self.config.token,
            "only the configured token is accepted"
        );
        let parsed: Result<PayMsg, _> = serde_json::from_str(&msg);
        let parsed = match parsed {
            Ok(m) => m,
            Err(_) => return PromiseOrValue::Value(amount),
        };
        match parsed.action.as_str() {
            "lp_deposit" => self.lp_deposit(sender_id, amount.0),
            "pay" => match (parsed.biz, parsed.reference) {
                (Some(biz), Some(reference)) => {
                    self.route_payment(sender_id, amount.0, biz, reference)
                }
                _ => PromiseOrValue::Value(amount),
            },
            _ => PromiseOrValue::Value(amount),
        }
    }

    #[private]
    pub fn on_business_paid(&mut self, receipt: PayReceipt) -> U128 {
        match env::promise_result_checked(0, 16) {
            Ok(_) => U128(0),
            Err(_) => {
                self.revert_payment(&receipt);
                emit(
                    "payment_reverted",
                    json!({"biz": receipt.biz, "payer": receipt.payer, "amount": receipt.amount, "ref": receipt.reference}),
                );
                receipt.amount
            }
        }
    }

    pub fn register_business(&mut self, kind: Kind) {
        require!(env::attached_deposit().is_zero(), "no deposit allowed");
        let biz_id = env::predecessor_account_id();
        require!(
            biz_id != env::current_account_id() && biz_id != self.config.token,
            "invalid business account"
        );
        if self.businesses.contains_key(&biz_id) {
            return;
        }
        let biz = self.new_business(kind);
        self.businesses.insert(biz_id.clone(), biz);
        emit("business_registered", json!({"biz": biz_id, "kind": kind}));
    }

    pub fn set_business_kind(&mut self, biz: AccountId, kind: Kind) {
        self.assert_owner();
        let mut b = match self.businesses.get(&biz) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        b.kind = kind;
        self.businesses.insert(biz.clone(), b);
        emit("business_registered", json!({"biz": biz, "kind": kind}));
    }

    pub fn set_repay_share(&mut self, bps: u32) {
        require!(env::attached_deposit().is_zero(), "no deposit allowed");
        require!(
            (MIN_REPAY_SHARE_BPS..=MAX_REPAY_SHARE_BPS).contains(&bps),
            "repay share out of bounds"
        );
        let biz_id = env::predecessor_account_id();
        let mut biz = match self.businesses.get(&biz_id) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        if biz.open_loan.is_some() {
            require!(
                bps >= biz.repay_share_bps,
                "repay share can only increase while a loan is open"
            );
        }
        biz.repay_share_bps = bps;
        self.businesses.insert(biz_id, biz);
    }

    pub fn request_draw(&mut self, amount: U128, vendor: AccountId, memo: String) -> Promise {
        require!(env::attached_deposit().is_zero(), "no deposit allowed");
        let biz_id = env::predecessor_account_id();
        let mut biz = match self.businesses.get(&biz_id) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        require!(!biz.paused, "business is paused");
        require!(!biz.defaulted, "business is delinquent");
        require!(biz.open_loan.is_none(), "a loan is already open");
        require!(amount.0 > 0, "amount must be positive");
        require!(memo.len() <= MAX_MEMO_LEN, "memo too long");
        require!(
            vendor != biz_id && vendor != env::current_account_id() && vendor != self.config.token,
            "invalid vendor"
        );
        let trailing = self.trailing(&biz);
        let (advance, _) = self.advance_bps(&biz);
        let limit = chk(uw_limit(trailing, advance, self.config.per_biz_cap.0));
        require!(
            amount.0 <= limit,
            format!("amount exceeds available credit: available {}", limit)
        );
        require!(amount.0 <= self.acct.cash, "insufficient vault cash");

        let fee = chk(fee_up(amount.0, self.config.fee_bps));
        self.loan_seq = chk(u128::from(self.loan_seq).checked_add(1)) as u64;
        let id = loan_id(self.loan_seq);
        let now = Self::now_ns();
        let loan = Loan {
            id: id.clone(),
            seq: self.loan_seq,
            business: biz_id.clone(),
            kind: biz.kind,
            vendor: vendor.clone(),
            principal: amount.0,
            fee,
            repaid: 0,
            fee_repaid: 0,
            repay_share_bps: biz.repay_share_bps,
            opened_at_ns: now,
            due_at_ns: now.saturating_add(self.config.loan_term_ns),
            memo: memo.clone(),
            status: LoanStatus::Open,
            pending: true,
        };
        self.acct.cash = sub(self.acct.cash, amount.0);
        self.acct.outstanding = add(self.acct.outstanding, amount.0);
        self.open_loans = self.open_loans.saturating_add(1);
        biz.open_loan = Some(id.clone());
        biz.loans.push(id.clone());
        self.businesses.insert(biz_id.clone(), biz);
        self.loans.insert(id.clone(), loan);

        let vault = env::current_account_id();
        near_contract_standards::non_fungible_token::events::NftMint {
            owner_id: &vault,
            token_ids: &[id.as_str()],
            memo: None,
        }
        .emit();
        emit(
            "draw_opened",
            json!({"biz": biz_id, "loan_id": id, "amount": amount, "fee": U128(fee), "vendor": vendor, "memo": memo}),
        );
        emit(
            "note_minted",
            json!({"id": id, "biz": biz_id, "kind": self.loans.get(&id).map(|l| l.kind), "principal": amount, "fee": U128(fee), "holder": vault}),
        );

        ext_ft::ext(self.config.token.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(vendor, amount, None)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_vendor_paid(id),
            )
    }

    #[private]
    pub fn on_vendor_paid(&mut self, loan_id: String) -> Option<String> {
        let mut loan = self.loans.get(&loan_id).cloned()?;
        if !loan.pending {
            return Some(loan_id);
        }
        match env::promise_result_checked(0, 16) {
            Ok(_) => {
                loan.pending = false;
                emit(
                    "vendor_paid",
                    json!({"loan_id": loan.id, "vendor": loan.vendor, "amount": U128(loan.principal), "route": "direct-ft"}),
                );
                self.loans.insert(loan_id.clone(), loan);
                Some(loan_id)
            }
            Err(_) => {
                self.acct.cash = add(self.acct.cash, loan.principal);
                self.acct.outstanding = self.acct.outstanding.saturating_sub(loan.principal);
                self.open_loans = self.open_loans.saturating_sub(1);
                if let Some(mut biz) = self.businesses.get(&loan.business).cloned() {
                    biz.open_loan = None;
                    biz.loans.retain(|id| *id != loan.id);
                    self.businesses.insert(loan.business.clone(), biz);
                }
                self.loans.remove(&loan.id);
                let vault = env::current_account_id();
                near_contract_standards::non_fungible_token::events::NftBurn {
                    owner_id: &vault,
                    token_ids: &[loan.id.as_str()],
                    authorized_id: None,
                    memo: Some("vendor transfer failed"),
                }
                .emit();
                emit("vendor_failed", json!({"loan_id": loan.id}));
                None
            }
        }
    }

    #[payable]
    pub fn lp_withdraw(&mut self, shares: U128) -> Promise {
        assert_one_yocto();
        let account = env::predecessor_account_id();
        require!(shares.0 > 0, "shares must be positive");
        let balance = self.shares.ft_balance_of(account.clone()).0;
        require!(shares.0 <= balance, "not enough shares");
        let value = self.share_value(shares.0);
        require!(value > 0, "withdrawal value is zero");
        require!(
            value <= self.acct.cash,
            format!("insufficient liquidity: available {}", self.acct.cash)
        );
        let basis = self.lp_basis.get(&account).copied().unwrap_or(0);
        let basis_removed = chk(basis.checked_mul(shares.0))
            .checked_div(balance)
            .unwrap_or(0);
        self.shares.internal_withdraw(&account, shares.0);
        self.acct.cash = sub(self.acct.cash, value);
        self.acct.lp_out = add(self.acct.lp_out, value);
        self.lp_basis
            .insert(account.clone(), basis.saturating_sub(basis_removed));
        emit(
            "lp_withdraw",
            json!({"account": account, "amount": U128(value), "shares": shares}),
        );
        ext_ft::ext(self.config.token.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(account.clone(), U128(value), None)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_lp_paid(account, shares, U128(value), U128(basis_removed)),
            )
    }

    #[private]
    pub fn on_lp_paid(
        &mut self,
        account: AccountId,
        shares: U128,
        value: U128,
        basis_removed: U128,
    ) -> U128 {
        match env::promise_result_checked(0, 16) {
            Ok(_) => value,
            Err(_) => {
                self.shares.internal_deposit(&account, shares.0);
                self.acct.cash = add(self.acct.cash, value.0);
                self.acct.lp_out = self.acct.lp_out.saturating_sub(value.0);
                let basis = self.lp_basis.get(&account).copied().unwrap_or(0);
                self.lp_basis
                    .insert(account.clone(), add(basis, basis_removed.0));
                emit(
                    "lp_withdraw_failed",
                    json!({"account": account, "amount": value, "shares": shares}),
                );
                U128(0)
            }
        }
    }

    #[payable]
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        assert_one_yocto();
        let sender = env::predecessor_account_id();
        require!(sender != receiver_id, "sender and receiver must differ");
        require!(amount.0 > 0, "amount must be positive");
        let balance = self.shares.ft_balance_of(sender.clone()).0;
        require!(amount.0 <= balance, "not enough shares");
        if !self.shares.accounts.contains_key(&receiver_id) {
            self.shares.internal_register_account(&receiver_id);
        }
        let sender_basis = self.lp_basis.get(&sender).copied().unwrap_or(0);
        let moved = chk(sender_basis.checked_mul(amount.0))
            .checked_div(balance)
            .unwrap_or(0);
        let receiver_basis = self.lp_basis.get(&receiver_id).copied().unwrap_or(0);
        self.shares
            .internal_transfer(&sender, &receiver_id, amount.0, memo);
        self.lp_basis
            .insert(sender, sender_basis.saturating_sub(moved));
        self.lp_basis
            .insert(receiver_id, add(receiver_basis, moved));
    }

    pub fn set_attestor(&mut self, attestor_pk: Option<Base64VecU8>) {
        self.assert_owner();
        if let Some(pk) = &attestor_pk {
            require!(pk.0.len() == 32, "attestor key must be 32 bytes");
        }
        self.config.attestor_pk = attestor_pk;
    }

    pub fn post_attestation(&mut self, payload: String, signature: Base64VecU8) -> u32 {
        let Some(pk) = self.config.attestor_pk.clone() else {
            env::panic_str("attestor not configured")
        };
        let Ok(pk): Result<[u8; 32], _> = pk.0.try_into() else {
            env::panic_str("attestor key invalid")
        };
        let Ok(sig): Result<[u8; 64], _> = signature.0.try_into() else {
            env::panic_str("signature must be 64 bytes")
        };
        require!(
            env::ed25519_verify(&sig, payload.as_bytes(), &pk),
            "invalid attestation signature"
        );
        let parsed: AttestationPayload = match serde_json::from_str(&payload) {
            Ok(p) => p,
            Err(_) => env::panic_str("malformed attestation payload"),
        };
        let canonical = match serde_json::to_string(&parsed) {
            Ok(c) => c,
            Err(_) => env::panic_str("malformed attestation payload"),
        };
        require!(canonical == payload, "payload is not canonical JSON");
        let now_ms = Self::now_ns() / NS_PER_MS;
        require!(parsed.valid_until_ms > now_ms, "attestation expired");
        require!(
            parsed.valid_until_ms <= now_ms.saturating_add(MAX_ATTESTATION_TTL_MS),
            "attestation validity too long"
        );
        require!(
            !self.used_nonces.contains(&parsed.nonce),
            "attestation nonce already used"
        );
        let mut biz = match self.businesses.get(&parsed.biz) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        let applied = underwriting::clamp_attested_bps(parsed.advance_bps, self.base_bps(biz.kind));
        self.used_nonces.insert(parsed.nonce);
        biz.attested = Some(Attestation {
            advance_bps: applied,
            valid_until_ms: parsed.valid_until_ms,
        });
        self.businesses.insert(parsed.biz.clone(), biz);
        emit(
            "attestation_applied",
            json!({"biz": parsed.biz, "advance_bps": applied}),
        );
        applied
    }

    pub fn poke(&mut self, biz: AccountId) {
        let mut b = match self.businesses.get(&biz) {
            Some(b) => b.clone(),
            None => return,
        };
        let Some(mut loan) = self.open_loan_of(&b) else {
            return;
        };
        if loan.pending || !matches!(loan.status, LoanStatus::Open | LoanStatus::PastDue) {
            return;
        }
        let now = Self::now_ns();
        if now <= loan.due_at_ns {
            return;
        }
        self.mark_past_due(&mut loan);
        if now > loan.due_at_ns.saturating_add(self.config.grace_ns) {
            self.write_off(&mut loan, &mut b);
        }
        self.loans.insert(loan.id.clone(), loan);
        self.businesses.insert(biz, b);
    }

    pub fn mark_delinquent(&mut self, biz: AccountId) {
        let b = match self.businesses.get(&biz) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        let Some(mut loan) = self.open_loan_of(&b) else {
            return;
        };
        let is_owner = env::predecessor_account_id() == self.owner;
        require!(
            is_owner || Self::now_ns() > loan.due_at_ns,
            "only the owner can mark a loan delinquent before it is due"
        );
        if self.mark_past_due(&mut loan) {
            self.loans.insert(loan.id.clone(), loan);
        }
    }

    pub fn pause_business(&mut self, biz: AccountId) {
        self.set_paused(biz, true);
    }

    pub fn unpause_business(&mut self, biz: AccountId) {
        self.set_paused(biz, false);
    }

    pub fn set_params(&mut self, update: ParamsUpdate) {
        self.assert_owner();
        let c = &mut self.config;
        if let Some(v) = update.advance_bps_agent {
            require!(v <= 8000, "advance_bps_agent too high");
            c.advance_bps_agent = v;
        }
        if let Some(v) = update.advance_bps_creator {
            require!(v <= 8000, "advance_bps_creator too high");
            c.advance_bps_creator = v;
        }
        if let Some(v) = update.per_biz_cap {
            c.per_biz_cap = v;
        }
        if let Some(v) = update.fee_bps {
            require!(v <= 1000, "fee_bps too high");
            c.fee_bps = v;
        }
        if let Some(v) = update.loan_term_ns {
            require!(
                (1_000_000_000..=365 * NS_PER_DAY).contains(&v),
                "loan_term_ns out of range"
            );
            c.loan_term_ns = v;
        }
        if let Some(v) = update.grace_ns {
            require!(v <= 90 * NS_PER_DAY, "grace_ns out of range");
            c.grace_ns = v;
        }
        if let Some(v) = update.repay_share_bps_default {
            require!(
                (MIN_REPAY_SHARE_BPS..=MAX_REPAY_SHARE_BPS).contains(&v),
                "repay share out of bounds"
            );
            c.repay_share_bps_default = v;
        }
        if let Some(v) = update.past_due_split_bps {
            require!(
                (MIN_REPAY_SHARE_BPS..=MAX_REPAY_SHARE_BPS).contains(&v),
                "past due split out of bounds"
            );
            c.past_due_split_bps = v;
        }
        if let Some(v) = update.reserve_bps {
            require!(u128::from(v) <= BPS, "reserve_bps too high");
            c.reserve_bps = v;
        }
        if let Some(v) = update.min_amount {
            c.min_amount = v;
        }
    }
}

impl RevVault {
    fn set_paused(&mut self, biz: AccountId, paused: bool) {
        self.assert_owner();
        let mut b = match self.businesses.get(&biz) {
            Some(b) => b.clone(),
            None => env::panic_str("business not registered"),
        };
        b.paused = paused;
        self.businesses.insert(biz, b);
    }

    pub(crate) fn share_value(&self, shares: u128) -> u128 {
        let total = self.shares.total_supply;
        if total == 0 {
            return 0;
        }
        chk(shares.checked_mul(self.total_assets()))
            .checked_div(total)
            .unwrap_or(0)
    }

    pub(crate) fn credit_inputs(&self, biz: &Business) -> (u128, u32, bool, u128, Option<Loan>) {
        let trailing = self.trailing(biz);
        let (advance, attested) = self.advance_bps(biz);
        let loan = self.open_loan_of(biz);
        let past_due = loan
            .as_ref()
            .map(|l| self.loan_past_due(l))
            .unwrap_or(false);
        let delinquent = biz.defaulted || past_due;
        let limit = if delinquent {
            0
        } else {
            chk(uw_limit(trailing, advance, self.config.per_biz_cap.0))
        };
        (trailing, advance, attested, limit, loan)
    }

    pub(crate) fn est_days(&self, debt_left: u128, trailing: u128, split: u32) -> Option<u64> {
        est_days_to_clear(debt_left, trailing, self.config.window_days, split)
    }

    pub(crate) fn avail(limit: u128, debt_left: u128, active: bool) -> u128 {
        uw_available(limit, debt_left, active)
    }
}
