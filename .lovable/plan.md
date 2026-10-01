# Sumô Bobão: virar um party game completo

O pedido é grande demais para uma etapa só. Ele fica dividido em 4 fases, na ordem de prioridade que você deu. Cada fase termina com o jogo funcionando e testado. Nada do que já existe sai (Sumô, Futebol, Corrida, menu, ranking e login atuais).

## Fase 1: física e multiplayer (esta etapa)
- **Futebol:** a bola ganha peso, quique, efeito (spin) e batida nas paredes. Também ganha:
  - drible (a bola fica colada no pé andando devagar), passe (toque curto) e chute carregado no ESPAÇO
  - carrinho no SHIFT que rouba a bola
  - a bola empurra quem leva a bolada
  - placar `TIME A 0 - 0 TIME B` com cronômetro e apito no início e no fim
  - no gol: confete, tremida da câmera, torcida pulando e som de gol e de torcida
  - torcida feita de bloquinhos leves para não pesar no celular
- **Sumô:** pulo, impactos mais exagerados e ranking no fim da rodada.
- **Corrida:** pista mais longa dividida em setores, com poças, bananas, martelos, giratórios, rampas, plataformas móveis, um atalho e checkpoints. Mostra a posição (1º, 2º...) e tem tela de vencedor.
- **Sala:** lista de jogadores ao vivo, com o modo escolhido e a contagem. O anfitrião aperta "Iniciar" e o jogo volta sozinho para a sala se a conexão cair.

## Fase 2: celular
- Joystick virtual e botões grandes de chute e carrinho.
- Respeito ao notch e à Dynamic Island, sem zoom nem rolagem durante o jogo.
- A imagem fica mais leve sozinha em aparelhos fracos.

## Fase 3: menu, perfil, ranking, configurações
- Menu novo com logo, botão JOGAR, Criar sala e Entrar em sala, mais o seu blob animado.
- Perfil com partidas, vitórias, derrotas, gols e modo favorito.
- Ranking global com gols, vitórias na corrida e vitórias no sumô.
- Configurações:
  - volume geral, música e efeitos
  - qualidade gráfica e partículas
  - vibração e animações reduzidas
  - idioma e controles
- Login com Google continua (já existe).

## Fase 4: polimento
- Tela de vitória com o blob comemorando, estatísticas e os botões "Jogar novamente" e "Voltar ao menu".
- Transições entre telas e microanimações.

## Detalhes técnicos
- A física continua no próprio aparelho: o anfitrião simula a bola, sobe o envio dela para 12 Hz e passa a mandar a velocidade, para os outros preverem o movimento.
- Carrinho e roubo usam a mensagem de pancada que já existe, com uma marca "carrinho".
- Novas mensagens só para eventos raros (gol, apito, checkpoint), dentro do limite de mensagens.
- A torcida é desenhada em lote, num único objeto. Confete limitado a 150 partículas. Nenhum objeto 3D é criado a cada quadro.
- O placar do ranking ganha colunas de gols e de vitórias por modo, numa mudança no banco com as permissões certas.
- Ao fim de cada fase: verificação de tipos, build, e teste com dois navegadores e com tela de celular.
