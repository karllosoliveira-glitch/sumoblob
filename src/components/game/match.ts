import { useSyncExternalStore } from "react";

// Estado da partida (melhor de 3). Quem manda é o "anfitrião" = menor id da sala.
export type Phase = "lobby" | "countdown" | "fight" | "roundEnd" | "final";

export type MatchState = {
  phase: Phase;
  round: number; // 1..3
  phaseAt: number; // Date.now() em que a fase começou (relógio do anfitrião)
  winner: string | null; // vencedor da rodada ou campeão
  points: Record<string, number>;
  seq: number; // muda a cada nova fase
};

export const ROUNDS = 3;
export const COUNTDOWN_MS = 3000;
export const ROUND_END_MS = 3500;
export const FINAL_MS = 7000;

let state: MatchState = { phase: "lobby", round: 0, phaseAt: 0, winner: null, points: {}, seq: 0 };
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

// Pancadas recebidas de outros jogadores (aplicadas pelo Player local)
export type Hit = { from: string; x: number; z: number; power: number; dash: number };
export const hitQueue: Hit[] = [];
