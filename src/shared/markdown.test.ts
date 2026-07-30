import { describe, expect, it } from 'vitest'
import { htmlToScript, markdownToScript } from './markdown'
import { blocksFromText } from './text'

describe('markdownToScript', () => {
  it('transforma título em capítulo', () => {
    const script = markdownToScript('# Abertura\n\nboa noite a todos')
    expect(script).toBe('§ Abertura\n\nboa noite a todos')
    expect(blocksFromText(script).map((b) => b.kind)).toEqual(['chapter', 'speech'])
  })

  it('aceita título sublinhado no estilo setext', () => {
    expect(markdownToScript('Abertura\n========\n\nfala aqui')).toBe('§ Abertura\n\nfala aqui')
  })

  it('tira a marcação de ênfase sem comer o texto', () => {
    expect(markdownToScript('isso é **muito** _importante_ e ~~antigo~~')).toBe(
      'isso é muito importante e antigo'
    )
  })

  it('mantém o texto do link e descarta a imagem', () => {
    expect(markdownToScript('veja o [relatório](https://exemplo.com) ![logo](logo.png)')).toBe(
      'veja o relatório'
    )
  })

  it('tira marcador de lista e de tarefa', () => {
    expect(markdownToScript('- primeiro item\n- segundo item')).toBe('primeiro item\nsegundo item')
    expect(markdownToScript('1. um\n2. dois')).toBe('um\ndois')
  })

  it('tira a citação em bloco', () => {
    expect(markdownToScript('> alguém disse isso')).toBe('alguém disse isso')
  })

  it('preserva o conteúdo do bloco de código em vez de apagar texto do usuário', () => {
    expect(markdownToScript('```\nfala reservada\n```')).toBe('fala reservada')
  })

  it('não deixa asterisco solto virar itálico', () => {
    expect(markdownToScript('2 * 3 = 6')).toBe('2 * 3 = 6')
  })
})

describe('htmlToScript', () => {
  it('mapeia títulos para capítulo e parágrafos para fala', () => {
    const html = '<h1>Abertura</h1><p>boa noite</p><li>um item</li>'
    expect(htmlToScript(html)).toBe('§ Abertura\n\nboa noite\n\num item')
  })

  it('descarta tags vazias e converte quebra de linha', () => {
    expect(htmlToScript('<p></p><p>uma<br/>frase</p>')).toBe('uma frase')
  })

  it('cai para texto puro quando não há blocos reconhecíveis', () => {
    expect(htmlToScript('só texto solto')).toBe('só texto solto')
  })
})
