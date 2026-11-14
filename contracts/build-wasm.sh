#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"
export RUSTC_BOOTSTRAP=1
export RUSTFLAGS="-C target-cpu=mvp"
export CARGO_TARGET_DIR="$root/target/mvp"
cargo build -Zbuild-std=std,panic_abort -p revvault -p mock-usdc --target wasm32-unknown-unknown --release --locked
for f in revvault mock_usdc; do
  wasm-tools validate --features mvp "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/$f.wasm"
  ls -l "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/$f.wasm"
done
# Strip names/custom sections for deploy: storage staking is 1 NEAR per 100 KB, so smaller wasm = cheaper testnet deploy.
mkdir -p "$CARGO_TARGET_DIR/deploy"
for f in revvault mock_usdc; do
  wasm-tools strip --all "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/$f.wasm" -o "$CARGO_TARGET_DIR/deploy/$f.wasm"
  wasm-tools validate --features mvp "$CARGO_TARGET_DIR/deploy/$f.wasm"
  ls -l "$CARGO_TARGET_DIR/deploy/$f.wasm"
done
