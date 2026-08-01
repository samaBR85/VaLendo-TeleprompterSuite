import { describe, expect, it } from 'vitest'
import { mbPorMinuto, perfilPorId, PERFIS, PERFIS_DA_REDE } from './proxy'

describe('perfis de peso da rede', () => {
  it('todos são 16:9 exato', () => {
    // não é capricho: o teto com a mesma proporção da fonte faz a conta fechar
    // redonda, e a caixa anunciada na tela é exatamente o que sai
    for (const p of PERFIS) {
      expect(p.largura / p.altura, `${p.id} ${p.largura}x${p.altura}`).toBeCloseTo(16 / 9, 4)
    }
  })

  it('todos têm lados pares', () => {
    // o H.264 em yuv420p recusa lado ímpar. Já aconteceu: o perfil leve era
    // 854x480, um 1080p ali dentro dava 480,375 de altura, e a conversão
    // falhava só nesse perfil, sem dizer nada
    for (const p of PERFIS) {
      expect(p.largura % 2, `${p.id} largura`).toBe(0)
      expect(p.altura % 2, `${p.id} altura`).toBe(0)
    }
  })

  it('descem em peso a cada degrau', () => {
    // a lista da tela promete uma escada; se ela desandar, "média" poderia
    // pesar mais que "alta" e ninguém entenderia a escolha
    for (let i = 1; i < PERFIS.length; i += 1) {
      expect(PERFIS[i].kbps, PERFIS[i].id).toBeLessThan(PERFIS[i - 1].kbps)
      // o tamanho pode repetir entre degraus, e repete de propósito: o que
      // desce é o peso. Encolher a imagem borra o que está escrito na arte,
      // que é justamente o que quem confere pelo celular precisa ler
      expect(PERFIS[i].largura, PERFIS[i].id).toBeLessThanOrEqual(PERFIS[i - 1].largura)
    }
  })

  it('nenhum degrau desce abaixo de 720p', () => {
    // foi o erro da primeira versão: a 432p a arte fica ilegível no celular,
    // por mais bitrate que se dê
    for (const p of PERFIS) expect(p.altura, p.id).toBeGreaterThanOrEqual(720)
  })

  it('a lista da tela tem o original e todos os perfis, sem sobra', () => {
    expect(PERFIS_DA_REDE[0]).toBe('original')
    expect(PERFIS_DA_REDE.slice(1)).toEqual(PERFIS.map((p) => p.id))
  })

  it('só o original não tem perfil', () => {
    expect(perfilPorId('original')).toBeNull()
    for (const p of PERFIS) expect(perfilPorId(p.id)).not.toBeNull()
  })

  it('o custo por minuto bate com o bitrate somado', () => {
    // é este número que o operador lê antes de escolher; errar aqui é
    // prometer um peso e entregar outro
    const leve = perfilPorId('leve')!
    expect(mbPorMinuto(leve)).toBeCloseTo(((800 + 96) * 60) / 8 / 1024, 3)
    expect(mbPorMinuto(leve)).toBeGreaterThan(mbPorMinuto(perfilPorId('minima')!))
  })
})
