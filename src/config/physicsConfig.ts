export const PHYSICS_CONFIG = {
  fixedHz: 60,
  fixedDt: 1 / 60,
  maxFrameDt: 0.1,
  maxSubSteps: 5,
  gravity: -18,
  solverIterations: 8,
  player: {
    maxLinearSpeed: 11,
    maxAngularSpeed: 0,
  },
  ball: {
    maxLinearSpeed: 26,
    maxAngularSpeed: 42,
    rollingResistance: 1.1,
    magnus: 0.018,
  },
  collision: {
    player: 0x0001,
    ball: 0x0002,
    world: 0x0004,
    sensor: 0x0008,
  },
  ccd: true,
  debug: false,
} as const;

export type PhysicsStepStats = {
  accumulator: number;
  subSteps: number;
  fixedDt: number;
};

export const physicsStepStats: PhysicsStepStats = {
  accumulator: 0,
  subSteps: 0,
  fixedDt: PHYSICS_CONFIG.fixedDt,
};
