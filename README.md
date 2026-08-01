# VaLendo — A Teleprompter Suite

Teleprompter para Windows e macOS em que o operador **edita o roteiro com a transmissão no ar**, vendo lado a lado o texto de edição e uma réplica exata do que o apresentador está lendo.

## Rodar

```bash
npm install
npm run dev
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Empacota main, preload e renderer em `out/` |
| `npm test` | Testes da lógica pura (`src/shared`) |
| `npm run typecheck` | Verificação de tipos |
| `npm run start:debug` | Sobe o app construído com depuração remota na porta 9222 |
| `npm run verify` | Verifica o critério de aceite no app rodando (exige `start:debug`) |

Se o `npm install` não baixar o binário do Electron, rode `node node_modules/electron/install.js`.

## A ideia central

Teleprompters comuns guardam a posição de rolagem **em pixels**. Qualquer mudança no texto, na fonte ou na margem reflui o layout, e o pixel 4 200 passa a ser outra frase — o texto salta na cara do apresentador. É por isso que esses apps exigem sair da tela de apresentação para editar.

Aqui a posição é uma **âncora semântica**: `{ blockId, wordOffset }`. Depois de qualquer refluxo, o pixel é recalculado a partir dela. Inserir parágrafos acima do ponto de leitura, aumentar o corpo da fonte ou mudar a margem não move a palavra que está sendo lida.

Três consequências de projeto:

- **Relógio, não mensagens.** O processo main guarda só `{ppm, wordsAtStart, startedAt}`; cada janela deriva a própria posição num `requestAnimationFrame`. Nenhum tráfego por quadro, nenhuma deriva entre a prévia e a saída.
- **Um componente só.** `PrompterCanvas` desenha a transmissão *e* a prévia do operador. A prévia roda no viewport real da saída e recebe apenas um `scale()`. A réplica é exata por construção, não por calibragem.
- **Composição independente da fonte.** As linhas são compostas por regra de palavras (mín/máx, sem terminar em preposição), não pelo navegador. Trocar o corpo muda a altura, nunca quais palavras ficam em qual linha.

## Estrutura

```
src/main/       janelas, monitores, estado autoritativo, persistência
src/preload/    ponte de IPC exposta ao renderer
src/shared/     lógica pura e testável: âncora, linhas, ritmo, histórico, comandos
src/renderer/   prompter (compartilhado), interface do operador, janela de transmissão
scripts/        verificação de ponta a ponta via protocolo do Chromium
```

Dados do usuário ficam em `userData`: `workspace.json`, `history/<abaId>.jsonl` (desfazer infinito persistido), `keymap.json`.

## Importação

`txt`, `md`, `docx` e `pdf`. O texto passa por uma limpeza antes de virar roteiro: remonta palavra hifenizada no fim da linha, junta linha que era só quebra de página, tira cabeçalho repetido e número de página, endireita aspas e detecta codificação legada (um `.txt` antigo em Windows-1252 não vira sopa de losangos).

No PDF, o texto é reconstruído a partir das coordenadas dos fragmentos — inclusive detectando duas colunas — e a frase que atravessa a virada de página volta inteira. PDF digitalizado é sinalizado como tal; o OCR entra no próximo marco.

## Versionamento

A versão semântica é decisão humana e fica em `1.0.0`. O número de build sobe sozinho a cada `npm run build`, e aparece no rodapé do app e nos créditos como `v1.0.0 - build N`.

## Estado

Pronto: motor de prompter com edição ao vivo, monitor de saída com identificação e detecção a quente, aparência ao vivo, presets e inversão de cores, espelho e rotação, blackout e congelamento, registro de comandos com paleta e remapeamento de teclas, marcadores e capítulos, 10 abas, desfazer infinito, autosave, importação de txt/md/docx/pdf.

Próximos: exportação, OCR híbrido, Google Drive, modos Foco e Mesa de comando, segue-a-voz e controle remoto, saídas NDI/OBS e empacotamento assinado.

## Licença

GNU General Public License, versão 3 ou posterior — o texto completo está em [LICENSE](LICENSE).

Em português claro: você pode usar, estudar, modificar e redistribuir o VaLendo à vontade, inclusive num estúdio que cobra pelo trabalho. A única obrigação aparece quando você **distribui** uma versão modificada — aí o código dela tem de ir junto, sob esta mesma licença.

É essa a intenção do projeto: nasceu para ficar livre. A GPL não impede que alguém cobre, mas impede que alguém feche o código e transforme isto num produto proprietário — quem vender é obrigado a entregar o fonte e as mesmas liberdades a quem comprou.
