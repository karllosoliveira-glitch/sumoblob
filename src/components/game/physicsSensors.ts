import { ARENA_R, FIELD_X, GOAL_HALF, PLAYER_R } from "./constants";

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
} as const;
