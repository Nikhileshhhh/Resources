import React from "react";
import { useCurrentFrame } from "remotion";
import { tabletop } from "../three/sets/tabletop";

const Empty: React.FC = () => <div style={{ position: "absolute", inset: 0, background: "rgba(230,215,180,0.5)" }} />;
const T = tabletop(Empty, "desk");
export const TableTest: React.FC = () => {
  const f = useCurrentFrame();
  return <T frame={f} duration={60} cue={() => 0} shotId="t" />;
};
