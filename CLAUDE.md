# Valendo — regras deste projeto

## Idioma

Fale sempre em **português do Brasil** com o operador. Ele não programa: explique o
que mudou e o que isso significa na prática, não o mecanismo interno.

As **notas de release no GitHub são em inglês** — é o público que chega pela
página de downloads. Commits, código e comentários seguem em português.

## Nunca

- **`taskkill /F /IM electron.exe`** — mata qualquer Valendo que o operador tenha
  aberto na hora, inclusive um em uso. Se precisar encerrar um processo, mate
  **pelo PID** do que você mesmo subiu.
- Rodar o app de teste contra o workspace real. Sempre `--user-data-dir` com
  perfil isolado.
- Publicar `D:\Claude Code\Valendo-privado\plano-licenciamento.md` ou qualquer
  coisa daquela pasta. Ela é sigilosa e mora **fora** do repositório de
  propósito — e **não** entra no `.gitignore`, porque o `.gitignore` é público e
  uma linha com o nome do arquivo já revelaria que ele existe.

## Antes de qualquer commit

```bash
npm run typecheck && npx vitest run && npm run build
```

Os três, sempre. A CI roda `typecheck` e `test` de novo no runner — um teste
vermelho descoberto lá vira uma release falhada, não um erro local.

## Como cortar uma release

O processo inteiro, para não precisar redescobrir:

1. **Conferir** — os três comandos acima, verdes.
2. **Subir a versão**, sem criar tag:
   ```bash
   npm version 1.6.0 --no-git-tag-version
   ```
   Tem que ser assim, e não editando o `package.json` na mão: o comando
   atualiza também o `package-lock.json` (duas linhas), e o lock fora de sincronia
   quebra o `npm ci` da CI.
3. **Commitar** só esses dois arquivos. Assunto declarativo em português no estilo
   dos anteriores ("Versão 1.5.0, a do texto que ganha cor"), corpo explicando o
   eixo da versão e qualquer **consequência que o operador vá sentir**, e
   `Feito com Claude Code` no fim.
4. **Tag anotada** `vX.Y.Z` — assunto `Valendo X.Y.Z`, corpo com uma linha
   dizendo o que a versão traz.
5. **Empurrar `main` primeiro, a tag depois.** A tag é o gatilho: `on: push:
   tags: ['v*']` em `.github/workflows/release.yml`. Empurrar a tag antes do
   `main` faz a CI construir um commit que ainda não existe no remoto.
6. **Acompanhar a CI** (`gh run watch`). Dois jobs: `windows-latest` gera o
   `-setup.exe`, `macos-14` gera o `-arm64.dmg`. Avisos de deprecação do Node 20
   nas actions são informativos, não falha. O macOS **compila o ffmpeg** e tem
   uma guarda que reprova o build se aparecer `--enable-nonfree` — o binário do
   `ffmpeg-static` para Mac não é redistribuível.
7. **Escrever as notas.** A release é criada pelo `github-actions[bot]` e nasce
   sem texto; as notas entram depois:
   ```bash
   gh release edit v1.6.0 --title "1.6.0" --notes-file notas.md
   ```
8. **Conferir** com `gh release view` que os dois instaladores estão anexados e
   que não ficou como rascunho.

### O formato das notas (em inglês)

Sempre nesta ordem — veja `gh release view v1.5.0` como molde vivo:

- Uma linha de abertura dizendo o que a versão é.
- Tabela `| System | File |` com os dois instaladores.
- Parágrafo do SmartScreen no Windows (**More info → Run anyway**).
- Parágrafo do macOS com o `xattr -dr com.apple.quarantine /Applications/Valendo.app`,
  dizendo que é preciso rodar a cada versão baixada e que o app não está
  danificado — só não é notarizado.
- `## New` / `## Fixed` / `## Changed`, com marcadores longos que explicam a
  **causa**, não só o sintoma. Se alguma mudança altera um número que o operador
  usava (estimativa de duração, por exemplo), isso é dito com todas as letras.
- Linha com Documentation · site.
- `## Licence`: GPL-3.0-or-later e o parágrafo de redistribuição do ffmpeg 6.1.1
  (Windows por gyan.dev, macOS compilado pela CI, fonte em ffmpeg.org, tag
  `n6.1.1`).

Se README, site ou wiki ficarem para depois, **diga isso nas notas** — quem
chega pelo site precisa entender por que o app tem recursos que a documentação
não menciona.
