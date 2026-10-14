import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HUD } from "@/components/game/HUD";
import { useMatch } from "@/components/game/match";
import { playerId } from "@/hooks/useGameChannel";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { randomRoomCode, readRoomFromUrl, setRoomInUrl, shareLink } from "@/lib/room";
import { IntroGate } from "@/components/IntroGate";
import { BlobIcon, ModeIcon } from "@/components/GameIcon";
import { Dices, Sparkles, Trophy, Settings, UserRound, Play, LogIn, LogOut, Volume2, VolumeX, Zap, Users, X } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sumô Bobão — Party Game de Blobs" },
      { name: "description", content: "Um party game 3D de blobs: sumô, futebol de sabão, corridas de carros, motos e karts." },
      { property: "og:title", content: "Sumô Bobão — Party Game de Blobs" },
      { property: "og:description", content: "Jogue sumô, futebol de sabão e corridas de carros, motos e karts com amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <IntroGate><Index /></IntroGate>,
});

type Tab = "home" | "ranking" | "settings" | "account";
type Leader = { user_id: string; username: string; wins: number; games: number };

function Index() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [myFalls, setMyFalls] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [session, setSession] = useState<any>(null);
  const [sound, setSound] = useState(() => localStorage.getItem("sumoblob-sound") !== "off");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("sumoblob-motion") === "reduced");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const m = useMatch();
  const lastFinalSeq = useRef(-1);

  useEffect(() => {
    const fromUrl = readRoomFromUrl();
    setRoom(fromUrl ?? randomRoomCode());
    setName(`Blob ${Math.floor(Math.random() * 90 + 10)}`);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const meta = session.user.user_metadata ?? {};
    const displayName = meta.name || meta.full_name || meta.user_name || session.user.email?.split("@")[0];
    if (displayName) setName(displayName.slice(0, 14));
  }, [session]);

  useEffect(() => {
    if (!session?.user || !joined || m.phase !== "final" || m.seq === lastFinalSeq.current) return;
    lastFinalSeq.current = m.seq;
    const won = m.winner === playerId || (m.mode === "futebol" && m.winner && roster.length > 0 && m.winner === "A");
    void recordGame(session.user.id, !!won);
  }, [m.phase, m.seq, m.winner, m.mode, joined, session, roster.length]);

  const rows = useMemo(() => {
    const list = roster.map((p) => ({ id: p.id, name: p.name, falls: p.id === playerId ? myFalls : scores[p.id] ?? 0 }));
    if (!list.some((p) => p.id === playerId)) list.unshift({ id: playerId, name: name || "você", falls: myFalls });
    return list.sort((a, b) => a.falls - b.falls);
  }, [roster, scores, myFalls, name]);

  const join = () => {
    const code = (room || randomRoomCode()).toUpperCase();
    setRoom(code);
    setRoomInUrl(code);
    setJoined(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(room));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  const google = async () => {
    setLoadingGoogle(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error || !r.redirected) setLoadingGoogle(false);
    if (!r.error && !r.redirected) { const { data } = await supabase.auth.getSession(); setSession(data.session); }
  };

  const logout = async () => { await supabase.auth.signOut(); setSession(null); };

  if (joined) {
    return (
      <div className="fixed inset-0 bg-sky">
        <GameCanvas roomCode={room} name={name} onFall={() => setMyFalls((f) => f + 1)} onRoster={setRoster} onScores={setScores} />
        <HUD roomCode={room} rows={rows} meId={playerId} onCopy={copy} copied={copied} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_15%,#fff7a8_0,#9de7ff_32%,#6c6eea_100%)] text-white ${reducedMotion ? "[&_*]:!transition-none" : ""}`}>
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10">
        <button onClick={() => setTab("home")} className="group flex items-center gap-3">
          <div className="grid size-12 rotate-[-6deg] place-items-center rounded-2xl border-4 border-[#241b35] bg-[#ffcf3f] text-3xl shadow-[0_6px_0_#241b35] group-hover:rotate-3"><BlobIcon size={34} className="text-[#3ec5f0]" /></div>
          <div className="text-left"><div className="font-display text-2xl leading-none text-white drop-shadow-[3px_3px_0_#241b35]">SUMÔ BOBÃO</div><div className="text-xs font-black uppercase tracking-[.25em] text-white/80">party blobs</div></div>
        </button>
        <div className="flex gap-2">
          <MenuButton icon={<Trophy size={19} />} label="Ranking" active={tab === "ranking"} onClick={() => { setTab("ranking"); void loadLeaderboard(setLeaders); }} />
          <MenuButton icon={<Settings size={19} />} label="Config" active={tab === "settings"} onClick={() => setTab("settings")} />
          <MenuButton icon={<UserRound size={19} />} label={session ? "Conta" : "Entrar"} active={tab === "account"} onClick={() => setTab("account")} />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-5 pb-12 pt-3">
        {tab === "home" && <Home name={name} setName={setName} room={room} setRoom={setRoom} join={join} />}
        {tab === "ranking" && <Ranking leaders={leaders} onBack={() => setTab("home")} />}
        {tab === "settings" && <SettingsPanel sound={sound} setSound={(v: boolean) => { setSound(v); localStorage.setItem("sumoblob-sound", v ? "on" : "off"); }} reducedMotion={reducedMotion} setReducedMotion={(v: boolean) => { setReducedMotion(v); localStorage.setItem("sumoblob-motion", v ? "reduced" : "full"); }} onBack={() => setTab("home")} />}
        {tab === "account" && <Account session={session} google={google} logout={logout} loading={loadingGoogle} onBack={() => setTab("home")} />}
      </main>
    </div>
  );
}

function Home({ name, setName, room, setRoom, join }: any) {
  return <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
    <section className="text-center lg:text-left">
      <div className="mb-4 inline-flex -rotate-2 items-center gap-2 rounded-full border-4 border-[#241b35] bg-[#62e5a2] px-4 py-2 font-black text-[#241b35] shadow-[0_5px_0_#241b35]"><Zap size={18} /> NOVO: CARROS, MOTOS E KARTS</div>
      <h1 className="font-display text-6xl leading-[.86] tracking-tight text-white drop-shadow-[6px_7px_0_#241b35] md:text-8xl">CAIA.<br/><span className="text-[#ffcf3f]">EMPURRE.</span><br/>RACHE.</h1>
      <p className="mt-6 max-w-xl text-lg font-extrabold text-[#fff] drop-shadow-[2px_2px_0_#3a2862]">Um party game 3D caótico para você e seus amigos: sumô, futebol de sabão, corrida maluca, carros, motos e karts.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start"><Pill><ModeIcon mode="sumo" size={14} className="mr-1 inline"/>SUMÔ</Pill><Pill><ModeIcon mode="futebol" size={14} className="mr-1 inline"/>FUTEBOL</Pill><Pill><ModeIcon mode="corrida" size={14} className="mr-1 inline"/>CORRIDA</Pill><Pill><ModeIcon mode="carros" size={14} className="mr-1 inline"/>CARROS</Pill><Pill><ModeIcon mode="motos" size={14} className="mr-1 inline"/>MOTOS</Pill><Pill><ModeIcon mode="kart" size={14} className="mr-1 inline"/>KARTS</Pill></div>
    </section>
    <section className="rounded-[2rem] border-[5px] border-[#241b35] bg-white/95 p-6 text-[#241b35] shadow-[0_12px_0_#241b35,0_25px_60px_rgba(30,20,70,.25)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-3xl">JOGAR</h2><p className="font-bold text-black/50">Crie ou entre em uma sala.</p></div><div className="grid size-14 place-items-center rounded-2xl bg-[#ff6b8a] text-3xl text-white"><Sparkles size={28}/></div></div>
      <label className="text-xs font-black uppercase tracking-widest text-black/50">Apelido</label>
      <input value={name} maxLength={14} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-2xl border-4 border-[#241b35] bg-[#f5f2ff] px-4 py-3 font-black outline-none focus:bg-white" />
      <label className="mt-4 block text-xs font-black uppercase tracking-widest text-black/50">Código da sala</label>
      <div className="mt-1 flex gap-2"><input value={room} maxLength={6} onChange={(e) => setRoom(e.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-2xl border-4 border-[#241b35] bg-[#f5f2ff] px-4 py-3 font-display text-2xl tracking-widest outline-none" /><button onClick={() => setRoom(randomRoomCode())} className="rounded-2xl border-4 border-[#241b35] bg-[#ffcf3f] px-3 font-black" aria-label="Sortear código"><Dices/></button></div>
      <button onClick={join} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-[#241b35] bg-[#6c5ce7] px-5 py-4 font-display text-2xl text-white shadow-[0_7px_0_#241b35] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none"><Play fill="currentColor" /> ENTRAR NO RINGUE</button>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-black text-black/45"><Users size={15} /> até 8 blobs por sala · sem cadastro obrigatório</div>
    </section>
  </div>;
}

function Ranking({ leaders, onBack }: { leaders: Leader[]; onBack: () => void }) {
  return <Panel title="RANKING GLOBAL" subtitle="Os blobs mais vitoriosos." onBack={onBack} icon={<Trophy size={28}/>}><div className="space-y-2">{leaders.length ? leaders.slice(0, 10).map((p, i) => <div key={p.user_id} className="flex items-center gap-3 rounded-2xl border-3 border-[#241b35]/10 bg-[#f5f2ff] p-3"><div className="grid size-10 place-items-center rounded-xl bg-[#ffcf3f] font-display text-lg">{i + 1}</div><div className="flex-1 font-black">{p.username}<div className="text-xs text-black/40">{p.games} partidas</div></div><div className="font-display text-xl">{p.wins} <Trophy size={18} className="inline"/></div></div>) : <div className="rounded-2xl bg-[#f5f2ff] p-6 text-center font-bold text-black/50">Ainda não há jogadores ranqueados. Entre com Google e comece a jogar!</div>}</div></Panel>;
}

function SettingsPanel({ sound, setSound, reducedMotion, setReducedMotion, onBack }: any) { return <Panel title="CONFIGURAÇÕES" subtitle="Deixe o caos do seu jeito." onBack={onBack} icon={<Settings size={28}/>}><div className="space-y-3"><SettingRow icon={sound ? <Volume2/> : <VolumeX/>} title="Som" description="Efeitos e música" value={sound} onChange={setSound}/><SettingRow icon={<Zap/>} title="Animações reduzidas" description="Menos movimento na interface" value={reducedMotion} onChange={setReducedMotion}/></div></Panel>; }

function Account({ session, google, logout, loading, onBack }: any) { return <Panel title="SUA CONTA" subtitle={session ? "Conta conectada ao seu progresso." : "Entre para salvar seu ranking."} onBack={onBack} icon={<UserRound size={28}/>}>{session ? <div className="text-center"><div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-[#62e5a2] text-4xl"><BlobIcon size={52} className="text-[#ffcf3f]"/></div><h3 className="font-display text-2xl">{session.user.user_metadata?.name || session.user.email?.split("@")[0]}</h3><p className="mt-1 text-sm font-bold text-black/45">{session.user.email}</p><button onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-[#241b35] bg-[#ff6b8a] px-4 py-3 font-black text-white"><LogOut size={18}/> SAIR</button></div> : <div><button onClick={google} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-[#241b35] bg-white px-4 py-4 font-black shadow-[0_6px_0_#241b35] transition hover:-translate-y-1 disabled:opacity-60"><span className="text-xl">G</span>{loading ? "CONECTANDO..." : "CONTINUAR COM GOOGLE"}</button><p className="mt-4 text-center text-xs font-bold text-black/45">Seu login é usado para salvar perfil, vitórias e ranking global.</p></div>}</Panel>; }

function Panel({ title, subtitle, icon, onBack, children }: any) { return <div className="w-full max-w-xl rounded-[2rem] border-[5px] border-[#241b35] bg-white p-6 text-[#241b35] shadow-[0_12px_0_#241b35]"><div className="mb-6 flex items-start gap-3"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#ffcf3f] text-3xl">{icon}</div><div className="flex-1"><h2 className="font-display text-3xl">{title}</h2><p className="font-bold text-black/45">{subtitle}</p></div><button onClick={onBack} className="rounded-xl border-3 border-[#241b35] p-2"><X/></button></div>{children}</div>; }
function SettingRow({ icon, title, description, value, onChange }: any) { return <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-3 border-[#241b35]/10 bg-[#f5f2ff] p-4"><div className="grid size-10 place-items-center rounded-xl bg-white">{icon}</div><div className="flex-1"><div className="font-black">{title}</div><div className="text-xs font-bold text-black/40">{description}</div></div><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[#6c5ce7]"/></label>; }
function MenuButton({ icon, label, active, onClick }: any) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-2xl border-3 border-[#241b35] px-3 py-2 text-sm font-black shadow-[0_4px_0_#241b35] transition hover:-translate-y-0.5 ${active ? "bg-[#ffcf3f] text-[#241b35]" : "bg-white/90 text-[#241b35]"}`}>{icon}<span className="hidden sm:inline">{label}</span></button>; }
function Pill({ children }: any) { return <span className="rounded-full border-3 border-[#241b35] bg-white/90 px-3 py-1 text-xs font-black text-[#241b35] shadow-[0_3px_0_#241b35]">{children}</span>; }

async function loadLeaderboard(setter: (rows: Leader[]) => void) { const { data } = await (supabase as any).from("leaderboard").select("user_id,username,wins,games").order("wins", { ascending: false }).order("games", { ascending: false }).limit(50); setter((data ?? []) as Leader[]); }

async function recordGame(userId: string, won: boolean) { const { data } = await (supabase as any).from("leaderboard" as any).select("username,wins,games").eq("user_id", userId).maybeSingle(); if (!data) return; await (supabase as any).from("leaderboard" as any).update({ wins: Number(data.wins ?? 0) + (won ? 1 : 0), games: Number(data.games ?? 0) + 1, updated_at: new Date().toISOString() }).eq("user_id", userId); await (supabase as any).from("profiles" as any).update({ wins: Number(data.wins ?? 0) + (won ? 1 : 0), games: Number(data.games ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", userId); }
