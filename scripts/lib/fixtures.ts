import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot: string = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type JsonObject = { [key: string]: Json };

export function readJson(relative: string): Json {
  return JSON.parse(readFileSync(join(repoRoot, relative), "utf8")) as Json;
}

export function asObject(value: Json | undefined, what: string): JsonObject {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${what}: expected object`);
  }
  return value;
}

export function asArray(value: Json | undefined, what: string): Json[] {
  if (!Array.isArray(value)) {
    throw new Error(`${what}: expected array`);
  }
  return value;
}

export function asString(value: Json | undefined, what: string): string {
  if (typeof value !== "string") {
    throw new Error(`${what}: expected string`);
  }
  return value;
}

export function asNumber(value: Json | undefined, what: string): number {
  if (typeof value !== "number") {
    throw new Error(`${what}: expected number`);
  }
  return value;
}

export function asBig(value: Json | undefined, what: string): bigint {
  return BigInt(asString(value, what));
}

export function usdc(units: bigint): string {
  const whole = units / 1_000_000n;
  const frac = units % 1_000_000n;
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0n) {
    return wholeText;
  }
  return `${wholeText}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}
