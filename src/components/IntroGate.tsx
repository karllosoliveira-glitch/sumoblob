import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { BlobIcon } from "./GameIcon";

const TERMS_KEY = "sumoblob-terms-v1";

export function IntroGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<"intro" | "terms" | "done">("intro");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStage(localStorage.getItem(TERMS_KEY) ? "done" : "terms"), 5000);
    return () => clearTimeout(t);
  }, []);

  if (stage === "done") return <>{children}</>;

  if (stage === "intro")
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#ffcf3f,#ff8a3d_55%,#e8553a)]">
        <style>{`
          @keyframes kd-pop{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.2) rotate(6deg)}100%{transform:scale(1) rotate(0)}}
          @keyframes kd-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
          @keyframes kd-bob{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-14px) scaleY(1.08)}}
          @keyframes kd-out{to{opacity:0;transform:scale(1.15)}}
          @keyframes kd-bar{from{width:0}to{width:100%}}
        `}</style>
        <div className="flex flex-col items-center text-[#241b35]" style={{ animation: "kd-out .5s ease-in 4.5s forwards" }}>
          <div style={{ animation: "kd-pop .8s cubic-bezier(.3,1.6,.5,1) both" }}>
            <div className="text-[#3ec5f0]" style={{ animation: "kd-bob 1s ease-in-out .8s infinite" }}><BlobIcon size={120} /></div>
          </div>
          <h1 className="mt-6 font-display text-4xl sm:text-6xl drop-shadow-[0_5px_0_#241b35] text-white" style={{ animation: "kd-up .6s ease-out 1s both", WebkitTextStroke: "2px #241b35" }}>KADUDEVSTUDIOS</h1>
          <p className="mt-2 font-black uppercase tracking-[.4em] text-sm" style={{ animation: "kd-up .6s ease-out 1.6s both" }}>apresenta</p>
          <div className="mt-8 h-3 w-56 overflow-hidden rounded-full border-[3px] border-[#241b35] bg-white/60">
            <div className="h-full bg-[#241b35]" style={{ animation: "kd-bar 4.4s linear forwards" }} />
          </div>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#ffcf3f] p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-[2rem] border-[5px] border-[#241b35] bg-white p-6 text-[#241b35] shadow-[0_10px_0_#241b35]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#62e5a2]"><ShieldCheck /></div>
          <h2 className="font-display text-2xl">TERMOS E DIRETRIZES</h2>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm font-semibold leading-relaxed text-black/70">
          <p><b>1. Diversão com respeito.</b> Nada de apelidos ofensivos, discurso de ódio, assédio ou conteúdo impróprio.</p>
          <p><b>2. Jogo limpo.</b> É proibido usar trapaças, programas externos ou explorar falhas para prejudicar outros jogadores.</p>
          <p><b>3. Códigos de sala.</b> Só compartilhe o código com quem você quer convidar. Quem tem o código pode entrar.</p>
          <p><b>4. Dados.</b> Guardamos seu apelido e suas estatísticas (partidas, vitórias e gols) para o ranking. Se entrar com Google, usamos seu nome e e-mail só para identificar sua conta.</p>
          <p><b>5. Menores de idade.</b> Jogue com a supervisão de um responsável.</p>
          <p><b>6. Sem garantias.</b> O jogo é oferecido "como está" e pode mudar ou sair do ar a qualquer momento.</p>
          <p><b>7. Punições.</b> Quem descumprir estas regras pode ser removido do ranking ou bloqueado.</p>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 font-bold">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="size-5 accent-[#ff8a3d]" />
          Li e aceito os termos e diretrizes
        </label>
        <button disabled={!checked} onClick={() => { localStorage.setItem(TERMS_KEY, new Date().toISOString()); setStage("done"); }} className="mt-4 rounded-2xl border-4 border-[#241b35] bg-[#ff8a3d] py-3 font-display text-xl text-white shadow-[0_5px_0_#241b35] active:translate-y-1 disabled:opacity-40">ACEITAR</button>
      </div>
    </div>
  );
}
