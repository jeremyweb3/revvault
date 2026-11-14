use near_contract_standards::fungible_token::metadata::{FungibleTokenMetadata, FT_METADATA_SPEC};
use near_contract_standards::fungible_token::FungibleTokenCore;
use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId};
use underwriting::BPS;

use crate::types::*;
use crate::util::{add, chk, day_string, sub};
use crate::{RevVault, RevVaultExt};

impl RevVault {
    pub(crate) fn loan_status_str(&self, loan: &Loan) -> &'static str {
        match loan.status {
            LoanStatus::Settled => "closed",
            LoanStatus::WrittenOff => "written_off",
            _ if self.loan_past_due(loan) => "delinquent",
            _ => "open",
        }
    }

    pub(crate) fn note_status_str(&self, loan: &Loan) -> &'static str {
        match loan.status {
            LoanStatus::Settled => "settled",
            LoanStatus::WrittenOff => "written_off",
            _ if self.loan_past_due(loan) => "past_due",
            _ => "open",
        }
    }

    pub(crate) fn loan_view(&self, loan: &Loan) -> LoanView {
        LoanView {
            id: loan.id.clone(),
            business: loan.business.clone(),
            vendor: loan.vendor.clone(),
            principal: U128(loan.principal),
            fee: U128(loan.fee),
            repaid: U128(loan.repaid),
            opened_at_ms: loan.opened_at_ns / NS_PER_MS,
            due_at_ms: loan.due_at_ns / NS_PER_MS,
            memo: loan.memo.clone(),
            status: self.loan_status_str(loan).to_string(),
        }
    }

    pub(crate) fn note_view(&self, loan: &Loan) -> NoteView {
        let split = match self.businesses.get(&loan.business) {
            Some(biz) => self
                .effective_split(biz, Some(loan))
                .max(loan.repay_share_bps),
            None => loan.repay_share_bps,
        };
        NoteView {
            id: loan.id.clone(),
            business: loan.business.clone(),
            kind: loan.kind,
            holder: env::current_account_id(),
            principal: U128(loan.principal),
            fee: U128(loan.fee),
            repaid: U128(loan.repaid),
            repay_share_bps: split,
            minted_at_ms: loan.opened_at_ns / NS_PER_MS,
            due_at_ms: loan.due_at_ns / NS_PER_MS,
            status: self.note_status_str(loan).to_string(),
            vendor: loan.vendor.clone(),
            memo: loan.memo.clone(),
        }
    }
}

#[near]
impl RevVault {
    pub fn get_credit(&self, account: AccountId) -> CreditView {
        let biz = match self.businesses.get(&account) {
            Some(b) => b.clone(),
            None => {
                return CreditView {
                    limit: U128(0),
                    available: U128(0),
                    outstanding: U128(0),
                    trailing_revenue: U128(0),
                    advance_rate_bps: self.config.advance_bps_agent,
                    repay_share_bps: self.config.repay_share_bps_default,
                    status: "active".to_string(),
                    no_history: true,
                    kind: Kind::Agent,
                    effective_split_bps: self.config.repay_share_bps_default,
                    due_at_ms: None,
                    past_due: false,
                    attested: false,
                    est_days_to_clear: None,
                }
            }
        };
        let (trailing, advance, attested, limit, loan) = self.credit_inputs(&biz);
        let past_due = loan
            .as_ref()
            .map(|l| self.loan_past_due(l))
            .unwrap_or(false);
        let delinquent = biz.defaulted || past_due;
        let status = if delinquent {
            "delinquent"
        } else if biz.paused {
            "paused"
        } else {
            "active"
        };
        let debt_left = match &loan {
            Some(l) if !matches!(l.status, LoanStatus::Settled | LoanStatus::WrittenOff) => {
                sub(add(l.principal, l.fee), l.repaid)
            }
            _ => 0,
        };
        let split = self.effective_split(&biz, loan.as_ref());
        let est = if debt_left > 0 {
            self.est_days(debt_left, trailing, split)
        } else {
            None
        };
        CreditView {
            limit: U128(limit),
            available: U128(Self::avail(limit, debt_left, status == "active")),
            outstanding: U128(debt_left),
            trailing_revenue: U128(trailing),
            advance_rate_bps: advance,
            repay_share_bps: biz.repay_share_bps,
            status: status.to_string(),
            no_history: trailing == 0,
            kind: biz.kind,
            effective_split_bps: split,
            due_at_ms: loan.as_ref().map(|l| l.due_at_ns / NS_PER_MS),
            past_due,
            attested,
            est_days_to_clear: est,
        }
    }

    pub fn get_loans(&self, account: AccountId) -> Vec<LoanView> {
        match self.businesses.get(&account) {
            Some(b) => b
                .loans
                .iter()
                .rev()
                .filter_map(|id| self.loans.get(id))
                .map(|l| self.loan_view(l))
                .collect(),
            None => Vec::new(),
        }
    }

    pub fn get_loan(&self, id: String) -> Option<LoanView> {
        self.loans.get(&id).map(|l| self.loan_view(l))
    }

    pub fn get_note(&self, id: String) -> Option<NoteView> {
        self.loans.get(&id).map(|l| self.note_view(l))
    }

    pub fn get_notes(
        &self,
        account: Option<AccountId>,
        kind: Option<Kind>,
        status: Option<String>,
    ) -> Vec<NoteView> {
        let mut loans: Vec<&Loan> = match &account {
            Some(a) => match self.businesses.get(a) {
                Some(b) => b.loans.iter().filter_map(|id| self.loans.get(id)).collect(),
                None => Vec::new(),
            },
            None => self.loans.values().collect(),
        };
        loans.sort_by_key(|l| std::cmp::Reverse(l.seq));
        loans
            .into_iter()
            .filter(|l| kind.map(|k| k == l.kind).unwrap_or(true))
            .map(|l| self.note_view(l))
            .filter(|n| status.as_ref().map(|s| *s == n.status).unwrap_or(true))
            .take(MAX_PAGE as usize)
            .collect()
    }

    pub fn get_ledger(&self, account: AccountId, days: u64) -> Vec<LedgerDay> {
        let days = days.clamp(1, BUCKET_RETENTION_DAYS);
        let today = Self::today();
        let buckets = self
            .businesses
            .get(&account)
            .map(|b| b.buckets.clone())
            .unwrap_or_default();
        let start = today.saturating_sub(days - 1);
        (start..=today)
            .map(|day| LedgerDay {
                day: day_string(day),
                amount: U128(
                    buckets
                        .iter()
                        .filter(|(d, _)| *d == day)
                        .fold(0u128, |acc, (_, a)| add(acc, *a)),
                ),
            })
            .collect()
    }

    pub fn get_vault_stats(&self) -> VaultStats {
        let tvl = self.total_assets();
        let utilisation_bps = if tvl == 0 {
            0
        } else {
            chk(self.acct.outstanding.checked_mul(BPS))
                .checked_div(tvl)
                .unwrap_or(0) as u32
        };
        let term_days = (self.config.loan_term_ns / NS_PER_DAY).max(1);
        let apy = chk(u128::from(self.config.fee_bps).checked_mul(365))
            .checked_mul(u128::from(utilisation_bps))
            .and_then(|v| v.checked_mul(BPS.saturating_sub(u128::from(self.config.reserve_bps))))
            .and_then(|v| v.checked_div(u128::from(term_days) * BPS * BPS))
            .unwrap_or(0) as u32;
        VaultStats {
            tvl: U128(tvl),
            cash: U128(self.acct.cash),
            reserve: U128(self.acct.reserve),
            utilisation_bps,
            illustrative_apy_bps: apy,
            open_loans: self.open_loans,
            delinquent: self.delinquent_loans,
            total_shares: U128(self.shares.total_supply),
        }
    }

    pub fn get_accounting(&self) -> AccountingView {
        let a = &self.acct;
        AccountingView {
            cash: U128(a.cash),
            outstanding_principal: U128(a.outstanding),
            reserve: U128(a.reserve),
            fees_retained: U128(a.fees_retained),
            fees_to_reserve: U128(a.fees_to_reserve),
            lp_in: U128(a.lp_in),
            lp_out: U128(a.lp_out),
            nav_loss: U128(a.nav_loss),
            tracked_balance: U128(add(a.cash, a.reserve)),
        }
    }

    pub fn get_lp(&self, account: AccountId) -> LpView {
        let shares = self.shares.ft_balance_of(account.clone()).0;
        let value = self.share_value(shares);
        let basis = self.lp_basis.get(&account).copied().unwrap_or(0);
        LpView {
            shares: U128(shares),
            value: U128(value),
            earned: U128(value.saturating_sub(basis)),
        }
    }

    pub fn get_params(&self) -> Config {
        self.config.clone()
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.shares.ft_balance_of(account_id)
    }

    pub fn ft_total_supply(&self) -> U128 {
        self.shares.ft_total_supply()
    }

    pub fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "RevVault LP share".to_string(),
            symbol: "rvUSDC".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 6,
        }
    }
}
