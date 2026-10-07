export const ARENA_R = 9;
export const PLAYER_R = 0.88;
export const ACCEL = 42;
export const DRAG = 4.8;
export const MAX_SPEED = 10.5;
export const STEER_RESPONSE = 12;
export const STOP_RESPONSE = 15;
export const MAX_TURN_RATE = 11;
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
export const SOAP_DRAG = 1.15;
export const SOAP_ACCEL = 25;
export const SOAP_STEER_RESPONSE = 9;
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
export const RACE_DRAG = 0.7;
export const RACE_ACCEL = 34;
export const RACE_MAX_SPEED = 15;
export type RaceObstacleType = "soap" | "bumper" | "banana" | "spinner" | "hammer" | "ramp" | "mover";
export type RaceObstacle = { x: number; z: number; r: number; type: RaceObstacleType };
export const RACE_OBSTACLES: RaceObstacle[] = [
  // setor 1: largada escorregadia
  { x: -34, z: 0, r: 1.35, type: "soap" },
  { x: -29, z: -3.4, r: 1.15, type: "bumper" },
  { x: -24, z: 3.1, r: 1.1, type: "banana" },
  { x: -19, z: -1.5, r: 1.5, type: "soap" },
  // setor 2: martelos e para-choques que andam
  { x: -14, z: 0, r: 1.1, type: "hammer" },
  { x: -9, z: -3.5, r: 1.25, type: "banana" },
  { x: -6, z: 0, r: 1.2, type: "mover" },
  { x: -1, z: 0, r: 1.7, type: "spinner" },
  // atalho: rampa colada na borda pula o setor 3
  { x: 4, z: -5, r: 1.2, type: "ramp" },
  { x: 8, z: 0, r: 1.45, type: "soap" },
  { x: 11, z: 2, r: 1.2, type: "bumper" },
  { x: 14, z: 0, r: 1.1, type: "hammer" },
  // setor 4: reta final caótica
  { x: 19, z: 3.4, r: 1.15, type: "banana" },
  { x: 22, z: 0, r: 1.2, type: "mover" },
  { x: 26, z: -1, r: 1.55, type: "spinner" },
  { x: 31, z: 0, r: 1.1, type: "hammer" },
  { x: 34, z: -1.6, r: 1.35, type: "soap" },
  { x: 37, z: 3.3, r: 1.05, type: "banana" },
];
export const RACE_CHECKPOINTS = [-16, 2, 20];

/** Posição/ângulo de obstáculos que se mexem; usa o relógio comum (Date.now) pra bater entre as telas. */
export function obstacleState(o: RaceObstacle, t: number) {
  if (o.type === "hammer") { const swing = Math.sin(t * 1.7 + o.x); return { x: o.x, z: swing * (RACE_LANE_HALF - 1.2), swing, angle: 0 }; }
  if (o.type === "mover") return { x: o.x, z: Math.sin(t * 1.2 + o.x * 0.5) * (RACE_LANE_HALF - 1.6), swing: 0, angle: 0 };
  if (o.type === "spinner") return { x: o.x, z: o.z, swing: 0, angle: t * 2.4 };
  return { x: o.x, z: o.z, swing: 0, angle: 0 };
}
export const worldTime = () => (Date.now() % 1_000_000) / 1000;

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
