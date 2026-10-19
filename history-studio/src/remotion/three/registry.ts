import type React from "react";
import { BasketCutaway3D, Compound3D, FortNight3D, GateNight3D, type Shot3DProps } from "./sets/night";
import { CourtHall3D } from "./sets/court";
import { tabletop } from "./sets/tabletop";
import { Bedroom3D, EmptyBed3D, WindowSilhouette3D } from "./sets/bedroom";
import * as G from "../sets/graphics";

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
  Bedroom: { comp: Bedroom3D, supports: () => true },
  EmptyBed: { comp: EmptyBed3D, supports: () => true },
  WindowSilhouette: { comp: WindowSilhouette3D, supports: () => true },
  // documents, maps and diagrams: the fact-checked 2D artwork as a sheet in a 3D scene
  MapScene: { comp: tabletop(G.MapScene, "desk"), supports: () => true },
  FortsGrid: { comp: tabletop(G.FortsGrid, "desk"), supports: () => true },
  Options: { comp: tabletop(G.Options, "desk"), supports: () => true },
  Bond: { comp: tabletop(G.Bond, "desk"), supports: () => true },
  Petitions: { comp: tabletop(G.Petitions, "desk"), supports: () => true },
  Coins: { comp: tabletop(G.Coins, "desk"), supports: () => true },
  SplitCompare: { comp: tabletop(G.SplitCompare, "desk"), supports: () => true },
  LettersReveal: { comp: tabletop(G.LettersReveal, "desk"), supports: () => true },
  EvidenceBoard: { comp: tabletop(G.EvidenceBoard, "wall"), supports: () => true },
  RankLoss: { comp: tabletop(G.RankLoss, "wall"), supports: () => true },
};
