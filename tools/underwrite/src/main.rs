use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use ed25519_dalek::{Signer, SigningKey};
use serde_json::Value;
use underwriting::{
    clamp_attested_bps, limit, score, Inflow, BASE_ADVANCE_AGENT_BPS, BASE_ADVANCE_CREATOR_BPS,
    DEFAULT_CAP, MAX_BONUS_BPS,
};

const KEY_ENV: &str = "ATTESTOR_PRIVATE_KEY";
const VALIDITY_MS: u64 = 7 * 24 * 60 * 60 * 1000;

struct History {
    source: String,
    kind: String,
    routed_share_bps: u32,
    inflows: Vec<Inflow>,
}

fn usdc(units: u128) -> String {
    let whole = units / 1_000_000;
    let frac = units % 1_000_000;
    let digits = whole.to_string();
    let mut grouped = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i).is_multiple_of(3) {
            grouped.push(',');
        }
        grouped.push(c);
    }
    if frac == 0 {
        grouped
    } else {
        let f = format!("{frac:06}");
        format!("{grouped}.{}", f.trim_end_matches('0'))
    }
}

fn pct(bps: u32) -> String {
    format!("{}.{:02}%", bps / 100, bps % 100)
}

fn history_dir(args: &[String]) -> PathBuf {
    if let Some(pos) = args.iter().position(|a| a == "--history-dir") {
        if let Some(dir) = args.get(pos + 1) {
            return PathBuf::from(dir);
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("deployments")
        .join("history")
}

fn slug(account: &str) -> String {
    account
        .strip_suffix(".testnet")
        .unwrap_or(account)
        .to_string()
}

fn load_history(dir: &Path, account: &str) -> Result<History, String> {
    let path = dir.join(format!("{}.json", slug(account)));
    let text = fs::read_to_string(&path)
        .map_err(|e| format!("no fixture history at {}: {e}", path.display()))?;
    let value: Value = serde_json::from_str(&text).map_err(|e| format!("bad fixture JSON: {e}"))?;
    let source = value
        .get("source")
        .and_then(Value::as_str)
        .ok_or("fixture has no source label")?
        .to_string();
    if source != "fixture" {
        return Err(format!(
            "unexpected source label {source:?}, expected \"fixture\""
        ));
    }
    let kind = value
        .get("kind")
        .and_then(Value::as_str)
        .ok_or("fixture has no kind")?
        .to_string();
    let routed_share_bps = value
        .get("routed_share_bps")
        .and_then(Value::as_u64)
        .and_then(|v| u32::try_from(v).ok())
        .ok_or("fixture has no routed_share_bps")?;
    let rows = value
        .get("inflows")
        .and_then(Value::as_array)
        .ok_or("fixture has no inflows")?;
    let mut inflows = Vec::new();
    for row in rows {
        let day = row.get("day").and_then(Value::as_u64).ok_or("inflow day")?;
        let amount = row
            .get("amount")
            .and_then(Value::as_str)
            .and_then(|s| s.parse::<u128>().ok())
            .ok_or("inflow amount")?;
        let payer = row
            .get("payer")
            .and_then(Value::as_str)
            .ok_or("inflow payer")?
            .to_string();
        inflows.push(Inflow { day, amount, payer });
    }
    Ok(History {
        source,
        kind,
        routed_share_bps,
        inflows,
    })
}

fn signing_key_from_env() -> Result<Option<SigningKey>, String> {
    let raw = match env::var(KEY_ENV) {
        Ok(v) if !v.trim().is_empty() => v,
        _ => return Ok(None),
    };
    let trimmed = raw.trim();
    let bytes = if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        (0..32)
            .map(|i| u8::from_str_radix(&trimmed[i * 2..i * 2 + 2], 16))
            .collect::<Result<Vec<u8>, _>>()
            .map_err(|_| format!("{KEY_ENV} is not valid hex"))?
    } else {
        STANDARD.decode(trimmed).map_err(|_| {
            format!("{KEY_ENV} must be 32-byte hex or base64 (32-byte seed or 64-byte keypair)")
        })?
    };
    let seed: [u8; 32] = match bytes.len() {
        32 | 64 => bytes[..32]
            .try_into()
            .map_err(|_| format!("{KEY_ENV} has the wrong length"))?,
        _ => return Err(format!("{KEY_ENV} must decode to 32 or 64 bytes")),
    };
    Ok(Some(SigningKey::from_bytes(&seed)))
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| u64::try_from(d.as_millis()).unwrap_or(0))
        .unwrap_or(0)
}

fn usage() -> ExitCode {
    eprintln!("usage: underwrite <account> [--source fixture|rpc] [--history-dir <dir>]");
    ExitCode::from(64)
}

fn run(args: &[String]) -> Result<ExitCode, String> {
    let account = match args.iter().find(|a| !a.starts_with("--")) {
        Some(a) => a.clone(),
        None => return Ok(usage()),
    };
    let source = args
        .iter()
        .position(|a| a == "--source")
        .and_then(|p| args.get(p + 1))
        .cloned()
        .unwrap_or_else(|| "fixture".to_string());

    if source == "rpc" {
        println!("source: rpc (NOT IMPLEMENTED in this build)");
        println!("No history was read and nothing was scored for {account}.");
        println!("Use --source fixture for the labelled demo history.");
        return Ok(ExitCode::from(2));
    }
    if source != "fixture" {
        return Ok(usage());
    }

    let history = load_history(&history_dir(args), &account)?;
    let base = if history.kind == "creator" {
        BASE_ADVANCE_CREATOR_BPS
    } else {
        BASE_ADVANCE_AGENT_BPS
    };
    let result = score(&history.inflows, history.routed_share_bps);
    let c = &result.components;
    let requested = base + result.bonus_bps;
    let advance = clamp_attested_bps(requested, base);
    let est_limit = limit(c.trailing_volume, advance, DEFAULT_CAP).unwrap_or(0);

    println!("RevVault underwriting for {account}");
    println!(
        "source: {} (synthetic demo history, not live on-chain history)",
        history.source
    );
    println!("kind: {}  base advance {}", history.kind, pct(base));
    println!();
    println!("Score components (30-day window)");
    println!(
        "  volume            {} USDC routed",
        usdc(c.trailing_volume)
    );
    println!(
        "  active days       {} of 30   (+{} bps)",
        c.active_days, c.points_active_days
    );
    println!(
        "  distinct payers   {}   (+{} bps)",
        c.distinct_payers, c.points_payers
    );
    println!(
        "  concentration     top payer {}   (+{} bps)",
        pct(c.top_payer_bps),
        c.points_concentration
    );
    if c.volatility_bps == u32::MAX {
        println!("  volatility        n/a   (+{} bps)", c.points_volatility);
    } else {
        println!(
            "  volatility        {}   (+{} bps)",
            pct(c.volatility_bps),
            c.points_volatility
        );
    }
    println!(
        "  routed share      {} of inflow   (+{} bps)",
        pct(c.routed_share_bps),
        c.points_routed_share
    );
    println!();
    println!("Bonus {} bps of max {}", result.bonus_bps, MAX_BONUS_BPS);
    println!(
        "Advance rate: {}  (clamped to base .. base + {} bps)",
        pct(advance),
        MAX_BONUS_BPS
    );
    println!(
        "Indicative limit: {} USDC (cap {} USDC)",
        usdc(est_limit),
        usdc(DEFAULT_CAP)
    );
    println!();
    println!("This sets the advance RATE only. It is not the collateral: only revenue routed through the");
    println!("RevVault pay link counts as collateral, and a score never creates a starter limit.");
    println!();

    let valid_until = now_ms() + VALIDITY_MS;
    let nonce = now_ms();
    let payload = format!(
        "{{\"biz\":\"{account}\",\"advance_bps\":{advance},\"valid_until_ms\":{valid_until},\"nonce\":{nonce}}}"
    );
    match signing_key_from_env()? {
        Some(key) => {
            let signature = key.sign(payload.as_bytes());
            let attestor_pk = STANDARD.encode(key.verifying_key().as_bytes());
            let doc = serde_json::json!({
                "payload": payload,
                "signature": STANDARD.encode(signature.to_bytes()),
                "attestor_pk": attestor_pk,
                "signed": true,
            });
            println!("Attestation (signed ed25519, key read from {KEY_ENV}):");
            println!(
                "{}",
                serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?
            );
        }
        None => {
            let doc = serde_json::json!({ "payload": payload, "signed": false });
            println!("Attestation UNSIGNED: {KEY_ENV} is not set, so no signature was produced.");
            println!(
                "{}",
                serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?
            );
        }
    }
    println!();
    println!("This CLI does not submit the attestation. On-chain it takes effect only if the owner set an");
    println!("attestor key and someone calls post_attestation on testnet; otherwise it is specified, not enforced.");
    Ok(ExitCode::SUCCESS)
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match run(&args) {
        Ok(code) => code,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::from(1)
        }
    }
}
