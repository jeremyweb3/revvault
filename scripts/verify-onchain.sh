#!/usr/bin/env bash
# One-command, wallet-free check of the live RevVault testnet deployment.
# Reads the contracts over public RPC and asserts the numbers the README claims.
# Usage: bash scripts/verify-onchain.sh        (needs curl and python3)
set -euo pipefail
RPC="${NEAR_RPC_URL:-https://test.rpc.fastnear.com}"
V="${REVVAULT_CONTRACT_ID:-revvault.revvault-dep-17094.testnet}"
BIZ="${BIZ_ACCOUNT_ID:-biz-agent.revvault-dep-17094.testnet}"

view() { # method, json-args
  local args; args=$(printf '%s' "$2" | base64 -w0)
  curl -sS -m 20 "$RPC" -H 'content-type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$V\",\"method_name\":\"$1\",\"args_base64\":\"$args\"}}" |
    python3 -c "import sys,json;r=json.load(sys.stdin);sys.exit('RPC error: '+json.dumps(r.get('error',r))[:300]) if 'result' not in r else print(bytes(r['result']['result']).decode())"
}

echo "contract : $V  (rpc: $RPC)"
stats=$(view get_vault_stats '{}');           echo "stats    : $stats"
credit=$(view get_credit "{\"account\":\"$BIZ\"}"); echo "credit   : $credit"
notes=$(view get_notes '{}')

python3 - "$stats" "$credit" "$notes" <<'PY'
import json, sys
stats, credit, notes = (json.loads(a) for a in sys.argv[1:4])
u = 10**6  # USDC has 6 decimals
ok = True
def check(label, cond, detail):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + label + " -> " + detail)
limit, rev, bps = int(credit["limit"]), int(credit["trailing_revenue"]), credit["advance_rate_bps"]
check("limit = advance_rate x routed revenue (capped)", limit == min(rev * bps // 10000, 2000 * u),
      f"{limit/u:.2f} USDC = {bps/100:.0f}% of {rev/u:.2f} USDC routed (cap 2,000)")
settled = [n for n in notes if n["status"] == "settled"]
check("at least one note settled by repayments", len(settled) >= 1,
      ", ".join(f'{n["id"]}: drew {int(n["principal"])/u:.0f}, fee {int(n["fee"])/u:.0f}, repaid {int(n["repaid"])/u:.0f}' for n in settled) or "none")
check("flat 3% fee on every note", all(int(n["fee"]) == (int(n["principal"]) * 300 + 9999) // 10000 for n in notes),
      f"{len(notes)} notes")
check("vault has TVL and a reserve", int(stats["tvl"]) > 0 and int(stats["reserve"]) > 0,
      f'tvl {int(stats["tvl"])/u:.2f}, reserve {int(stats["reserve"])/u:.2f} USDC')
print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED (the testnet state may have changed since the README was written)")
sys.exit(0 if ok else 1)
PY
