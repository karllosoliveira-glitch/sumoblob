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
export const BALL_R = 0.65;
export const SOAP_DRAG = 0.85;
export const SOAP_ACCEL = 24;
export const SOAP_STEER_RESPONSE = 5;
export const SOCCER_MAX_SPEED = 8.5;
export const BALL_MAX_SPEED = 26;
export const BALL_BOUNCE = 0.88;
export const BALL_ROLL_DRAG = 0.24;
export const KICK_POWER = 22;
export const KICK_COOLDOWN = 0.48;
export const KICK_LIFT = 4.8;
export const KICK_SPIN = 0.16;

// Circuit race movement; layout and lap logic live in raceCircuit.ts.
export const RACE_DRAG = 0.7;
export const RACE_ACCEL = 34;
export const RACE_MAX_SPEED = 15;
export type RaceObstacleType = "soap" | "bumper" | "banana" | "spinner" | "hammer" | "ramp" | "mover";
export type RaceObstacle = { x: number; z: number; r: number; type: RaceObstacleType; nx?: number; nz?: number; heading?: number };

/** Posição/ângulo de obstáculos que se mexem; usa o relógio comum (Date.now) pra bater entre as telas. */
export function obstacleState(o: RaceObstacle, t: number) {
  if (o.type === "hammer" || o.type === "mover") {
    const swing = Math.sin(t * (o.type === "hammer" ? 1.7 : 1.2) + o.x);
    const offset = swing * (o.type === "hammer" ? 4 : 3);
    return { x: o.x + (o.nx ?? 0) * offset, z: o.z + (o.nz ?? 1) * offset, swing, angle: o.heading ?? 0 };
  }
  if (o.type === "spinner") return { x: o.x, z: o.z, swing: 0, angle: t * 2.4 };
  return { x: o.x, z: o.z, swing: 0, angle: 0 };
}
export const worldTime = () => (Date.now() % 1_000_000) / 1000;

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
