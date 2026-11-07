// Test-mode postage model. Real rates must come from a carrier/label API;
// until one is configured, every amount from here is labelled an estimate.
import { MAX_DIMS_IN, MAX_WEIGHT_LB } from "./config";

export type Pack = { weightOz: number; dims: [number, number, number] };

export function sortDims(a: number, b: number, c: number): [number, number, number] {
  return [a, b, c].sort((x, y) => y - x) as [number, number, number];
}

export function checkPackLimits(p: Pack): string | null {
  if (!(p.weightOz > 0) || p.dims.some((d) => !(d > 0))) return "Enter the packed weight and all three sides.";
  if (p.weightOz / 16 > MAX_WEIGHT_LB) return `Packed weight must be ${MAX_WEIGHT_LB} lb or less.`;
  const [l, w, h] = p.dims;
  if (l > MAX_DIMS_IN[0] || w > MAX_DIMS_IN[1] || h > MAX_DIMS_IN[2])
    return `Packed box must fit within ${MAX_DIMS_IN.join(" × ")} in (longest side first).`;
  return null;
}

function zoneBetween(fromZip: string, toZip?: string) {
  if (!toZip) return 8; // unknown destination → farthest zone
  const d = Math.abs(Number(fromZip[0]) - Number(toZip[0]));
  return Math.min(8, 2 + d);
}

export function postageCents(p: Pack, fromZip: string, toZip?: string) {
  const [l, w, h] = p.dims;
  const billableLb = Math.ceil(Math.max(p.weightOz / 16, (l * w * h) / 166));
  const zone = zoneBetween(fromZip, toZip);
  const dollars = 6 + 0.5 * zone + billableLb * (0.4 + 0.12 * zone);
  return Math.round(dollars * 100);
}
