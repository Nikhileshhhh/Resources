import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import "./fonts";
import { FONT_TITLE } from "./theme";

export type ThumbProps = { variant: "A" | "B" | "C" } & Record<string, unknown>;

const Title: React.FC<{ text: string; color?: string; x?: number; y?: number; size?: number; align?: "left" | "right" }> = ({ text, color = "#fff4dc", x = 80, y = 70, size = 150, align = "left" }) => (
  <div style={{ position: "absolute", [align]: x, top: y, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: size, lineHeight: 0.95, color, letterSpacing: 4, textShadow: "0 8px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.6)", maxWidth: 1000, textAlign: align }}>{text}</div>
);

/**
 * Thumbnail title layer (transparent, 1920x1080 master). The picture underneath is a hero frame rendered from the
 * Episode composition itself (see thumbsStage), so the thumbnail shows exactly what is in the film.
 */
export const Thumbnail: React.FC<ThumbProps> = ({ variant }) => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(h));
  }, [h]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
      {variant === "A" && <Title text="THE BASKET ESCAPE" size={140} y={70} />}
      {variant === "B" && <Title text="HE TURNED HIS BACK" size={128} y={70} />}
      {variant === "C" && <Title text="VANISHED" size={190} align="right" x={80} y={800} color="#fff4dc" />}
    </AbsoluteFill>
  );
};
