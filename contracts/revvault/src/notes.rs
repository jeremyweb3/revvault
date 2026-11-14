use std::collections::HashMap;

use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::Token;
use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId, PromiseOrValue};

use crate::types::*;
use crate::{RevVault, RevVaultExt};

const POOL_HELD: &str = "notes are pool-held in this MVP";

impl RevVault {
    fn token_of(&self, loan: &Loan) -> Token {
        let status = self.note_status_str(loan);
        Token {
            token_id: loan.id.clone(),
            owner_id: env::current_account_id(),
            metadata: Some(TokenMetadata {
                title: Some(format!("RevVault revenue note {}", loan.id)),
                description: Some(format!(
                    "Economic claim on the repayment stream of loan {} ({}). Pool-held, not a security.",
                    loan.id, status
                )),
                media: None,
                media_hash: None,
                copies: Some(1),
                issued_at: Some((loan.opened_at_ns / NS_PER_MS).to_string()),
                expires_at: None,
                starts_at: None,
                updated_at: None,
                extra: Some(format!(
                    "{{\"business\":\"{}\",\"principal\":\"{}\",\"fee\":\"{}\",\"repaid\":\"{}\"}}",
                    loan.business, loan.principal, loan.fee, loan.repaid
                )),
                reference: None,
                reference_hash: None,
            }),
            approved_account_ids: Some(HashMap::new()),
        }
    }

    fn page(from_index: Option<U128>, limit: Option<u64>) -> (usize, usize) {
        let from = from_index.map(|v| v.0).unwrap_or(0);
        let limit = limit.unwrap_or(MAX_PAGE).min(MAX_PAGE);
        (usize::try_from(from).unwrap_or(usize::MAX), limit as usize)
    }

    fn sorted_loans(&self) -> Vec<&Loan> {
        let mut loans: Vec<&Loan> = self.loans.values().collect();
        loans.sort_by_key(|l| l.seq);
        loans
    }
}

#[near]
impl RevVault {
    pub fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "RevVault revenue note".to_string(),
            symbol: "RVNOTE".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }

    pub fn nft_token(&self, token_id: String) -> Option<Token> {
        self.loans.get(&token_id).map(|l| self.token_of(l))
    }

    pub fn nft_total_supply(&self) -> U128 {
        U128(u128::from(self.loans.len()))
    }

    pub fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        let (from, limit) = Self::page(from_index, limit);
        self.sorted_loans()
            .into_iter()
            .skip(from)
            .take(limit)
            .map(|l| self.token_of(l))
            .collect()
    }

    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        if account_id == env::current_account_id() {
            self.nft_total_supply()
        } else {
            U128(0)
        }
    }

    pub fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        if account_id == env::current_account_id() {
            self.nft_tokens(from_index, limit)
        } else {
            Vec::new()
        }
    }

    #[payable]
    pub fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        let _ = (receiver_id, token_id, approval_id, memo);
        env::panic_str(POOL_HELD)
    }

    #[payable]
    pub fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        let _ = (receiver_id, token_id, approval_id, memo, msg);
        env::panic_str(POOL_HELD)
    }
}
