import React from "react";
import { Composition } from "remotion";
import { Episode, type TimelineT } from "./Episode";
import { Thumbnail, type ThumbProps } from "./Thumbnail";
import { RigTest } from "./test/RigTest";
import { Char3DTest } from "./test/Char3DTest";
import { CrownTest } from "./test/CrownTest";
import { TableTest } from "./test/TableTest";

const EMPTY: TimelineT = { episodeId: "none", fps: 30, durationFrames: 300, disclosure: "", endScreenStartFrame: 0, scenes: [] };

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={300}
      defaultProps={{ timeline: EMPTY }}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, props.timeline.durationFrames) })}
    />
    <Composition id="Thumbnail" component={Thumbnail} fps={30} width={1920} height={1080} durationInFrames={1} defaultProps={{ variant: "A" } as ThumbProps} />
    <Composition id="TableTest" component={TableTest} durationInFrames={60} fps={30} width={1920} height={1080} />
    <Composition id="CrownTest" component={CrownTest} durationInFrames={30} fps={30} width={1920} height={1080} />
    <Composition id="Char3DTest" component={Char3DTest} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="RigTest" component={RigTest} durationInFrames={60} fps={30} width={1920} height={1080} />
  </>
);
