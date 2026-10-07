import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { playerId, useGameChannel, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import type { LocalState } from "./Player";
import { COUNTDOWN_MS, FINAL_MS, GOALS_TO_WIN, ROUND_END_MS, ROUNDS, TEAMS, VOTE_MS, ballNet, fx, hitQueue, lobby, match, net, SOCCER_MS, teamOf, useMatch, type MatchState, type Mode } from "./match";
import { physicsSensors } from "./physicsSensors";
import { sfx } from "./sfx";

const NET_TICK = 1 / 8;
const tmpTarget = new THREE.Vector3();

export function Multiplayer({ roomCode, name, playerRef, localRef, remote, onRoster, onScores }: { roomCode: string; name: string; playerRef: React.RefObject<THREE.Group | null>; localRef: React.RefObject<LocalState>; remote: React.RefObject<Map<string, NetState>>; onRoster: (roster: { id: string; name: string }[]) => void; onScores: (scores: Record<string, number>) => void }) {
  const [ids, setIds] = useState<string[]>([]);
  const roster = useRef(new Set<string>());
  const meshes = useRef(new Map<string, THREE.Group>());
  const acc = useRef(0);
  const hostAcc = useRef(0);
  const lastMatchSend = useRef(0);
  const pendingGoal = useRef<"A" | "B" | null>(null);
  const votesDirty = useRef(false);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, dash: 0, out: 0, falls: 0, dead: 0, tackle: 0, kick: 0, at: -1 });
  const m = useMatch();
  const allIds = [playerId, ...ids];

  // Efeitos de transição de fase, iguais em todas as telas (inclusive a do anfitrião).
  useEffect(() => {
    if (m.mode === "futebol") {
      if (m.phase === "fight") sfx.whistle();
      if (m.phase === "roundEnd" && m.winner) { fx.goalAt = performance.now(); fx.goalTeam = m.winner as "A" | "B"; fx.shake = 0.9; sfx.crowd(1.2); }
      if (m.phase === "final") { sfx.whistle(true); sfx.crowd(1); }
    } else if (m.phase === "fight" && m.mode === "corrida") sfx.whistle();
    if (m.phase === "final" || (m.phase === "roundEnd" && m.mode !== "futebol")) fx.goalAt = performance.now();
  }, [m.seq]);

  const applyMatch = (next: MatchState) => {
    const cur = match.get();
    if (next.seq === cur.seq && next.phase === cur.phase) {
      if (JSON.stringify(next.points) !== JSON.stringify(cur.points) || JSON.stringify(next.votes) !== JSON.stringify(cur.votes)) match.set({ ...cur, points: next.points, votes: next.votes });
      return;
    }
    if (next.phase === "countdown") sfx.pop();
    if (next.phase === "roundEnd" || next.phase === "final") sfx.fanfare();
    match.set({ ...next, phaseAt: Date.now() });
  };

  const recordVote = (from: string, mode: Mode) => {
    const cur = match.get();
    if (cur.phase !== "vote") return;
    match.set({ ...cur, votes: { ...cur.votes, [from]: mode } });
    votesDirty.current = true;
  };

  const channelRef = useGameChannel(roomCode, name, {
    onRoster: (list) => {
      roster.current = new Set(list.map((p) => p.id));
      roster.current.delete(playerId);
      for (const id of [...remote.current.keys()]) if (!roster.current.has(id)) remote.current.delete(id);
      setIds([...roster.current]);
      onRoster(list);
    },
    onState: (s) => {
      if (!roster.current.has(s.id)) return;
      remote.current.set(s.id, s);
      onScores(Object.fromEntries([...remote.current.values()].map((r) => [r.id, r.falls])));
    },
    onHit: (h) => { hitQueue.push(h); },
    onMatch: (mm) => { if (!net.isHost) applyMatch(mm); },
    onVote: (v) => { if (net.isHost) recordVote(v.from, v.mode); },
    onBall: (b) => { if (net.isHost) return; Object.assign(ballNet, b, { at: performance.now(), fresh: true }); },
  });

  net.hit = (msg) => { channelRef.current?.send({ type: "broadcast", event: "hit", payload: msg }); };
  net.vote = (mode) => {
    if (net.isHost) recordVote(playerId, mode);
    else channelRef.current?.send({ type: "broadcast", event: "vote", payload: { from: playerId, mode } });
    const cur = match.get();
    if (!net.isHost && cur.phase === "vote") match.set({ ...cur, votes: { ...cur.votes, [playerId]: mode } });
  };
  net.ball = (b) => { channelRef.current?.send({ type: "broadcast", event: "ball", payload: b }); };
  net.goal = (team) => { pendingGoal.current = team; };

  const hostTick = (now: number) => {
    const all = [playerId, ...roster.current].sort();
    net.ids = all;
    net.isHost = all[0] === playerId;
    if (!net.isHost) return;
    const cur = match.get();
    const elapsed = now - cur.phaseAt;
    const n = all.length;
    let next: MatchState | null = null;
    const go = (patch: Partial<MatchState>) => (next = { ...cur, ...patch, phaseAt: now, seq: cur.seq + 1 });

    if (n < 2) {
      if (cur.phase !== "lobby") go({ phase: "lobby", round: 0, winner: null, points: {}, votes: {} });
    } else if (cur.phase === "lobby") {
      if (!lobby.startRequested) return sendMatch(now, null);
      lobby.startRequested = false;
      go({ phase: "vote", round: 0, winner: null, points: {}, votes: {} });
    } else if (cur.phase === "vote") {
      const votes = Object.entries(cur.votes).filter(([id]) => all.includes(id));
      if (elapsed > VOTE_MS || votes.length >= n) {
        const count = { sumo: 0, futebol: 0, corrida: 0 };
        votes.forEach(([, v]) => count[v]++);
        const best = Math.max(count.sumo, count.futebol, count.corrida);
        const tied = (Object.keys(count) as Mode[]).filter((mode) => count[mode] === best);
        const mode = tied[Math.floor(Math.random() * tied.length)] ?? "sumo";
        go({ phase: "countdown", mode, round: 1, winner: null, points: {}, startedAt: now + COUNTDOWN_MS });
      }
    } else if (cur.phase === "countdown" && elapsed > COUNTDOWN_MS) {
      pendingGoal.current = null;
      go({ phase: "fight" });
    } else if (cur.phase === "fight" && cur.mode === "sumo" && elapsed > 1500) {
      const alive = all.filter((id) => id === playerId ? !localRef.current.dead : !remote.current.get(id)?.dead);
      if (alive.length <= 1) { const w = alive[0] ?? null; const points = { ...cur.points }; if (w) points[w] = (points[w] ?? 0) + 1; go({ phase: "roundEnd", winner: w, points }); }
    } else if (cur.phase === "fight" && cur.mode === "futebol") {
      const a = cur.points["A"] ?? 0, b = cur.points["B"] ?? 0;
      if (cur.startedAt && now - cur.startedAt > SOCCER_MS) go({ phase: "final", winner: a > b ? "A" : b > a ? "B" : null });
      else if (pendingGoal.current) { const t = pendingGoal.current; pendingGoal.current = null; const points = { ...cur.points, [t]: (cur.points[t] ?? 0) + 1 }; go({ phase: "roundEnd", winner: t, points }); }
    } else if (cur.phase === "fight" && cur.mode === "corrida") {
      const finishers = all.filter((id) => id === playerId ? physicsSensors.finish(playerRef.current?.position.x ?? -999, playerRef.current?.position.z ?? 999) : physicsSensors.finish(remote.current.get(id)?.x ?? -999, remote.current.get(id)?.z ?? 999));
      if (finishers.length) {
        const w = finishers[0] as string;
        const points = { ...cur.points, [w]: (cur.points[w] ?? 0) + 1 };
        go({ phase: "roundEnd", winner: w, points });
      }
    } else if (cur.phase === "roundEnd" && elapsed > ROUND_END_MS) {
      if (cur.mode === "futebol") {
        const a = cur.points["A"] ?? 0, b = cur.points["B"] ?? 0;
        if (a >= GOALS_TO_WIN || b >= GOALS_TO_WIN) go({ phase: "final", winner: a > b ? "A" : b > a ? "B" : null });
        else go({ phase: "countdown", round: cur.round + 1, winner: null });
      } else {
        const best = Math.max(0, ...Object.values(cur.points));
        const leaders = Object.keys(cur.points).filter((id) => cur.points[id] === best);
        if (cur.round >= ROUNDS || best > ROUNDS / 2) go({ phase: "final", winner: leaders.length === 1 ? (leaders[0] ?? null) : null });
        else go({ phase: "countdown", round: cur.round + 1, winner: null });
      }
    } else if (cur.phase === "final" && elapsed > FINAL_MS) {
      go({ phase: "vote", round: 0, winner: null, points: {}, votes: {} });
    }

    sendMatch(now, next);
  };

  const sendMatch = (now: number, next: MatchState | null) => {
    const channel = channelRef.current;
    if (next) match.set(next);
    if (channel && (next || votesDirty.current || now - lastMatchSend.current > 1000)) { votesDirty.current = false; lastMatchSend.current = now; channel.send({ type: "broadcast", event: "match", payload: match.get() }); }
  };

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = 1 - Math.exp(-12 * delta);
    for (const [id, s] of remote.current) {
      const g = meshes.current.get(id);
      if (!g) continue;
      g.visible = !s.dead;
      tmpTarget.set(s.x, s.y, s.z);
      if (g.position.distanceTo(tmpTarget) > 5) g.position.copy(tmpTarget); else g.position.lerp(tmpTarget, t);
      const dy = s.ry - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
      g.rotation.z = s.out ? g.rotation.z + delta * 8 : 0;
      const sq = s.dash ? 1.25 : 1 + Math.sin(clock.elapsedTime * 14 + id.length) * 0.04;
      g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    }
    hostAcc.current += delta;
    if (hostAcc.current > 0.1) { hostAcc.current = 0; hostTick(Date.now()); }
    acc.current += delta;
    if (acc.current < NET_TICK) return;
    acc.current = 0;
    const mesh = playerRef.current, channel = channelRef.current;
    if (!mesh || !channel || document.hidden) return;
    const x = Math.round(mesh.position.x * 100) / 100, y = Math.round(mesh.position.y * 100) / 100, z = Math.round(mesh.position.z * 100) / 100, ry = Math.round(mesh.rotation.y * 100) / 100;
    const { dash, out, falls, dead, tackle, kick } = localRef.current;
    const l = last.current;
    const moved = Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) > 0.01 || dash !== l.dash || out !== l.out || dead !== l.dead || falls !== l.falls || tackle !== l.tackle || kick !== l.kick;
    const stale = clock.elapsedTime - l.at > 1;
    if (!moved && !stale) return;
    last.current = { x, y, z, ry, dash, out, falls, dead, tackle, kick, at: clock.elapsedTime };
    channel.send({ type: "broadcast", event: "state", payload: { id: playerId, name, x, y, z, ry, dash, out, falls, dead, tackle, kick, vx: Math.round(localRef.current.vx * 10) / 10, vz: Math.round(localRef.current.vz * 10) / 10 } satisfies NetState });
  });

  return <>{ids.map((id, i) => <group key={id} visible={false} ref={(g) => { if (g) meshes.current.set(id, g); else meshes.current.delete(id); }}><Sumo key={m.mode} color={m.mode === "futebol" ? TEAMS[teamOf(id, allIds)].color : colorForId(id)} seed={i * 1.7 + 1} /><Text position={[0, 2.5, 0]} fontSize={0.42} color="#ffffff" outlineWidth={0.05} outlineColor="#2b2119" anchorX="center">{remote.current.get(id)?.name ?? "jogador"}</Text></group>)}</>;
}
