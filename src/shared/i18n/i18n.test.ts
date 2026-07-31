import { describe, expect, it } from 'vitest'
import { COMMANDS } from '../commands'
import { presetsPadrao, roteiroDeExemplo } from '../defaults'
import { dicionario, plural, rotuloDoComando, traduzir } from './index'
import { pt } from './pt'
import { idiomaDoSistema, larguraDoPainel, LANGS } from './types'

const IDIOMAS = LANGS.map((l) => l.id)

describe('os seis dicionários', () => {
  it('têm exatamente as mesmas chaves do português', () => {
    const esperadas = Object.keys(pt).sort()
    for (const lang of IDIOMAS) {
      expect(Object.keys(dicionario(lang)).sort(), lang).toEqual(esperadas)
    }
  })

  it('não deixam nenhum texto vazio', () => {
    for (const lang of IDIOMAS) {
      for (const [chave, texto] of Object.entries(dicionario(lang))) {
        expect(texto.trim().length, `${lang} · ${chave}`).toBeGreaterThan(0)
      }
    }
  })

  it('preservam as marcas de interpolação em todos os idiomas', () => {
    // "{size}" sumindo numa tradução vira um aviso sem o número dentro
    const marcas = (texto: string): string[] => (texto.match(/\{\w+\}/g) ?? []).sort()
    for (const [chave, original] of Object.entries(pt)) {
      for (const lang of IDIOMAS) {
        expect(marcas(dicionario(lang)[chave as keyof typeof pt]), `${lang} · ${chave}`).toEqual(
          marcas(original)
        )
      }
    }
  })

  it('nenhum dicionário é uma cópia do português', () => {
    /*
     * O que este teste pega é o acidente grande: alguém duplica pt.ts para
     * criar um idioma novo e traduz metade. Não serve para achar chave
     * esquecida uma a uma — espanhol coincide legitimamente em umas 40
     * ("Ajustes", "Créditos", "Ritmo lento", "Marcador anterior"), e alemão em
     * quase nenhuma. Por isso o limite é proporcional e folgado: uma cópia
     * inteira daria perto de 100%.
     */
    const total = Object.keys(pt).length
    for (const lang of IDIOMAS.filter((l) => l !== 'pt-BR')) {
      const repetidas = Object.entries(pt).filter(
        ([chave, texto]) => dicionario(lang)[chave as keyof typeof pt] === texto
      ).length
      expect(repetidas / total, `${lang}: ${repetidas}/${total} iguais ao português`).toBeLessThan(0.25)
    }
  })
})

describe('todo comando tem rótulo em todo idioma', () => {
  it('nenhum cai na chave crua', () => {
    for (const lang of IDIOMAS) {
      for (const command of COMMANDS) {
        const rotulo = rotuloDoComando(lang, command.id)
        expect(rotulo, `${lang} · ${command.id}`).not.toContain('cmd.')
        expect(rotulo.trim().length, `${lang} · ${command.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('os gerados trazem o número dentro', () => {
    expect(rotuloDoComando('en', 'tab.switch.3')).toContain('3')
    expect(rotuloDoComando('de', 'marker.goto.7')).toContain('7')
  })
})

describe('interpolação', () => {
  it('troca o que foi passado', () => {
    expect(traduzir('pt-BR', 'insp.wrapping.fix', { size: 42 })).toBe('Ajustar corpo para 42px')
  })

  it('deixa como está o que não foi passado, em vez de escrever "undefined"', () => {
    expect(traduzir('pt-BR', 'insp.wrapping.fix')).toContain('{size}')
  })
})

describe('plural', () => {
  it('um é singular, vários é plural', () => {
    expect(plural('pt-BR', 1, 'status.markers')).toBe('1 marcador')
    expect(plural('pt-BR', 3, 'status.markers')).toBe('3 marcadores')
  })

  it('zero é plural em cinco dos seis', () => {
    expect(plural('pt-BR', 0, 'status.markers')).toBe('0 marcadores')
    expect(plural('en', 0, 'status.markers')).toBe('0 markers')
    expect(plural('de', 0, 'status.undo')).toContain('Schritte')
  })

  it('mas o francês trata zero como singular', () => {
    // "0 repère", não "0 repères" — é a regra da língua, não um detalhe
    expect(plural('fr', 0, 'status.markers')).toBe('0 repère')
    expect(plural('fr', 1, 'status.markers')).toBe('1 repère')
    expect(plural('fr', 2, 'status.markers')).toBe('2 repères')
  })
})

describe('idioma do sistema, só no primeiro uso', () => {
  it('reconhece as variantes que o Windows manda', () => {
    expect(idiomaDoSistema('pt-BR')).toBe('pt-BR')
    expect(idiomaDoSistema('pt-PT')).toBe('pt-BR')
    expect(idiomaDoSistema('en-US')).toBe('en')
    expect(idiomaDoSistema('es-MX')).toBe('es')
    expect(idiomaDoSistema('de-AT')).toBe('de')
    expect(idiomaDoSistema('fr-CA')).toBe('fr')
    expect(idiomaDoSistema('it-CH')).toBe('it')
  })

  it('cai no português quando não fala a língua', () => {
    expect(idiomaDoSistema('ja-JP')).toBe('pt-BR')
    expect(idiomaDoSistema('')).toBe('pt-BR')
  })
})

describe('largura do painel de ajustes', () => {
  it('alarga só onde o texto cresce', () => {
    expect(larguraDoPainel('de')).toBeGreaterThan(larguraDoPainel('pt-BR'))
    expect(larguraDoPainel('fr')).toBeGreaterThan(larguraDoPainel('pt-BR'))
  })

  it('e mantém a largura de sempre nos outros', () => {
    expect(larguraDoPainel('pt-BR')).toBe(214)
    expect(larguraDoPainel('en')).toBe(214)
    expect(larguraDoPainel('es')).toBe(214)
    expect(larguraDoPainel('it')).toBe(214)
  })
})

describe('conteúdo nasce no idioma, mas não é reescrito depois', () => {
  it('as paletas vêm com nome traduzido na criação', () => {
    expect(presetsPadrao('en')[0].name).toBe('Classic')
    expect(presetsPadrao('de')[2].name).toBe('Bernstein')
  })

  it('mas o id nunca muda — é ele que o roteiro salvo referencia', () => {
    const ids = (lang: 'pt-BR' | 'de'): string[] => presetsPadrao(lang).map((p) => p.id)
    expect(ids('de')).toEqual(ids('pt-BR'))
  })

  it('o roteiro de exemplo vem no idioma e mantém a estrutura de capítulos', () => {
    for (const lang of IDIOMAS) {
      const texto = roteiroDeExemplo(lang)
      expect(texto.split('\n\n').filter((l) => l.startsWith('§')).length, lang).toBe(2)
      expect(texto, lang).toMatch(/\[.+\]/)
    }
  })
})
