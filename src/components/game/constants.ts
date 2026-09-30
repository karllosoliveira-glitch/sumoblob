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

export function spawnAngle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return (hash % 360) * (Math.PI / 180);
}
