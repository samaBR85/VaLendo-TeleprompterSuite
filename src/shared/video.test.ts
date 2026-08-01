import { describe, expect, it } from 'vitest'
import type { Cartao, VideoClock } from './types'
import {
  ehVideo,
  podeIrAoAr,
  posicaoDoVideo,
  precisaConverter,
  tempoDeVideo,
  terminou,
  tipoDoVideo,
  VIDEO_PARADO
} from './video'

const tocando = (base: number, comecouEm: number): VideoClock => ({
  ...VIDEO_PARADO,
  tocando: true,
  base,
  comecouEm
})

const videoCard = (extra: Partial<Extract<Cartao, { kind: 'video' }>> = {}): Cartao => ({
  id: 'c1',
  kind: 'video',
  nome: 'Vinheta',
  caminho: 'D:/artes/vinheta.mp4',
  arquivoNome: 'vinheta.mp4',
  ...extra
})

describe('relógio do vídeo', () => {
  it('parado, fica onde parou por mais tempo que passe', () => {
    expect(posicaoDoVideo({ ...VIDEO_PARADO, base: 12 }, 999_999, 60)).toBe(12)
  })

  it('tocando, anda com o relógio da máquina', () => {
    expect(posicaoDoVideo(tocando(10, 1_000), 4_000, 60)).toBeCloseTo(13)
  })

  it('sem duração conhecida, anda mesmo assim', () => {
    // a duração só chega quando o vídeo carrega; até lá o relógio não pode
    // travar, senão o primeiro segundo de exibição fica congelado
    expect(posicaoDoVideo(tocando(0, 0), 2_000, undefined)).toBeCloseTo(2)
  })

  it('sem loop, segura o último quadro em vez de sumir da tela', () => {
    expect(posicaoDoVideo(tocando(0, 0), 90_000, 60)).toBe(60)
    expect(terminou(tocando(0, 0), 90_000, 60)).toBe(true)
  })

  it('com loop, volta ao começo', () => {
    expect(posicaoDoVideo(tocando(0, 0), 70_000, 60, true)).toBeCloseTo(10)
    // repetindo, nunca "terminou": não há último quadro a segurar
    expect(terminou(tocando(0, 0), 70_000, 60, true)).toBe(false)
  })

  it('nunca devolve segundo negativo', () => {
    // relógio da máquina pode andar para trás com ajuste de horário; a barra
    // não pode ir para antes do começo do vídeo por causa disso
    expect(posicaoDoVideo(tocando(0, 10_000), 5_000, 60)).toBe(0)
  })
})

describe('formatos', () => {
  it('aceita o que o Chromium toca', () => {
    expect(ehVideo('vinheta.mp4')).toBe(true)
    expect(ehVideo('VINHETA.MP4')).toBe(true)
    expect(ehVideo('clipe.webm')).toBe(true)
  })

  it('aceita .mov, mas por conversão', () => {
    // o Chromium não toca o invólucro do QuickTime nem com H.264 dentro; o
    // ffmpeg troca a embalagem antes de o cartão existir
    expect(ehVideo('camera.mov')).toBe(true)
    expect(precisaConverter('camera.mov')).toBe(true)
    expect(precisaConverter('CAMERA.MOV')).toBe(true)
  })

  it('o que já toca não passa pela conversão à toa', () => {
    expect(precisaConverter('vinheta.mp4')).toBe(false)
    expect(precisaConverter('clipe.webm')).toBe(false)
  })

  it('não inventa vídeo onde não há', () => {
    expect(ehVideo('roteiro.docx')).toBe(false)
    expect(precisaConverter('roteiro.docx')).toBe(false)
  })

  it('dá o tipo certo para o cabeçalho', () => {
    expect(tipoDoVideo('a.mp4')).toBe('video/mp4')
    expect(tipoDoVideo('a.m4v')).toBe('video/mp4')
    expect(tipoDoVideo('a.webm')).toBe('video/webm')
    expect(tipoDoVideo('a.xyz')).toBe('application/octet-stream')
  })
})

describe('tempo na tela', () => {
  it('lê como tempo de vídeo', () => {
    expect(tempoDeVideo(0)).toBe('0:00')
    expect(tempoDeVideo(9)).toBe('0:09')
    expect(tempoDeVideo(75)).toBe('1:15')
    expect(tempoDeVideo(600)).toBe('10:00')
  })

  it('não quebra com número que não existe', () => {
    // `duration` de um vídeo que ainda não carregou vem NaN ou Infinity
    expect(tempoDeVideo(NaN)).toBe('0:00')
    expect(tempoDeVideo(Infinity)).toBe('0:00')
    expect(tempoDeVideo(-5)).toBe('0:00')
  })
})

describe('o que pode ir ao ar', () => {
  it('vídeo desvinculado não sobe', () => {
    // preferível o atalho não fazer nada a mandar um retângulo preto para a
    // tela do apresentador
    expect(podeIrAoAr(videoCard({ vinculado: false }))).toBe(false)
  })

  it('vídeo vinculado sobe', () => {
    expect(podeIrAoAr(videoCard({ vinculado: true }))).toBe(true)
  })

  it('imagem e recado nunca são barrados por isto', () => {
    expect(podeIrAoAr({ id: 'c2', kind: 'image', nome: '', arquivo: 'a.png' })).toBe(true)
    expect(podeIrAoAr({ id: 'c3', kind: 'text', nome: '', texto: 'CORTA' })).toBe(true)
  })
})
