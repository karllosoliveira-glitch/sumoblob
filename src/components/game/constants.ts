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

// futebol de sabão — física propositalmente exagerada e cartunesca
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

// corrida maluca
export const RACE_X_MIN = -8.5;
export const RACE_X_FINISH = 8;
export const RACE_LANE_HALF = 5.2;
export const RACE_DRAG = 0.42;
export const RACE_ACCEL = 29;
export const RACE_MAX_SPEED = 12;
export const RACE_OBSTACLES = [
  { x: -4.5, z: 0, r: 1.25, type: "soap" as const },
  { x: -2.0, z: -3, r: 1.05, type: "bumper" as const },
  { x: 0.5, z: 2.6, r: 1.05, type: "banana" as const },
  { x: 3.2, z: -2.2, r: 1.35, type: "soap" as const },
  { x: 5.5, z: 2.8, r: 1.1, type: "bumper" as const },
];

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
