import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import "./fonts";
import { C, FONT_TITLE } from "./theme";
import { Camera, Layer, ShotCtx } from "./lib/anim";
import { Figure } from "./components/Figure";
import { Basket, Glow, Rain, Sky, Torch, Vignette, Wall, Clouds, archPath, Bed } from "./components/kit";

export type ThumbProps = { variant: "A" | "B" | "C" } & Record<string, unknown>;

const Title: React.FC<{ text: string; color?: string; x?: number; y?: number; size?: number; align?: "left" | "right" }> = ({ text, color = "#fff4dc", x = 80, y = 70, size = 150, align = "left" }) => (
  <div style={{ position: "absolute", [align]: x, top: y, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: size, lineHeight: 0.95, color, letterSpacing: 4, textShadow: "0 8px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.6)", maxWidth: 1000, textAlign: align }}>{text}</div>
);

/** Thumbnail art (1920x1080 master; exported to a 1280x720 JPG for upload). */
export const Thumbnail: React.FC<ThumbProps> = ({ variant }) => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(h));
  }, [h]);
  const ctx = { frame: 40, duration: 100, p: 0.4 };
  return (
    <ShotCtx.Provider value={ctx}>
      <Camera from={[0, 0, 1]} to={[0, 0, 1]}>
        {variant === "A" && (
          <AbsoluteFill>
            <Layer depth={0}>
              <Sky time="night" id="thA" />
              <Clouds y={40} color="#1c2333" count={8} opacity={0.9} />
            </Layer>
            <Layer depth={1}>
              <Wall x={-200} y={300} w={2400} h={800} color="#3e2a24" dark="#24160f" />
              <Torch x={1650} y={430} s={2.4} seed="tA" />
              <Glow id="thAglow" x={1150} y={700} r={700} color="#ffb347" intensity={0.35} />
              <g transform="translate(1180 1130)">
                <Basket x={0} y={0} s={5.2} lidOpen={0.32} />
              </g>
              {/* eyes peeking from under the lid */}
              <g transform="translate(1110 640) scale(1.6)">
                <ellipse cx={0} cy={0} rx={150} ry={46} fill="#1a1210" />
                <ellipse cx={-55} cy={4} rx={20} ry={14} fill="#f4ead6" />
                <ellipse cx={55} cy={4} rx={20} ry={14} fill="#f4ead6" />
                <circle cx={-50} cy={5} r={9} fill="#1a1210" />
                <circle cx={60} cy={5} r={9} fill="#1a1210" />
                <path d="M-90,-22 L-20,-14 M20,-14 L90,-22" stroke="#1a1210" strokeWidth={10} strokeLinecap="round" />
              </g>
              <Rain count={120} opacity={0.25} />
            </Layer>
            <Vignette strength={0.7} />
            <Title text="THE BASKET ESCAPE" size={140} y={70} />
          </AbsoluteFill>
        )}
        {variant === "B" && (
          <AbsoluteFill>
            <Layer depth={0}>
              <rect x={-200} y={-200} width={2400} height={1500} fill="#2b2633" />
              <path d={archPath(1450, 1080, 900, 1000)} fill="#c9b07a" />
              <Glow id="thBglow" x={1450} y={520} r={700} color="#ffe2a8" intensity={0.6} />
            </Layer>
            <Layer depth={1}>
              <rect x={1150} y={700} width={600} height={80} fill={C.marble} stroke={C.gold} strokeWidth={6} />
              <Figure costume="aurangzeb" pose={{ crouch: 0.7, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90, shR: 30, elR: 60, head: -6 }} x={1450} y={700} scale={1.05} facing={-1} holding="beads" />
              <Figure costume="shivaji" pose={{ hipR: 26, kneeR: 10, hipL: -22, kneeL: 30, shR: -20, elR: 14, shL: 20, elL: 14, lean: 4, brow: -1 }} x={560} y={1290} scale={2.25} facing={-1} />
            </Layer>
            <Vignette strength={0.6} />
            <Title text="HE TURNED HIS BACK" size={128} y={70} />
          </AbsoluteFill>
        )}
        {variant === "C" && (
          <AbsoluteFill>
            <Layer depth={0}>
              <rect x={-200} y={-200} width={2400} height={1500} fill="#5a4436" />
              <path d={archPath(1560, 640, 300, 420)} fill="#ffd9a8" />
            </Layer>
            <Layer depth={1}>
              <rect x={-200} y={760} width={2400} height={500} fill="#8a6a52" />
              <Bed x={1000} y={800} w={900} empty />
              <Figure costume="guard" pose={{ shR: 150, elR: 20, shL: 140, elL: 20, lean: -10, brow: 1, mouth: 1 }} x={360} y={1180} scale={1.9} />
            </Layer>
            <Vignette strength={0.6} />
            <Title text="VANISHED" size={190} align="right" x={80} y={800} color="#fff4dc" />
          </AbsoluteFill>
        )}
      </Camera>
    </ShotCtx.Provider>
  );
};
