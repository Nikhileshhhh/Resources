import path from "node:path";
import { config } from "./env.js";
import { exists, readJson, writeJson } from "./util.js";

/**
 * Per-episode usage ledger and spending guard.
 * Prices come from config/pricing.json; anything not published by the provider is marked "estimated".
 */
export interface UsageEntry {
  at: string;
  stage: string;
  provider: string;
  model: string;
  units: number;
  unit: string;
  estInr: number;
  priceBasis: string;
  note?: string;
  cached?: boolean;
}

interface Pricing {
  usdInr: number;
  models: Record<string, { unit: string; usdPerUnit: number; basis: string }>;
}

export class Budget {
  private file: string;
  entries: UsageEntry[];
  pricing: Pricing;

  constructor(episodeDir: string, root: string) {
    this.file = path.join(episodeDir, "reports", "usage.json");
    this.entries = exists(this.file) ? readJson<{ entries: UsageEntry[] }>(this.file).entries : [];
    this.pricing = readJson<Pricing>(path.join(root, "config", "pricing.json"));
  }

  spentInr(): number {
    return this.entries.filter((e) => !e.cached).reduce((a, e) => a + e.estInr, 0);
  }

  estimate(model: string, units: number): { inr: number; basis: string; unit: string } {
    const p = this.pricing.models[model];
    if (!p) return { inr: NaN, basis: "unknown price", unit: "?" };
    return { inr: units * p.usdPerUnit * this.pricing.usdInr, basis: p.basis, unit: p.unit };
  }

  /** Throws before a paid call that would exceed the cap. Unknown prices are refused unless explicitly allowed. */
  assertAffordable(model: string, units: number, capInr = config.budgetInr): void {
    const est = this.estimate(model, units);
    if (Number.isNaN(est.inr)) throw new Error(`Refusing paid call: no price on record for ${model}. Add it to config/pricing.json.`);
    const after = this.spentInr() + est.inr;
    if (after > capInr) throw new Error(`Budget cap ₹${capInr} would be exceeded (spent ₹${this.spentInr().toFixed(2)} + this call ₹${est.inr.toFixed(2)}).`);
  }

  record(e: Omit<UsageEntry, "at">): void {
    this.entries.push({ at: new Date().toISOString(), ...e });
    writeJson(this.file, { capInr: config.budgetInr, spentInr: Number(this.spentInr().toFixed(2)), entries: this.entries });
  }
}
