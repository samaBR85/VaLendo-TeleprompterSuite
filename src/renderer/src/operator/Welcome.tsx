import { useEffect, useState } from 'react'
import type { ProjetoRecente } from '@shared/api'
import { LANGS, type Lang } from '@shared/i18n'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  /** o idioma em vigor — já vem detectado do sistema, então quase sempre está certo */
  lang: Lang
  /** trocar aqui refaz a partida traduzida; ver a ação `estreia/language` */
  onLang: (lang: Lang) => void
  /**
   * Existe trabalho gravado esperando de lado.
   *
   * Quando é falso — instalação nova, ou primeira abertura depois de limpar os
   * dados — não há o que continuar, e o botão nem aparece.
   */
  temSalvo: boolean
  /** revela o trabalho gravado */
  onContinuar: () => void
  /** começar com o editor em branco */
  onNovo: () => void
  /** pôr o roteiro de demonstração */
  onDemo: () => void
  /** abrir um .valendo pelo seletor de arquivo */
  onAbrir: () => void
  /** abrir um dos recentes, direto pelo caminho */
  onAbrirRecente: (caminho: string) => void
}

/**
 * "Bem-vindo ao Valendo" com o nome vestido de marca: `Va` verde, `lendo`
 * branco — o mesmo desenho do cabeçalho e do ícone.
 *
 * O nome viaja como `{marca}` DENTRO da frase traduzida, e não colado no fim
 * dela, porque a posição muda por idioma: "Willkommen bei Valendo",
 * "Bienvenue dans Valendo", "Benvenuto in Valendo". Quebrar a frase em duas
 * chaves obrigaria cada tradutor a acertar a costura; um marcador no meio
 * deixa a frase inteira, e quem traduz só o move.
 *
 * `t()` sem valores devolve o `{marca}` intacto — é isso que permite partir a
 * frase aqui em vez de substituir por texto.
 */
function tituloComMarca(frase: string): React.JSX.Element {
  const [antes, depois = ''] = frase.split('{marca}')
  return (
    <>
      {antes}
      <span style={{ color: 'var(--color-go)' }}>Va</span>
      <span>lendo</span>
      {depois}
    </>
  )
}

/**
 * As boas-vindas de toda abertura.
 *
 * Aparecem SEMPRE, e não só na estreia, porque o app deixou de restaurar o
 * trabalho sozinho. Abrir o Valendo num estúdio alheio, ou com a tela já
 * espelhada no telão, mostrava o roteiro anterior sem ninguém ter pedido — e
 * roteiro é material de cliente. Agora a tela começa em branco e quem revela é
 * "Continuar de onde parei", um clique deliberado.
 *
 * Escapar por Escape ou clicando fora cai no caminho MENOS destrutivo que
 * houver: continuar, quando há o que continuar; a demonstração, quando não há.
 * Nunca a tela em branco — essa apaga a recuperação, e nada que apaga pode ser
 * o que acontece por acidente.
 */
export function Welcome({
  lang,
  onLang,
  temSalvo,
  onContinuar,
  onNovo,
  onDemo,
  onAbrir,
  onAbrirRecente
}: Props): React.JSX.Element {
  const { t } = useT()
  const [recentes, setRecentes] = useState<ProjetoRecente[]>([])
  const escapar = temSalvo ? onContinuar : onDemo

  useEffect(() => {
    void window.valendo.listRecentProjects().then(setRecentes)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        escapar()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [escapar])

  return (
    <div
      data-welcome
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onMouseDown={escapar}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 620 }}
        className="flex flex-col overflow-hidden rounded-[16px] border border-[var(--color-line)] bg-[var(--color-ink-1)]"
      >
        <div className="px-[26px] pt-[24px] pb-[20px]">
          <div className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-[var(--color-fog-0)]">
            {tituloComMarca(t('welcome.title'))}
          </div>
          {/* Uma pergunta, e não mais a explicação do que o app é.
              Quem chegou até esta tela já abriu o Valendo — o que ele ainda não
              decidiu é por onde começar HOJE, e é isso que a lista logo abaixo
              responde. */}
          <div className="mt-[11px] text-[16px] leading-snug text-[var(--color-fog-1)]">
            {t('welcome.subtitle')}
          </div>

          {recentes.length > 0 ? (
            <>
              <div className="mt-[24px] flex items-baseline justify-between">
                <span className="text-[10.5px] font-semibold tracking-[0.14em] text-[var(--color-fog-2)] uppercase">
                  {t('welcome.recent')}
                </span>
                {/* os NOMES dos arquivos já contam quase tanto quanto o roteiro
                    dentro deles: quem opera em máquina emprestada precisa de um
                    jeito de apagar essa vitrine */}
                <button
                  type="button"
                  data-welcome-limpar
                  onClick={() => void window.valendo.clearRecentProjects().then(setRecentes)}
                  className="text-[11.5px] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]"
                >
                  {t('welcome.clearRecent')}
                </button>
              </div>
              <div className="mt-[9px] flex flex-wrap gap-[7px]">
                {recentes.map((projeto) => (
                  <button
                    key={projeto.caminho}
                    type="button"
                    data-welcome-recente
                    // o caminho inteiro no hover: dois projetos podem ter o
                    // mesmo nome em pastas diferentes, e o chip só mostra o nome
                    title={projeto.caminho}
                    onClick={() => onAbrirRecente(projeto.caminho)}
                    className="max-w-[280px] truncate rounded-full border border-[var(--color-line)] px-[13px] py-[6px] text-[12.5px] text-[var(--color-fog-1)] hover:border-[var(--color-link)] hover:text-[var(--color-fog-0)]"
                  >
                    {projeto.nome}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="border-t border-[var(--color-line)] bg-[var(--color-ink-0)] px-[26px] py-[20px]">
          <div className={`grid gap-[10px] ${temSalvo ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {temSalvo ? (
              <Caminho
                icone="restart"
                data="continuar"
                titulo={t('welcome.continue')}
                destaque
                onClick={onContinuar}
              />
            ) : null}
            <Caminho icone="project" data="novo" titulo={t('welcome.new')} onClick={onNovo} />
            <Caminho icone="play" data="demo" titulo={t('welcome.demo')} destaque={!temSalvo} onClick={onDemo} />
            <Caminho icone="projectOpen" data="abrir" titulo={t('welcome.open')} onClick={onAbrir} />
          </div>

          {/*
            O idioma por ÚLTIMO, e menor.

            Ele abria a tela, acima até do que a pessoa veio fazer — e é a
            escolha menos frequente das quatro coisas aqui: acerta-se uma vez
            por instalação, porque o app já chega no idioma do sistema. Atrás
            do filete e em corpo menor ele continua achável e para de disputar
            atenção com o trabalho.
          */}
          <div className="mt-[18px] border-t border-[var(--color-line)] pt-[14px]">
            <div className="text-[7.5px] font-semibold tracking-[0.14em] text-[var(--color-fog-2)] uppercase">
              {t('welcome.language')}
            </div>
            {/* cada idioma escrito no próprio idioma: quem não lê o daqui precisa se achar */}
            <div className="mt-[7px] flex flex-wrap gap-[5px]">
              {LANGS.map((idioma) => (
                <button
                  key={idioma.id}
                  type="button"
                  data-welcome-lang={idioma.id}
                  aria-pressed={idioma.id === lang}
                  onClick={() => onLang(idioma.id)}
                  className={
                    idioma.id === lang
                      ? 'rounded-[5px] border border-[var(--color-accent)] bg-[var(--color-accent)]/16 px-[8px] py-[5px] text-[9.5px] font-medium text-[var(--color-fog-0)]'
                      : 'rounded-[5px] border border-[var(--color-line)] px-[8px] py-[5px] text-[9.5px] text-[var(--color-fog-1)] hover:border-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]'
                  }
                >
                  {idioma.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Um caminho: ícone e nome, e nada mais.
 *
 * Tinha uma linha de explicação embaixo de cada um — "abre o editor vazio,
 * para colar ou digitar o seu texto". Saiu: os quatro nomes já dizem o que
 * fazem, e quatro parágrafos lado a lado transformavam uma escolha de um
 * segundo numa página para ler.
 */
function Caminho({
  icone,
  data,
  titulo,
  destaque,
  onClick
}: {
  icone: React.ComponentProps<typeof Icon>['name']
  data: string
  titulo: string
  destaque?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-welcome-acao={data}
      autoFocus={destaque}
      onClick={onClick}
      className={
        'flex flex-col items-start gap-[9px] rounded-[10px] border px-[13px] py-[13px] text-left ' +
        (destaque
          ? 'border-[var(--color-go)]/45 bg-[var(--color-go)]/12 hover:bg-[var(--color-go)]/20'
          : 'border-[var(--color-line)] hover:border-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]')
      }
    >
      <span className={destaque ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-2)]'}>
        <Icon name={icone} size={18} />
      </span>
      <span
        className={
          'text-[13.5px] leading-snug font-medium ' +
          (destaque ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-0)]')
        }
      >
        {titulo}
      </span>
    </button>
  )
}
