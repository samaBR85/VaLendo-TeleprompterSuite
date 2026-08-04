/**
 * O esmaecimento das bordas: uma janela legível em volta da marca de leitura,
 * apagando para os dois lados.
 *
 * Era uma máscara com paradas fixas no código — `30% … 52%` de janela limpa,
 * acertadas à mão uma vez. Duas coisas estavam erradas nisso:
 *
 * 1. A janela NÃO acompanhava a marca de leitura. Com a marca no padrão (38%)
 *    as duas quase coincidiam por sorte; movendo a marca para 70%, a janela
 *    continuava clareando o meio da tela e a marca caía na zona apagada — o
 *    texto sob ela ficava mais escuro que o texto acima.
 * 2. Não dava para regular. Só ligava e desligava.
 *
 * Agora as paradas são medidas em FRAÇÃO DO ESPAÇO DISPONÍVEL de cada lado da
 * marca, e não em fração da tela. É o que faz a janela seguir a marca sem
 * ficar torta: com a marca a 38% sobra pouco acima e muito abaixo, e cada
 * lado gasta a mesma PROPORÇÃO do que tem.
 */

/** Opacidade no meio da queda: nem legível, nem sumido. */
const MEIO = 0.38

/*
 * A escala do controle, calibrada para o padrão devolver a tela DE ANTES.
 *
 * Com `focoPct = 60` e a marca em 38%, as paradas saem em 12,9% · 29,6% —
 * 51,6% · 78,9%, contra os 12% · 30% — 52% · 78% escritos à mão antes. Meio
 * ponto percentual de diferença: quem não mexer no controle não vê mudança
 * nenhuma, que é a condição para isto entrar sem avisar ninguém.
 */
const LIMPO_ABERTO = 0.43
/*
 * O mínimo da janela é UMA LINHA, não um fio.
 *
 * Fechando até 0.02 a faixa nítida ficava com 2% da altura — menos que a
 * altura de uma linha no corpo padrão. O efeito não era "estreito", era
 * errado: a própria linha sob a marca saía meio esmaecida no topo e no pé,
 * que é exatamente o que o recurso existe para evitar. 0.08 dá ~8% da tela,
 * a ordem de grandeza de uma linha.
 */
const LIMPO_FECHADO = 0.08
const QUEDA_ABERTA = 0.93
const QUEDA_FECHADA = 0.48

const clamp = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor))

/**
 * O `mask-image` da camada de texto.
 *
 * @param readingLinePct posição da marca, 0..1
 * @param focoPct quanto esmaecer, 0..100 — MAIS alto é mais apagado, porque o
 *   controle se chama "esmaecer": subir tem de escurecer. No mínimo a janela
 *   fica larga e sobra pouco apagado; no máximo vira uma fresta.
 */
export function mascaraDeFoco(readingLinePct: number, focoPct: number): string {
  const linha = clamp(readingLinePct, 0, 1)
  const t = clamp(focoPct, 0, 100) / 100

  const limpo = LIMPO_ABERTO + (LIMPO_FECHADO - LIMPO_ABERTO) * t
  const queda = QUEDA_ABERTA + (QUEDA_FECHADA - QUEDA_ABERTA) * t

  const acima = linha
  const abaixo = 1 - linha

  // em porcentagem da tela, que é o que o gradiente entende
  const pct = (valor: number): string => `${(valor * 100).toFixed(2)}%`

  return [
    'linear-gradient(to bottom',
    `transparent ${pct(linha - acima)}`,
    `rgba(0,0,0,${MEIO}) ${pct(linha - queda * acima)}`,
    `#000 ${pct(linha - limpo * acima)}`,
    `#000 ${pct(linha + limpo * abaixo)}`,
    `rgba(0,0,0,${MEIO}) ${pct(linha + queda * abaixo)}`,
    `transparent ${pct(linha + abaixo)}`
  ].join(', ') + ')'
}
