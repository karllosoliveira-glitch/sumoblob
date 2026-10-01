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

// corrida maluca
export const RACE_X_MIN = -16;
export const RACE_X_FINISH = 15;
export const RACE_LANE_HALF = 5.2;
export const RACE_DRAG = 0.42;
export const RACE_ACCEL = 29;
export const RACE_MAX_SPEED = 12;
export const RACE_OBSTACLES = [
  { x: -8, z: 0, r: 1.25, type: "soap" as const },
  { x: -3, z: -3, r: 1.05, type: "bumper" as const },
  { x: 1, z: 2.6, r: 1.05, type: "banana" as const },
  { x: 5, z: -2.2, r: 1.35, type: "soap" as const },
  { x: 9, z: 2.8, r: 1.1, type: "bumper" as const },
];

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
