import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Figure, walkPose, walkBob, idle } from "../components/Figure";
import { C } from "../theme";

export const RigTest: React.FC = () => {
  const f = useCurrentFrame();
  const names = ["shivaji", "sambhaji", "aurangzeb", "ramsingh", "jaisingh", "jaswant", "fuladkhan", "guard", "rajputguard", "porter", "official", "brahmin", "ascetic", "european", "shivaji_ascetic", "boy"] as const;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${C.dayHaze}, ${C.parchment})` }}>
      <svg width={1920} height={1080}>
        {names.map((n, i) => {
          const col = i % 8;
          const row = Math.floor(i / 8);
          const ph = f / 30 + i * 0.13;
          const pose = i % 3 === 0 ? { ...walkPose(ph), ...idle(f, i) } : i % 3 === 1 ? { ...idle(f, i), shR: 70, elR: 40, brow: -1, mouth: 0.6 } : { ...idle(f, i), lean: 18, head: 12, shR: 30, elR: 60 };
          return (
            <g key={n}>
              <Figure costume={n} pose={pose} x={140 + col * 230} y={470 + row * 500 + (i % 3 === 0 ? walkBob(ph) : 0)} scale={1.05} />
              <text x={140 + col * 230} y={500 + row * 500} textAnchor="middle" fontSize={22} fill="#333">{n}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
