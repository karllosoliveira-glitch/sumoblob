import { useSyncExternalStore } from "react";

export type Phase = "lobby" | "vote" | "countdown" | "fight" | "roundEnd" | "final";
export type Mode = "sumo" | "futebol" | "corrida";

export type MatchState = {
  phase: Phase;
  mode: Mode;
  round: number;
  phaseAt: number;
  winner: string | null;
  points: Record<string, number>;
  votes: Record<string, Mode>;
  seq: number;
  /** quando a partida (não a rodada) começou — cronômetro do futebol */
  startedAt?: number;
};

export const ROUNDS = 3;
export const GOALS_TO_WIN = 3;
export const VOTE_MS = 8000;
export const COUNTDOWN_MS = 3000;
export const ROUND_END_MS = 3500;
export const FINAL_MS = 7000;

export const MODES: Record<Mode, { label: string; hint: string }> = {
  sumo: { label: "Sumô", hint: "Último de pé ganha a rodada" },
  futebol: { label: "Futebol de sabão", hint: "Empurre a bola pro gol do outro time · 3 gols vence" },
  corrida: { label: "Corrida Maluca", hint: "Desvie dos obstáculos e seja o primeiro a cruzar a chegada!" },
};

export const TEAMS = {
  A: { name: "Laranja", color: "#ff8a3d" },
  B: { name: "Azul", color: "#3ec5f0" },
} as const;

export function teamOf(id: string, ids: string[]): "A" | "B" {
  const sorted = [...ids].sort();
  return sorted.indexOf(id) % 2 === 0 ? "A" : "B";
}

let state: MatchState = {
  phase: "lobby",
  mode: "sumo",
  round: 0,
  phaseAt: 0,
  winner: null,
  points: {},
  votes: {},
  seq: 0,
};
const subs = new Set<() => void>();

export const match = {
  get: () => state,
  set(next: MatchState) {
    state = next;
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useMatch() {
  return useSyncExternalStore(match.subscribe, match.get, match.get);
}

export type Hit = { from: string; x: number; z: number; power: number; dash: number };
export const hitQueue: Hit[] = [];

export type BallMsg = { x: number; z: number; vx: number; vz: number; y?: number; vy?: number; wx?: number; wy?: number; wz?: number; matchSeq?: number; seq?: number; authorityId?: string; at?: number };
export const ball = { x: 0, y: 0.65, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
export const ballNet = { x: 0, y: 0.65, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0, at: 0, fresh: false };

export const net: {
  hit: (m: import("@/hooks/useGameChannel").HitMsg) => void;
  grab: (m: import("@/hooks/useGameChannel").GrabMsg) => void;
  vote: (mode: Mode) => void;
  ball: (b: BallMsg) => void;
  input: (i: { id: string; seq: number; moveX: number; moveZ: number; dash: number; tackle: number; kick: number; at: number }) => void;
  goal: (team: "A" | "B") => void;
  isHost: boolean;
  ids: string[];
} = {
  hit: () => {},
  grab: () => {},
  vote: () => {},
  ball: () => {},
  input: () => {},
  goal: () => {},
  isHost: true,
  ids: [],
};

/** Efeitos locais (não sincronizados): momentos de gol, apito etc. */
export const fx = { goalAt: 0, goalTeam: "A" as "A" | "B", shake: 0 };
export const SOCCER_MS = 180_000;
/** Pedido do anfitrião para sair do lobby e começar. */
export const lobby = { startRequested: false };
