pub const BPS: u128 = 10_000;
pub const WINDOW_DAYS: u64 = 30;
pub const BASE_ADVANCE_AGENT_BPS: u32 = 4000;
pub const BASE_ADVANCE_CREATOR_BPS: u32 = 3000;
pub const MAX_BONUS_BPS: u32 = 2000;
pub const DEFAULT_CAP: u128 = 2_000_000_000;
const FACTOR_MAX_BPS: u32 = 400;

pub fn mul_bps_down(amount: u128, bps: u32) -> Option<u128> {
    amount.checked_mul(u128::from(bps))?.checked_div(BPS)
}

pub fn mul_bps_up(amount: u128, bps: u32) -> Option<u128> {
    let product = amount.checked_mul(u128::from(bps))?;
    let quotient = product.checked_div(BPS)?;
    if product.checked_rem(BPS)? == 0 {
        Some(quotient)
    } else {
        quotient.checked_add(1)
    }
}

pub fn limit(routed_trailing: u128, advance_bps: u32, per_biz_cap: u128) -> Option<u128> {
    if routed_trailing == 0 {
        return Some(0);
    }
    Some(mul_bps_down(routed_trailing, advance_bps)?.min(per_biz_cap))
}

pub fn available(limit: u128, debt_left: u128, active: bool) -> u128 {
    if active {
        limit.saturating_sub(debt_left)
    } else {
        0
    }
}

pub fn fee_up(principal: u128, fee_bps: u32) -> Option<u128> {
    mul_bps_up(principal, fee_bps)
}

pub fn repay_slice(amount: u128, split_bps: u32, debt_left: u128) -> Option<u128> {
    Some(mul_bps_up(amount, split_bps)?.min(debt_left))
}

pub fn fee_part(
    slice: u128,
    principal: u128,
    fee: u128,
    repaid_before: u128,
    fee_repaid_before: u128,
) -> Option<u128> {
    let total = principal.checked_add(fee)?;
    let fee_left = fee.checked_sub(fee_repaid_before)?;
    if repaid_before.checked_add(slice)? >= total {
        return Some(fee_left);
    }
    let proportional = slice.checked_mul(fee)?.checked_div(total)?;
    Some(proportional.min(fee_left).min(slice))
}

pub fn est_days_to_clear(
    debt_left: u128,
    trailing_routed: u128,
    window_days: u64,
    split_bps: u32,
) -> Option<u64> {
    if debt_left == 0 || trailing_routed == 0 || split_bps == 0 || window_days == 0 {
        return None;
    }
    let numerator = debt_left
        .checked_mul(u128::from(window_days))?
        .checked_mul(BPS)?;
    let denominator = trailing_routed.checked_mul(u128::from(split_bps))?;
    let quotient = numerator.checked_div(denominator)?;
    let days = if numerator.checked_rem(denominator)? == 0 {
        quotient
    } else {
        quotient.checked_add(1)?
    };
    u64::try_from(days).ok()
}

pub fn clamp_attested_bps(requested: u32, base_bps: u32) -> u32 {
    requested.clamp(base_bps, base_bps.saturating_add(MAX_BONUS_BPS))
}

#[derive(Clone, Debug)]
pub struct Inflow {
    pub day: u64,
    pub amount: u128,
    pub payer: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Components {
    pub trailing_volume: u128,
    pub active_days: u32,
    pub distinct_payers: u32,
    pub top_payer_bps: u32,
    pub volatility_bps: u32,
    pub routed_share_bps: u32,
    pub points_active_days: u32,
    pub points_payers: u32,
    pub points_concentration: u32,
    pub points_volatility: u32,
    pub points_routed_share: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Score {
    pub advance_bps: u32,
    pub cap: u128,
    pub bonus_bps: u32,
    pub components: Components,
}

fn step_points(value: u32, thresholds: [u32; 4], ascending: bool) -> u32 {
    let mut points = 0;
    for (index, threshold) in thresholds.iter().enumerate() {
        let passes = if ascending {
            value >= *threshold
        } else {
            value <= *threshold
        };
        if passes {
            points = 100 * (index as u32 + 1);
        }
    }
    points.min(FACTOR_MAX_BPS)
}

pub fn score(inflows: &[Inflow], routed_share_bps: u32) -> Score {
    let as_of = inflows.iter().map(|i| i.day).max().unwrap_or(0);
    let start = as_of.saturating_sub(WINDOW_DAYS - 1);
    let in_window: Vec<&Inflow> = inflows
        .iter()
        .filter(|i| i.day >= start && i.day <= as_of)
        .collect();

    let mut daily = [0u128; WINDOW_DAYS as usize];
    let mut total: u128 = 0;
    for inflow in &in_window {
        let slot = (inflow.day - start) as usize;
        daily[slot] = daily[slot].saturating_add(inflow.amount);
        total = total.saturating_add(inflow.amount);
    }
    let active_days = daily.iter().filter(|d| **d > 0).count() as u32;

    let mut payers: Vec<(&str, u128)> = Vec::new();
    for inflow in &in_window {
        match payers.iter_mut().find(|(p, _)| *p == inflow.payer.as_str()) {
            Some(entry) => entry.1 = entry.1.saturating_add(inflow.amount),
            None => payers.push((inflow.payer.as_str(), inflow.amount)),
        }
    }
    let distinct_payers = payers.len() as u32;
    let top = payers.iter().map(|(_, a)| *a).max().unwrap_or(0);
    let top_payer_bps = if total == 0 {
        10_000
    } else {
        top.saturating_mul(BPS).checked_div(total).unwrap_or(10_000) as u32
    };

    let mean = total / u128::from(WINDOW_DAYS);
    let deviation: u128 = daily
        .iter()
        .map(|d| d.abs_diff(mean))
        .fold(0u128, |acc, d| acc.saturating_add(d))
        / u128::from(WINDOW_DAYS);
    let volatility_bps = deviation
        .saturating_mul(BPS)
        .checked_div(mean)
        .map_or(u32::MAX, |v| u32::try_from(v).unwrap_or(u32::MAX));

    let (p_days, p_payers, p_conc, p_vol, p_routed) = if total == 0 {
        (0, 0, 0, 0, 0)
    } else {
        (
            step_points(active_days, [3, 8, 16, 24], true),
            step_points(distinct_payers, [2, 3, 5, 10], true),
            step_points(top_payer_bps, [8000, 6000, 4000, 2500], false),
            step_points(volatility_bps, [15000, 10000, 6000, 3000], false),
            step_points(routed_share_bps, [2500, 5000, 7000, 9000], true),
        )
    };
    let bonus_bps = (p_days + p_payers + p_conc + p_vol + p_routed).min(MAX_BONUS_BPS);

    Score {
        advance_bps: BASE_ADVANCE_AGENT_BPS + bonus_bps,
        cap: DEFAULT_CAP,
        bonus_bps,
        components: Components {
            trailing_volume: total,
            active_days,
            distinct_payers,
            top_payer_bps,
            volatility_bps,
            routed_share_bps,
            points_active_days: p_days,
            points_payers: p_payers,
            points_concentration: p_conc,
            points_volatility: p_vol,
            points_routed_share: p_routed,
        },
    }
}
