import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type NetState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  dash: number; // 1 while dashing
  falls: number;
  out: number; // 1 while falling off / respawning
  dead?: number; // 1 = eliminado nesta rodada
};

export type HitMsg = { to: string; from: string; x: number; z: number; power: number; dash: number };

export const playerId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Handlers = {
  onState: (s: NetState) => void;
  onRoster: (roster: { id: string; name: string }[]) => void;
  onHit: (h: HitMsg) => void;
  onMatch: (m: import("@/components/game/match").MatchState) => void;
  onVote: (v: { from: string; mode: import("@/components/game/match").Mode }) => void;
  onBall: (b: import("@/components/game/match").BallMsg) => void;
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
      .on("broadcast", { event: "hit" }, ({ payload }) => {
        const m = payload as HitMsg;
        if (m.to === playerId) h.current.onHit(m);
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
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return channelRef;
}
