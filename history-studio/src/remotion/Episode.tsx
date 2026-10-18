import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender, interpolate, useCurrentFrame } from "remotion";
import "./fonts";
import { C, FONT_BODY, FONT_TITLE } from "./theme";
import { Camera, ShotCtx, clamp, easeOut } from "./lib/anim";
import { Vignette } from "./components/kit";
import * as Ext from "./sets/exteriors";
import * as Int from "./sets/interiors";
import * as Gfx from "./sets/graphics";

export interface ShotT {
  id: string;
  comp: string;
  props: Record<string, unknown>;
  camera: { from: [number, number, number]; to: [number, number, number]; ease?: "inOut" | "out" | "linear" };
  text?: { kind: "slate" | "quote" | "label" | "caption"; value: string; sub?: string; attribution?: string };
  startFrame: number;
  endFrame: number;
}
export interface TimelineT {
  episodeId: string;
  fps: number;
  durationFrames: number;
  disclosure: string;
  endScreenStartFrame: number;
  scenes: { id: string; shots: ShotT[] }[];
}

const REGISTRY: Record<string, React.FC<any>> = { ...Ext, ...Int, ...Gfx };
const XF = 10; // crossfade frames between shots

const ShotText: React.FC<{ t: NonNullable<ShotT["text"]>; duration: number }> = ({ t, duration }) => {
  const f = useCurrentFrame();
  const inA = t.kind === "quote" ? 14 : 8;
  const o = interpolate(f, [inA, inA + 14, duration - 4, duration + XF - 2], [0, 1, 1, 0], clamp);
  const rise = interpolate(f, [inA, inA + 20], [24, 0], { ...clamp, easing: easeOut });
  const shadow = "0 3px 16px rgba(0,0,0,0.75)";
  if (t.kind === "slate")
    return (
      <div style={{ position: "absolute", left: 60, top: 56, opacity: o, transform: `translateY(${rise}px)`, padding: "22px 36px 20px", background: "linear-gradient(90deg, rgba(12,10,16,0.62), rgba(12,10,16,0))", borderRadius: 6 }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 600, fontSize: 50, letterSpacing: 9, color: C.parchment, textShadow: shadow }}>{t.value}</div>
        <div style={{ width: 160, height: 4, background: C.saffron, marginTop: 14 }} />
      </div>
    );
  if (t.kind === "label")
    return (
      <div style={{ position: "absolute", left: 96, top: 700, opacity: o, transform: `translateY(${rise}px)`, borderLeft: `6px solid ${C.saffron}`, paddingLeft: 22 }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 58, color: "#fff7e6", textShadow: shadow }}>{t.value}</div>
        {t.sub && <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 36, color: "#f0e2c6", textShadow: shadow, marginTop: 4 }}>{t.sub}</div>}
      </div>
    );
  if (t.kind === "caption")
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${-rise / 2}px)` }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 42, color: "#fff7e6", background: "rgba(15,12,20,0.66)", padding: "12px 34px", borderRadius: 40, maxWidth: 1500, textAlign: "center" }}>{t.value}</div>
      </div>
    );
  // quote card: centred, kept above the caption zone at the bottom of the frame
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 650, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${rise}px)` }}>
      <div style={{ maxWidth: 1400, background: "rgba(20,15,12,0.78)", border: `3px solid ${C.parchmentDark}`, borderRadius: 10, padding: "26px 48px", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ fontFamily: FONT_BODY, fontStyle: "italic", fontSize: 54, lineHeight: 1.18, color: "#fbf1dc", textAlign: "center" }}>{t.value}</div>
        {t.attribution && <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, color: C.gold, textAlign: "center", marginTop: 12 }}>— {t.attribution}</div>}
      </div>
    </div>
  );
};

const ShotView: React.FC<{ shot: ShotT; duration: number; fadeIn: boolean }> = ({ shot, duration, fadeIn }) => {
  const f = useCurrentFrame();
  const Comp = REGISTRY[shot.comp];
  const opacity = fadeIn ? interpolate(f, [0, XF], [0, 1], clamp) : 1;
  const coreDuration = duration - XF;
  return (
    <ShotCtx.Provider value={{ frame: f, duration: coreDuration, p: Math.min(1, Math.max(0, f / Math.max(1, duration))) }}>
      <AbsoluteFill style={{ opacity }}>
        <Camera from={shot.camera.from} to={shot.camera.to} ease={shot.camera.ease}>
          {Comp ? <Comp {...shot.props} /> : <AbsoluteFill style={{ background: "#300", color: "#fff", fontSize: 60 }}>Missing set: {shot.comp}</AbsoluteFill>}
        </Camera>
        <Vignette strength={0.5} />
        {shot.text && <ShotText t={shot.text} duration={coreDuration} />}
      </AbsoluteFill>
    </ShotCtx.Provider>
  );
};

const Disclosure: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [10, 30, 210, 240], [0, 0.9, 0.9, 0], clamp);
  return <div style={{ position: "absolute", right: 60, top: 48, fontFamily: FONT_BODY, fontSize: 28, color: "#efe6d2", opacity: o, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{text} · illustrated reconstruction</div>;
};

export const Episode: React.FC<{ timeline: TimelineT; range?: [number, number] }> = ({ timeline }) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);
  const shots = timeline.scenes.flatMap((s) => s.shots);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {shots.map((sh, i) => {
        const last = i === shots.length - 1;
        const dur = sh.endFrame - sh.startFrame + (last ? 0 : XF);
        return (
          <Sequence key={sh.id} from={sh.startFrame} durationInFrames={dur} name={sh.id}>
            <ShotView shot={sh} duration={dur} fadeIn={i > 0} />
          </Sequence>
        );
      })}
      <Sequence from={0} durationInFrames={260}>
        <Disclosure text={timeline.disclosure.replace(/ \(.*\)$/, "")} />
      </Sequence>
    </AbsoluteFill>
  );
};
