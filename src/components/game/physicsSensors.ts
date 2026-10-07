import { ARENA_R, FIELD_X, FIELD_Z, GOAL_HALF, PLAYER_R, RACE_CHECKPOINTS, RACE_LANE_HALF, RACE_X_FINISH } from "./constants";

export type SensorHit = "goalA" | "goalB" | "fall" | "finish" | `checkpoint:${number}`;

export const physicsSensors = {
  goal(x: number, z: number): SensorHit | null {
    if (Math.abs(z) > GOAL_HALF) return null;
    if (x > FIELD_X + 0.6) return "goalA";
    if (x < -FIELD_X - 0.6) return "goalB";
    return null;
  },
  fall(x: number, z: number): boolean {
    return Math.hypot(x, z) >= ARENA_R - PLAYER_R * 0.15;
  },
  checkpoint(x: number, z: number, current: number): number {
    if (Math.abs(z) > RACE_LANE_HALF + PLAYER_R) return current;
    let next = current;
    while (next < RACE_CHECKPOINTS.length && x >= RACE_CHECKPOINTS[next]) next++;
    return next;
  },
  finish(x: number, z: number): boolean {
    return x >= RACE_X_FINISH && Math.abs(z) <= RACE_LANE_HALF + PLAYER_R;
  },
} as const;
