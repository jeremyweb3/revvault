use near_sdk::env;
use near_sdk::serde_json::{json, Value};

pub fn chk(value: Option<u128>) -> u128 {
    match value {
        Some(v) => v,
        None => env::panic_str("math overflow"),
    }
}

pub fn add(a: u128, b: u128) -> u128 {
    chk(a.checked_add(b))
}

pub fn sub(a: u128, b: u128) -> u128 {
    chk(a.checked_sub(b))
}

pub fn emit(event: &str, data: Value) {
    let body = json!({
        "standard": "revvault",
        "version": "1.0.0",
        "event": event,
        "data": data,
    });
    env::log_str(&format!("EVENT_JSON:{}", body));
}

pub fn day_string(days: u64) -> String {
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

pub fn loan_id(seq: u64) -> String {
    format!("ln_{:03}", seq)
}
