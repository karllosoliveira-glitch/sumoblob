import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { netStats } from "@/components/game/match";

export type InputMsg = { id: string; seq: number; x: number; z: number; moveX: number; moveZ: number; dash: number; tackle: number; kick: number; at: number };

export type NetState = {
  id: string;
  name: string;
  x: number;
  vx?: number;
  vz?: number;
  y: number;
  z: number;
  ry: number;
  dash: number; // 1 while dashing
  falls: number;
  out: number; // 1 while falling off / respawning
  dead?: number; // 1 = eliminado nesta rodada
  tackle?: number; // 1 durante o carrinho
  kick?: number; // força do chute
  kickSeq?: number; // identifica cada chute uma única vez
};

export type BallMsg = import("@/components/game/match").BallMsg;

export type HitMsg = { to: string; from: string; x: number; z: number; power: number; dash: number };
export type GrabMsg = { to: string; from: string; x: number; z: number; active: boolean; at: number };

export const playerId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Handlers = {
  onState: (s: NetState) => void;
  onInput?: (i: InputMsg) => void;
  onRoster: (roster: { id: string; name: string }[]) => void;
  onHit: (h: HitMsg) => void;
  onGrab: (g: GrabMsg) => void;
  onMatch: (m: import("@/components/game/match").MatchState) => void;
  onVote: (v: { from: string; mode: import("@/components/game/match").Mode }) => void;
  onBall: (b: BallMsg) => void;
};

export function useGameChannel(roomCode: string, name: string, handlers: Handlers) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const h = useRef(handlers);
  h.current = handlers;
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    const channel = supabase.channel(`sumo:${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const s = payload as NetState;
        if (s.id !== playerId) h.current.onState(s);
      })
      .on("broadcast", { event: "input" }, ({ payload }) => {
        const i = payload as InputMsg;
        if (i.id !== playerId) h.current.onInput?.(i);
      })
      .on("broadcast", { event: "hit" }, ({ payload }) => {
        const m = payload as HitMsg;
        if (m.to === playerId) h.current.onHit(m);
      })
      .on("broadcast", { event: "grab" }, ({ payload }) => {
        const g = payload as GrabMsg;
        if (g.to === playerId) h.current.onGrab(g);
      })
      .on("broadcast", { event: "match" }, ({ payload }) => {
        h.current.onMatch(payload as import("@/components/game/match").MatchState);
      })
      .on("broadcast", { event: "vote" }, ({ payload }) => {
        h.current.onVote(payload as { from: string; mode: import("@/components/game/match").Mode });
      })
      .on("broadcast", { event: "ball" }, ({ payload }) => {
        h.current.onBall(payload as import("@/components/game/match").BallMsg);
      })
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        const p = payload as { from: string; at: number };
        if (p.from !== playerId) void channel.send({ type: "broadcast", event: "pong", payload: { to: p.from, at: p.at } });
      })
      .on("broadcast", { event: "pong" }, ({ payload }) => {
        const p = payload as { to: string; at: number };
        if (p.to === playerId && Number.isFinite(p.at)) netStats.ping = Math.max(0, Math.round(Date.now() - p.at));
      })
      .on("presence", { event: "sync" }, () => {
        const roster = Object.entries(
          channel.presenceState<{ name: string }>(),
        ).map(([id, metas]) => ({ id, name: metas[0]?.name ?? "jogador" }));
        h.current.onRoster(roster);
      })
      .subscribe((status) => {
        console.log("[net] channel:", status);
        if (status === "SUBSCRIBED") channel.track({ name: nameRef.current });
      });

    channelRef.current = channel;
    const pingTimer = window.setInterval(() => {
      if (channel.state === "joined") void channel.send({ type: "broadcast", event: "ping", payload: { from: playerId, at: Date.now() } });
    }, 2500);
    return () => {
      window.clearInterval(pingTimer);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return channelRef;
}
