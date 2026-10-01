export const ARENA_R = 9;
export const PLAYER_R = 0.88;
export const ACCEL = 34;
export const DRAG = 3.2;
export const MAX_SPEED = 9;
export const PUSH = 16;
export const DASH_PUSH = 34;
export const DASH_SPEED = 16;
export const DASH_TIME = 0.28;
export const DASH_COOLDOWN = 1.1;
export const GRAVITY = -26;

// futebol de sabão
export const FIELD_X = 12;
export const FIELD_Z = 7.5;
export const GOAL_HALF = 2.4;
export const BALL_R = 1.1;
export const SOAP_DRAG = 0.9;
export const SOAP_ACCEL = 22;
export const SOCCER_MAX_SPEED = 11;
export const BALL_MAX_SPEED = 32;
export const BALL_BOUNCE = 0.88;
export const BALL_ROLL_DRAG = 0.24;
export const KICK_POWER = 13;
export const KICK_COOLDOWN = 0.48;
export const KICK_LIFT = 4.8;
export const KICK_SPIN = 0.16;

// corrida maluca — pista longa, com setores e obstáculos
export const RACE_X_MIN = -42;
export const RACE_X_FINISH = 42;
export const RACE_LANE_HALF = 6.2;
export const RACE_DRAG = 0.42;
export const RACE_ACCEL = 31;
export const RACE_MAX_SPEED = 14;
export const RACE_OBSTACLES = [
  { x: -34, z: 0, r: 1.35, type: "soap" as const },
  { x: -29, z: -3.4, r: 1.15, type: "bumper" as const },
  { x: -24, z: 3.1, r: 1.1, type: "banana" as const },
  { x: -19, z: -1.5, r: 1.5, type: "soap" as const },
  { x: -14, z: 3.6, r: 1.1, type: "bumper" as const },
  { x: -9, z: -3.5, r: 1.25, type: "banana" as const },
  { x: -4, z: 0, r: 1.7, type: "spinner" as const },
  { x: 2, z: 3.4, r: 1.2, type: "bumper" as const },
  { x: 8, z: -3.4, r: 1.45, type: "soap" as const },
  { x: 14, z: 1.4, r: 1.15, type: "banana" as const },
  { x: 20, z: -3.5, r: 1.25, type: "bumper" as const },
  { x: 26, z: 3.4, r: 1.55, type: "spinner" as const },
  { x: 32, z: -1.6, r: 1.35, type: "soap" as const },
  { x: 37, z: 3.3, r: 1.05, type: "banana" as const },
];

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
