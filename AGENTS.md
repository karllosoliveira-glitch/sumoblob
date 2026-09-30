<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Arquitetura do jogo

- Multiplayer é client-authoritative sobre Realtime Broadcast (canal `sumo:<código>`), sem servidor de jogo: cada cliente simula o próprio blob e recebe os outros interpolados. Motivo: a plataforma não hospeda hub de WebSocket.
- Tick de rede fixo em 8 Hz com envio só em mudança + keepalive de 1s, salas de até 8 jogadores. Motivo: o limite de mensagens do Realtime é por projeto.
- A cena 3D fica em `src/components/game/` e é montada na rota `/` com `ssr: false`. Motivo: `<Canvas>` não pode renderizar no servidor.
