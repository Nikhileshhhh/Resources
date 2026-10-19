import type React from "react";
import { BasketCutaway3D, Compound3D, FortNight3D, GateNight3D, type Shot3DProps } from "./sets/night";
import { CourtHall3D } from "./sets/court";

/**
 * 3D versions of shot compositions. `supports` decides per shot (by its props) whether the 3D version covers it;
 * anything not yet covered falls back to the 2D composition, so the episode always renders.
 */
export const REGISTRY3D: Record<string, { comp: React.FC<Shot3DProps>; supports: (p: Record<string, unknown>) => boolean }> = {
  FortExterior: { comp: FortNight3D, supports: (p) => p.time === "night" },
  Compound: { comp: Compound3D, supports: (p) => p.time === "night" },
  CourtHall: { comp: CourtHall3D, supports: (p) => p.beat === "presentation" || p.beat === "silence" },
  BasketCutaway: { comp: BasketCutaway3D, supports: () => true },
  GateNight: { comp: GateNight3D, supports: () => true },
};
