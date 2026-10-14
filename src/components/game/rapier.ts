import * as RAPIER from "@dimforge/rapier3d-compat";
import { PHYSICS_CONFIG, physicsStepStats } from "@/config/physicsConfig";
import { BALL_R, FIELD_X, FIELD_Z, GOAL_HALF, PLAYER_R } from "./constants";

let initPromise: Promise<typeof RAPIER> | null = null;
export function initRapier() {
  if (!initPromise) initPromise = RAPIER.init().then(() => RAPIER);
  return initPromise;
}
export type SoccerBody = { id: string; x: number; z: number; y: number; vx: number; vz: number; ry: number; kick: number; kickSeq: number; tackle: number };
const groups = (membership: number, filter: number) => (membership << 16) | filter;

export class SoccerPhysics {
  readonly world: RAPIER.World;
  readonly ballBody: RAPIER.RigidBody;
  private accumulator = 0;
  private readonly players = new Map<string, RAPIER.RigidBody>();
  private readonly goalSensors = new Map<"A" | "B", RAPIER.Collider>();

  static async create(fieldX: number, fieldZ: number, playerRadius: number, ballRadius: number) {
    const R = await initRapier();
    return new SoccerPhysics(R, fieldX, fieldZ, playerRadius, ballRadius);
  }

  private constructor(R: typeof RAPIER, fieldX: number, fieldZ: number, private readonly playerRadius: number, private readonly ballRadius: number) {
    const C = PHYSICS_CONFIG.collision;
    this.world = new R.World({ x: 0, y: PHYSICS_CONFIG.gravity, z: 0 });
    this.world.integrationParameters.numSolverIterations = PHYSICS_CONFIG.solverIterations;
    const fixedBox = (x: number, y: number, z: number, hx: number, hy: number, hz: number, bounce = 0.48) => {
      const body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y, z));
      this.world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setCollisionGroups(groups(C.world, C.ball)).setFriction(0.28).setRestitution(bounce).setRestitutionCombineRule(R.CoefficientCombineRule.Min), body);
    };
    fixedBox(0, -0.5, 0, fieldX + 3, 0.5, fieldZ + 1, 0.52);
    for (const side of [-1, 1]) {
      fixedBox(0, 2, side * (fieldZ + 0.15), fieldX + 2, 2, 0.15);
      const endHalf = (fieldZ - GOAL_HALF) / 2;
      for (const zSide of [-1, 1]) {
        fixedBox(side * (fieldX + 0.15), 2, zSide * (GOAL_HALF + endHalf), 0.15, 2, endHalf);
        const post = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(side * fieldX, 1.3, zSide * GOAL_HALF));
        this.world.createCollider(R.ColliderDesc.cylinder(1.3, 0.18).setCollisionGroups(groups(C.world, C.ball)).setRestitution(0.6).setFriction(0.2), post);
        fixedBox(side * (fieldX + 1.3), 1.3, zSide * (GOAL_HALF + 0.1), 1.3, 1.3, 0.1, 0.15);
      }
      fixedBox(side * fieldX, 2.6, 0, 0.18, 0.18, GOAL_HALF, 0.6);
      fixedBox(side * (fieldX + 2.5), 1.3, 0, 0.1, 1.3, GOAL_HALF, 0.1);
      const sensor = this.world.createCollider(R.ColliderDesc.cuboid(0.7, 1.3, GOAL_HALF - 0.18).setTranslation(side * (fieldX + 1.5), 1.3, 0).setSensor(true).setCollisionGroups(groups(C.sensor, C.ball)));
      this.goalSensors.set(side > 0 ? "A" : "B", sensor);
    }
    this.ballBody = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, ballRadius + 0.01, 0).setLinearDamping(0.08).setAngularDamping(0.3).setCcdEnabled(true));
    this.world.createCollider(R.ColliderDesc.ball(ballRadius).setMass(0.43).setFriction(0.28).setRestitution(0.58).setRestitutionCombineRule(R.CoefficientCombineRule.Min).setCollisionGroups(groups(C.ball, C.world | C.player | C.sensor)), this.ballBody);
  }

  syncPlayers(bodies: SoccerBody[], dt: number) {
    const active = new Set(bodies.map(b => b.id));
    for (const [id, body] of this.players) if (!active.has(id)) { this.world.removeRigidBody(body); this.players.delete(id); }
    for (const b of bodies) {
      let body = this.players.get(b.id);
      if (!body) {
        body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased());
        this.world.createCollider(RAPIER.ColliderDesc.ball(this.playerRadius).setCollisionGroups(groups(PHYSICS_CONFIG.collision.player, PHYSICS_CONFIG.collision.ball)).setFriction(0.15).setRestitution(0.12), body);
        this.players.set(b.id, body);
      }
      // Re-anchor once per frame; kinematic velocity supplies one physical contact impulse.
      body.setTranslation({ x: b.x, y: this.playerRadius + b.y, z: b.z }, true);
      body.setLinvel({ x: b.vx, y: 0, z: b.vz }, true);
    }
  }

  isBallInsideGoal(side: "A" | "B") {
    const p = this.ballBody.translation();
    return (side === "A" ? p.x : -p.x) > FIELD_X + this.ballRadius && Math.abs(p.z) < GOAL_HALF - this.ballRadius - 0.18 && p.y + this.ballRadius < 2.42;
  }

  resetBall(x = 0, z = 0, y = this.ballRadius + 0.01) {
    this.accumulator = 0;
    this.ballBody.setTranslation({ x, y, z }, true);
    this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  kickBall(dx: number, dz: number, power: number, lift = 0.8, spin = 0) {
    const length = Math.hypot(dx, dz) || 1;
    const v = this.ballBody.linvel();
    // A kick is one impulse toward a target speed, never re-applied every frame.
    const mass = this.ballBody.mass();
    this.ballBody.applyImpulse({ x: (dx / length * power - v.x) * mass, y: (lift - v.y) * mass, z: (dz / length * power - v.z) * mass }, true);
    this.ballBody.setAngvel({ x: dz / length * power / this.ballRadius, y: spin, z: -dx / length * power / this.ballRadius }, true);
  }

  step(dt: number) {
    this.accumulator += Math.min(Math.max(dt, 0), PHYSICS_CONFIG.maxFrameDt);
    let subSteps = 0;
    while (this.accumulator >= PHYSICS_CONFIG.fixedDt && subSteps < PHYSICS_CONFIG.maxSubSteps) {
      const v = this.ballBody.linvel(), p = this.ballBody.translation(), a = this.ballBody.angvel();
      const speed = Math.hypot(v.x, v.z);
      if (p.y < this.ballRadius + 0.08 && Math.abs(v.y) < 0.8 && speed > 0) {
        const next = Math.max(0, speed - PHYSICS_CONFIG.ball.rollingResistance * PHYSICS_CONFIG.fixedDt);
        this.ballBody.setLinvel({ x: v.x * next / speed, y: v.y, z: v.z * next / speed }, true);
      } else if (p.y > this.ballRadius + 0.08) {
        const curve = PHYSICS_CONFIG.ball.magnus * a.y * PHYSICS_CONFIG.fixedDt;
        this.ballBody.setLinvel({ x: v.x + v.z * curve, y: v.y, z: v.z - v.x * curve }, true);
      }
      this.world.timestep = PHYSICS_CONFIG.fixedDt;
      this.world.step();
      const velocity = this.ballBody.linvel(), linear = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (linear > PHYSICS_CONFIG.ball.maxLinearSpeed) {
        const scale = PHYSICS_CONFIG.ball.maxLinearSpeed / linear;
        this.ballBody.setLinvel({ x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale }, true);
      }
      this.accumulator -= PHYSICS_CONFIG.fixedDt;
      subSteps++;
    }
    if (subSteps === PHYSICS_CONFIG.maxSubSteps && this.accumulator >= PHYSICS_CONFIG.fixedDt) this.accumulator = 0;
    physicsStepStats.accumulator = this.accumulator;
    physicsStepStats.subSteps = subSteps;
  }

  ballState() {
    const p = this.ballBody.translation(), v = this.ballBody.linvel(), a = this.ballBody.angvel();
    return { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, wx: a.x, wy: a.y, wz: a.z };
  }
}

let soccerPhysicsPromise: Promise<SoccerPhysics> | null = null;
export function getSoccerPhysics() {
  if (!soccerPhysicsPromise) soccerPhysicsPromise = SoccerPhysics.create(FIELD_X, FIELD_Z, PLAYER_R, BALL_R);
  return soccerPhysicsPromise;
}
