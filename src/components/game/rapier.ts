import * as RAPIER from "@dimforge/rapier3d-compat";

let initPromise: Promise<typeof RAPIER> | null = null;
export function initRapier() {
  if (!initPromise) initPromise = RAPIER.init().then(() => RAPIER);
  return initPromise;
}

export class SoccerPhysics {
  readonly world: RAPIER.World;
  readonly playerBody: RAPIER.RigidBody;
  readonly ballBody: RAPIER.RigidBody;
  private ready = false;

  static async create(fieldX: number, fieldZ: number, playerRadius: number, ballRadius: number) {
    const R = await initRapier();
    const physics = new SoccerPhysics(R, fieldX, fieldZ, playerRadius, ballRadius);
    physics.ready = true;
    return physics;
  }

  private constructor(R: typeof RAPIER, fieldX: number, fieldZ: number, playerRadius: number, ballRadius: number) {
    this.world = new R.World({ x: 0, y: -22, z: 0 });\n    this.world.integrationParameters.dt = 1 / 60;\n    this.world.integrationParameters.numSolverIterations = 8;

    const floor = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    this.world.createCollider(
      R.ColliderDesc.cuboid(fieldX + 2, 0.5, fieldZ + 2)
        .setFriction(0.12)
        .setRestitution(0.18),
      floor,
    );

    this.playerBody = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(0, playerRadius + 0.03, 0)
        .setLinearDamping(2.2)
        .setAngularDamping(8)
        .lockRotations()\n        .setCcdEnabled(true),
    );
    this.playerBody.setAdditionalMass(1.8, true);
    this.world.createCollider(
      R.ColliderDesc.ball(playerRadius).setFriction(0.38).setRestitution(0.05).setDensity(1.5),
      this.playerBody,
    );

    this.ballBody = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(0, ballRadius + 0.03, 0)
        .setLinearDamping(0.18)
        .setAngularDamping(0.08)\n        .setCcdEnabled(true),
    );
    this.ballBody.setAdditionalMass(0.55, true);
    this.world.createCollider(
      R.ColliderDesc.ball(ballRadius).setFriction(0.32).setRestitution(0.78).setDensity(0.55),
      this.ballBody,
    );
  }

  resetPlayer(x: number, z: number, y = 0.92) {
    this.playerBody.setTranslation({ x, y, z }, true);
    this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.playerBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  resetBall(x = 0, z = 0, y = 1.13) {
    this.ballBody.setTranslation({ x, y, z }, true);
    this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  drivePlayer(targetX: number, targetZ: number, response: number, maxSpeed: number) {
    if (!this.ready) return;
    const v = this.playerBody.linvel();
    const blend = 1 - Math.exp(-response / 60);
    this.playerBody.setLinvel({
      x: v.x + (Math.max(-maxSpeed, Math.min(maxSpeed, targetX)) - v.x) * blend,
      y: v.y,
      z: v.z + (Math.max(-maxSpeed, Math.min(maxSpeed, targetZ)) - v.z) * blend,
    }, true);
  }

  kickBall(dx: number, dz: number, power: number, lift = 4.8, spin = 2.5) {
    const length = Math.hypot(dx, dz) || 1;
    const x = dx / length;
    const z = dz / length;
    const v = this.ballBody.linvel();
    this.ballBody.setLinvel({
      x: v.x * 0.35 + x * power,
      y: Math.max(v.y, lift),
      z: v.z * 0.35 + z * power,
    }, true);
    this.ballBody.applyTorqueImpulse({ x: 0, y: spin, z: 0 }, true);
  }

  tackleBall(dx: number, dz: number, power = 18) {
    this.kickBall(dx, dz, power, 2.2, 5);
  }

  step(dt: number) {
    if (!this.ready) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }

  playerState() {
    const p = this.playerBody.translation(), v = this.playerBody.linvel();
    return { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z };
  }

  ballState() {
    const p = this.ballBody.translation(), v = this.ballBody.linvel();
    return { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z };
  }
}


let soccerPhysicsPromise: Promise<SoccerPhysics> | null = null;
export function getSoccerPhysics() {
  if (!soccerPhysicsPromise) soccerPhysicsPromise = SoccerPhysics.create(12, 7.5, 0.88, 1.1);
  return soccerPhysicsPromise;
}
