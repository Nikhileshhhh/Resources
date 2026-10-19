import type { Pose3 } from "../character/Character3D";

/** Acting library: static key poses that shots blend between with `keyed()`/`mix()`. Angles in degrees. */

export const STAND: Pose3 = { shL: 2, shR: 2, elL: 10, elR: 10, kneeL: 2, kneeR: 2 };

/** Seated cross-legged on a cushion (throne, floor). Pelvis lowered; robe splays over the knees. */
export const SIT_CROSS: Pose3 = { drop: 0.6, hipL: 82, hipLAbd: 48, kneeL: 145, ankleL: 30, hipR: 82, hipRAbd: 48, kneeR: 145, ankleR: 30, skirtSplay: 1, spine: 4, shL: 18, shR: 18, elL: 70, elR: 70, shLAbd: 6, shRAbd: 6 };

/** Down on the right knee, left foot planted: the presenting / submission posture. */
export const KNEEL: Pose3 = { drop: 0.42, hipL: 82, kneeL: 88, ankleL: -6, hipR: 4, kneeR: 98, ankleR: 60, spine: 10, skirtSplay: 0.35 };

/** Both hands forward at chest height (holding a tray or an offering). */
export const OFFER: Pose3 = { shL: 62, shR: 62, elL: 36, elR: 36, shLAbd: -14, shRAbd: -14, wristL: -20, wristR: -20 };

/** Taslim / kornish: bowed, right palm raised to the forehead. */
export const BOW: Pose3 = { spine: 28, chest: 6, head: 18, shR: 128, shRAbd: -18, elR: 118, wristR: 10, shL: 10, elL: 14 };

/** Crouched small (inside a basket): knees to chest, arms wrapped round the shins, head low but eyes up. */
export const CROUCH: Pose3 = { drop: 0.6, hipL: 125, kneeL: 150, ankleL: 25, hipR: 125, kneeR: 150, ankleR: 25, hipLAbd: 8, hipRAbd: 8, spine: 32, chest: 10, head: -6, shL: 24, shR: 24, elL: 70, elR: 70, shLAbd: -36, shRAbd: -36, shLTwist: -20, shRTwist: -20, wristL: 10, wristR: 10, lookY: 0.8 };

/** Crouched at a pole, ready to lift (porter). */
export const SQUAT_LIFT: Pose3 = { drop: 0.42, hipL: 95, kneeL: 115, ankleL: 22, hipR: 95, kneeR: 115, ankleR: 22, spine: 28, head: -12, shR: 150, shRAbd: 6, elR: 120, shL: 30, elL: 30 };

/** Right arm steadying a pole on the right shoulder while walking (porter carry). */
export const CARRY_R: Pose3 = { shR: 150, shRAbd: 6, elR: 120, wristR: 10 };

/** Torch held up and out, elbow bent (night guard). */
export const TORCH_HOLD_R: Pose3 = { shR: 38, shRAbd: 10, elR: 70, wristR: 0 };

/** Spear grounded at the left side (sentry). */
export const SPEAR_REST_L: Pose3 = { shL: 22, shLAbd: 14, elL: 62 };

/** Arms folded across the chest (impatience / authority). */
export const ARMS_FOLDED: Pose3 = { shL: 22, shR: 22, elL: 100, elR: 100, shLAbd: -8, shRAbd: -8, shLTwist: -75, shRTwist: -75 };

/** Hands clasped low in front (courtier waiting). */
export const HANDS_CLASPED: Pose3 = { shL: 20, shR: 20, elL: 42, elR: 42, shLAbd: -16, shRAbd: -16 };

/** Wave-through gesture (right forearm sweeps outward); blend weight drives the sweep. */
export const WAVE_ON: Pose3 = { shR: 55, shRAbd: 30, elR: 55, wristR: -15, headTurn: 25 };
