import { chaveDoNome } from './apresentadores'
import type { Apresentador, Appearance } from './types'

/**
 * Presets de aparência: o jeito do operador, guardado para vestir de novo.
 *
 * O "salvar como padrão" de antes gravava UM molde, e só servia para as abas
 * que nascessem depois — não havia como vestir esse molde numa aba que já
 * existe, que é justamente o que se quer ao importar o `.txt` da semana ou
 * duplicar um roteiro.
 *
 * São cinco lugares fixos, e não uma lista que cresce, pelo mesmo motivo dos
 * cartões numerados: lugar fixo vira memória muscular. Cada um tem nome e cor
 * porque cor sozinha não carrega significado — daqui a dois meses "o azul" não
 * diz nada e "Igreja" diz.
 *
 * Um deles pode levar a estrela: é com ele que abas novas nascem. Isso substitui
 * o "voltar ao de fábrica" — sem estrela em ninguém, nasce de fábrica.
 *
 * Onde ficam gravados: um arquivo da MÁQUINA (`main/presets.ts`), nunca o
 * `AppState`. Um preset dentro do `AppState` viajaria no `.valendo` e chegaria
 * junto com o roteiro na máquina de um colega — e o preset é o jeito de quem
 * opera, não parte do programa que se entrega.
 */

export const PRESET_SLOTS = 5

export interface Preset {
  nome: string
  cor: string
  appearance: Appearance
  apresentadores: Apresentador[]
  /**
   * A velocidade com que este jeito de trabalhar começa.
   *
   * Guardada, mas só aplicada quando a aba NASCE — ver `apresentadoresAoAplicar`
   * e o reducer. O ppm é do transporte, não da aba: mexer nele com o roteiro no
   * ar muda o ritmo do apresentador na hora, e é a única peça do preset que não
   * tem desfazer.
   */
  ppm: number
}

export interface Presets {
  /** sempre `PRESET_SLOTS` posições; `null` é lugar vazio */
  slots: (Preset | null)[]
  /** posição do que leva a estrela, ou `null` — abas novas nascem de fábrica */
  padrao: number | null
}

/** As cores oferecidas, na ordem. As mesmas dos apresentadores e das abas. */
export const CORES_DE_PRESET = ['#7ee0a8', '#8ab4ff', '#f2a3d4', '#ffd479', '#a99bff', '#7fe3e0']

export function presetsVazios(): Presets {
  return { slots: Array(PRESET_SLOTS).fill(null), padrao: null }
}

/** Dentro da faixa e apontando para um lugar que existe de verdade. */
export function lugarValido(indice: number): boolean {
  return Number.isInteger(indice) && indice >= 0 && indice < PRESET_SLOTS
}

/**
 * O preset com a estrela, ou nada.
 *
 * Um `padrao` apontando para lugar vazio conta como nada: o lugar pode ter sido
 * apagado por uma versão antiga, ou o arquivo ter sido editado à mão.
 */
export function presetPadrao(presets: Presets): Preset | null {
  if (presets.padrao === null || !lugarValido(presets.padrao)) return null
  return presets.slots[presets.padrao] ?? null
}

/**
 * Quem do preset entra na aba, e com que cor.
 *
 * A regra, numa frase: **o preset traz os apresentadores dele, mas só os que o
 * roteiro daquela aba realmente cita — e não tira ninguém.**
 *
 * Substituir a lista seria mais simples de explicar e destruiria trabalho certo:
 * aplicar um preset de HARI e ROBSON num roteiro de ANA, PEDRO e CARLA apagaria
 * os três (com as cores que alguém escolheu), poria dois órfãos no lugar, e o
 * texto perderia a cor inteira. Misturar tudo seria o oposto: ANA, PEDRO, CARLA
 * mais dois chips inúteis para sempre.
 *
 * Passando o roteiro pelo porteiro, os dois casos que importam se resolvem
 * sozinhos:
 *
 * - **Mesmo programa, roteiro novo.** O `.txt` da semana traz HARI e ROBSON
 *   escritos e a aba ainda não registrou ninguém: os dois entram já casados e
 *   nas cores certas, e ninguém precisa registrar à mão.
 * - **Outro programa.** HARI e ROBSON não estão escritos ali, então não entram.
 *   ANA, PEDRO e CARLA continuam exatamente como estavam.
 *
 * Nome que existe dos dois lados mantém o `id` da ABA e recebe a cor do PRESET:
 * o id é o que sobrevive ao RELINK, e jogá-lo fora quebraria o vínculo que o
 * operador já tinha consertado; a cor é o que o preset veio decidir.
 *
 * `novoId` entra de fora porque cunhar id é do reducer — o contador que vai
 * dentro dele é por processo, e um id cunhado noutro lugar poderia colidir.
 */
export function apresentadoresAoAplicar(
  doPreset: Apresentador[],
  daAba: Apresentador[],
  linhasDoRoteiro: string[],
  novoId: (indice: number) => string
): Apresentador[] {
  const citados = new Set(linhasDoRoteiro.map(chaveDoNome))
  const fora = daAba.map((a) => ({ ...a }))
  const porChave = new Map(fora.map((a) => [chaveDoNome(a.nome), a]))

  for (const vindo of doPreset) {
    const chave = chaveDoNome(vindo.nome)
    // o porteiro: quem o roteiro desta aba não cita, não entra
    if (chave === '' || !citados.has(chave)) continue

    const jaEsta = porChave.get(chave)
    if (jaEsta) {
      jaEsta.cor = vindo.cor
      jaEsta.oculto = vindo.oculto
      continue
    }

    const novo: Apresentador = {
      id: novoId(fora.length),
      nome: vindo.nome,
      cor: vindo.cor,
      oculto: vindo.oculto
    }
    fora.push(novo)
    porChave.set(chave, novo)
  }

  return fora
}

/**
 * A aparência do preset, pronta para entrar numa aba.
 *
 * A cópia em dois níveis é a mesma de `createTab`, e pelo mesmo motivo: sem ela
 * a aba passaria a compartilhar o objeto de relógios com o preset guardado, e
 * mexer num mexeria no outro sem ninguém pedir.
 *
 * `deixas` sai daqui zerada de propósito — ela é DERIVADA dos apresentadores, e
 * quem a mantém em dia é o funil por onde toda troca de aba passa. Trazer a do
 * preset seria trazer uma lista velha, de outros nomes.
 */
export function aparenciaDoPreset(preset: Preset): Appearance {
  return { ...preset.appearance, timers: { ...preset.appearance.timers }, deixas: [] }
}
