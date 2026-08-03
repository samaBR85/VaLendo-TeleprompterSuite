import { describe, expect, it } from 'vitest'
import { createInitialState, roteiroDeExemplo } from './defaults'
import { idiomaDoSistema } from './i18n'
import { semMaquina, semTransitorio } from './project'

/**
 * A primeira abertura do app numa máquina nova.
 *
 * Três coisas precisam ser verdade juntas para as boas-vindas fazerem sentido:
 * o idioma tem que sair do sistema (senão o modal abre numa língua estrangeira
 * para escolher a língua), a amostra tem que sair no mesmo idioma da interface,
 * e nada disso pode virar campo do projeto — o modal é sobre ESTA máquina, não
 * sobre o arquivo.
 */
describe('estreia', () => {
  it('a amostra nasce no idioma da interface, não numa língua fixa', () => {
    for (const lang of ['pt-BR', 'en', 'es', 'de', 'fr', 'it'] as const) {
      const state = createInitialState(undefined, lang)
      expect(state.language).toBe(lang)
      expect(state.tabs[0].blocks.map((b) => b.text).join('\n\n')).toBe(roteiroDeExemplo(lang))
    }
  })

  it('cada idioma dá uma amostra diferente — nenhum caiu no português por engano', () => {
    const amostras = ['pt-BR', 'en', 'es', 'de', 'fr', 'it'].map((l) =>
      roteiroDeExemplo(l as Parameters<typeof roteiroDeExemplo>[0])
    )
    expect(new Set(amostras).size).toBe(6)
  })

  it('a reserva é o inglês, para quem fala uma língua que o app não fala', () => {
    expect(idiomaDoSistema('ja-JP')).toBe('en')
    expect(idiomaDoSistema('ru-RU')).toBe('en')
    // e a string vazia, que é o que o Electron devolve antes de estar pronto
    expect(idiomaDoSistema('')).toBe('en')
  })

  it('o sistema ainda manda quando o app fala a língua dele', () => {
    expect(idiomaDoSistema('pt-BR')).toBe('pt-BR')
    expect(idiomaDoSistema('de-AT')).toBe('de')
  })

  /*
   * O sinal de estreia mora no StateSnapshot, e não no AppState. Este teste
   * cobra isso pela consequência: se um dia alguém o mudar de lugar, ele
   * aparece no que vai para o disco, e o modal de boas-vindas passa a abrir na
   * máquina de quem receber o `.valendo` de um colega.
   */
  it('não existe campo de estreia dentro do que é salvo', () => {
    const arquivo = semMaquina(semTransitorio(createInitialState()))
    expect('estreia' in arquivo).toBe(false)
    expect(JSON.stringify(arquivo)).not.toContain('estreia')
  })
})
