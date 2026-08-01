import { useEffect, useRef, useState } from 'react'
import type { WebviewFrame } from '@shared/api'
import { canvasBox } from '@shared/output'
import { idiomaDoSistema, traduzir } from '@shared/i18n'
import { PrompterCanvas, VideoCartao } from '../prompter/PrompterCanvas'

const PADRAO = { width: 1_920, height: 1_080 }

/** Bandeiras no fim do endereço: `#video`, `#diag`, ou `#video-diag`. */
function bandeiras(): Set<string> {
  return new Set(window.location.hash.replace('#', '').split(/[^a-z]+/i).filter(Boolean))
}

/**
 * Números do aparelho de quem está assistindo, na tela dele.
 *
 * Existe porque um engasgo relatado por telefone não se investiga: no meu
 * computador nada reproduz, e o Chrome do iPhone não se deixa inspeccionar de
 * um Windows. Então o aparelho vira o instrumento — e a comparação entre
 * `#video-diag` e `#diag` diz, com número, se o gargalo é o meu desenho em
 * volta ou o vídeo em si.
 *
 * Escreve direto no DOM, sem passar por estado do React: um medidor que
 * provoca redesenho mede o próprio medidor.
 */
function Medidor(): React.JSX.Element {
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let quadrosDoVideo = 0
    let piorIntervalo = 0
    let anterior = performance.now()
    let vivo = true

    const contarQuadro = (): void => {
      const v = document.querySelector('video')
      if (!v) return
      const vv = v as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number
      }
      if (!vv.requestVideoFrameCallback) return
      vv.requestVideoFrameCallback(() => {
        quadrosDoVideo += 1
        if (vivo) contarQuadro()
      })
    }
    contarQuadro()

    // o maior intervalo entre quadros da PÁGINA denuncia travada de thread
    // principal; o vídeo pode estar liso e a página engasgada, ou o contrário
    const passo = (): void => {
      if (!vivo) return
      const agora = performance.now()
      piorIntervalo = Math.max(piorIntervalo, agora - anterior)
      anterior = agora
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)

    const id = setInterval(() => {
      const alvo = caixa.current
      if (!alvo) return

      /*
       * Zero pode ser um resultado ou pode ser nada.
       *
       * Com a aba em segundo plano — trocar de app no celular, apagar a tela —
       * o navegador congela `requestAnimationFrame` e a contagem de quadros,
       * mas o relógio deste intervalo continua. Sem esta ressalva, os
       * contadores mostrariam zero e alguém leria como "perfeito".
       */
      if (document.visibilityState !== 'visible') {
        alvo.textContent = 'em segundo plano — os números só valem com a tela à frente'
        quadrosDoVideo = 0
        piorIntervalo = 0
        return
      }

      const v = document.querySelector('video')
      const q = v?.getVideoPlaybackQuality?.()
      const buffer = v && v.buffered.length ? v.buffered.end(v.buffered.length - 1) - v.currentTime : 0
      const semContagem = !(v as { requestVideoFrameCallback?: unknown } | null)?.requestVideoFrameCallback
      alvo.textContent =
        `${semContagem ? '—' : quadrosDoVideo} q/s · perdidos ${q?.droppedVideoFrames ?? '?'}` +
        ` · pior pausa ${Math.round(piorIntervalo)}ms · buffer ${buffer.toFixed(0)}s`
      quadrosDoVideo = 0
      piorIntervalo = 0
    }, 1000)

    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [])

  return (
    <div
      ref={caixa}
      data-web-medidor
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        background: 'rgba(0,0,0,0.72)',
        color: '#7fe0b0',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 13,
        padding: '6px 8px',
        textAlign: 'center'
      }}
    />
  )
}

/**
 * Liga o som, e desmuta dentro do próprio clique.
 *
 * O navegador só libera som logo depois de um toque, e o iPhone é o mais
 * rigoroso: esperar o React redesenhar pode ser tarde demais, e o pedido seria
 * recusado sem dizer nada. Mexer no elemento aqui é o caminho que ele aceita.
 */
function BotaoDeSom({ onLigar, rotulo }: { onLigar: () => void; rotulo: string }): React.JSX.Element {
  return (
    <button
      type="button"
      data-web-som
      onClick={() => {
        onLigar()
        const video = document.querySelector('video')
        if (!video) return
        video.muted = false
        void video.play().catch(() => undefined)
      }}
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 18px',
        borderRadius: 999,
        border: 'none',
        background: 'rgba(255,255,255,0.92)',
        color: '#14171a',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        cursor: 'pointer'
      }}
    >
      {rotulo}
    </button>
  )
}

function AvisoDeQueda({ texto }: { texto: string }): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        padding: '5px 12px',
        borderRadius: 6,
        background: 'rgba(226,75,74,0.9)',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13
      }}
    >
      {texto}
    </div>
  )
}

/**
 * A mesma leitura, para quem está na gravação.
 *
 * Desenha com o mesmo `PrompterCanvas` da transmissão, no viewport real da
 * saída, e só encolhe com `scale()` — pelo mesmo motivo da prévia do operador:
 * réplica por construção, e não por calibragem.
 */
export function Webview(): React.JSX.Element {
  const [quadro, setQuadro] = useState<WebviewFrame | null>(null)
  const [ligado, setLigado] = useState(false)
  const [tela, setTela] = useState({ width: window.innerWidth, height: window.innerHeight })
  /**
   * O som do vídeo, nesta página.
   *
   * Nasce desligado e não é escolha de gosto: navegador de celular recusa
   * começar a tocar com som sem um toque da pessoa. Sem este botão o vídeo
   * chega mudo e não há o que fazer na tela para mudar isso.
   */
  const [som, setSom] = useState(false)
  /**
   * Diferença entre o relógio de quem transmite e o deste aparelho.
   *
   * O celular de quem assiste pode estar minutos adiantado; o relógio de
   * rolagem é uma hora absoluta, então sem esse acerto a leitura apareceria em
   * outro ponto do roteiro.
   */
  const desvio = useRef(0)

  useEffect(() => {
    const fonte = new EventSource('/estado')

    fonte.onmessage = (evento) => {
      const recebido = JSON.parse(evento.data) as WebviewFrame
      desvio.current = recebido.now - Date.now()
      setQuadro(recebido)
      setLigado(true)
    }
    fonte.onerror = () => setLigado(false)

    const aoRedimensionar = (): void =>
      setTela({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', aoRedimensionar)

    return () => {
      fonte.close()
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [])

  // antes do primeiro quadro não há idioma vindo do app ainda, então a
  // página cai no idioma do próprio aparelho de quem abriu — depois disso
  // vale o que o operador escolheu
  const idioma = quadro?.language ?? idiomaDoSistema(navigator.language)

  if (!quadro) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7e858d',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 15
        }}
      >
        {traduzir(idioma, 'web.waiting')}
      </div>
    )
  }

  /*
   * Modo de diagnóstico: `#video` no fim do endereço.
   *
   * Mostra só o vídeo do cartão no ar, num tocador comum, sem o palco do
   * prompter, sem o `scale()` que encaixa a saída na tela, sem o quadro que
   * chega de dois em dois segundos e sem React redesenhando nada.
   *
   * Existe para separar as culpas quando alguém relata engasgo: o mesmo
   * arquivo, na mesma rede, no mesmo aparelho. Se aqui está liso e na página
   * normal trava, o problema é meu. Se trava nos dois, é o arquivo, o wi-fi ou
   * a tela — e nenhum deles se conserta mexendo no app.
   */
  const modo = bandeiras()
  const medindo = modo.has('diag')

  // o relógio da rolagem é absoluto; corrigido, o texto sobe aqui no mesmo
  // instante em que sobe na tela do apresentador. O do vídeo é da mesma
  // natureza e precisa do mesmo acerto — sem ele o vídeo tocaria neste
  // aparelho no ponto errado, tanto quanto o relógio dele estiver adiantado
  const transport = {
    ...quadro.transport,
    startedAt: quadro.transport.startedAt - desvio.current,
    video: { ...quadro.transport.video, comecouEm: quadro.transport.video.comecouEm - desvio.current }
  }

  if (modo.has('video')) {
    const video = quadro.card?.kind === 'video' ? quadro.card : null
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        {medindo ? <Medidor /> : null}
        {video ? (
          <video
            data-web-video-cru
            src={`/video/${encodeURIComponent(video.id)}`}
            controls
            autoPlay
            playsInline
            loop={video.loop ?? false}
            style={{ width: '100%', maxHeight: '100%' }}
          />
        ) : (
          <p style={{ color: '#7e858d', fontFamily: 'system-ui, sans-serif', fontSize: 15, padding: 24 }}>
            {traduzir(idioma, 'web.rawVideoEmpty')}
          </p>
        )}
      </div>
    )
  }

  /*
   * Vídeo no ar: fora do palco, direto na tela.
   *
   * Medido no aparelho de quem relatou o engasgo: dentro do palco, 2 quadros
   * por segundo e 38 perdidos, com o arquivo inteiro já baixado (58s de
   * buffer) e a página sem travar (pior pausa de 43ms). Ou seja: nem rede, nem
   * processador — o vídeo estava sendo composto no caminho lento por causa das
   * transformações em volta. No modo `#video`, sem nada disso, o mesmo arquivo
   * toca liso no mesmo aparelho.
   *
   * Aqui não se perde nada ao sair do palco: esta página nunca espelha nem
   * gira, o cartão cobre o texto de qualquer forma, e um vídeo encaixado por
   * `object-fit` no mesmo retângulo dá exatamente a mesma imagem. O relógio
   * compartilhado continua mandando, então play, pausa e arrasto do operador
   * seguem valendo aqui.
   */
  if (quadro.card?.kind === 'video') {
    const video = quadro.card
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
        {medindo ? <Medidor /> : null}
        <VideoCartao
          card={video}
          clock={transport.video}
          src={`/video/${encodeURIComponent(video.id)}?v=${encodeURIComponent(video.convertido ?? 'orig')}`}
          comSom={som}
          previaDoOperador={false}
        />
        {!som ? <BotaoDeSom onLigar={() => setSom(true)} rotulo={traduzir(idioma, 'web.enableSound')} /> : null}
        {!ligado ? <AvisoDeQueda texto={traduzir(idioma, 'web.offline')} /> : null}
      </div>
    )
  }

  const viewport = quadro.viewport ?? PADRAO
  // esta página é de conferência: quem acompanha pelo celular lê direto da
  // tela, sem o vidro do teleprompter no caminho, então nada de girar nem
  // espelhar aqui — e a caixa a encaixar é o palco em pé, não o monitor
  const desenho = canvasBox(quadro.appearance.rotation, viewport, false)
  const escala = Math.min(tela.width / desenho.width, tela.height / desenho.height)


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {medindo ? <Medidor /> : null}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${escala})`,
          transformOrigin: 'center'
        }}
      >
        <PrompterCanvas
          blocks={quadro.blocks}
          appearance={quadro.appearance}
          transport={transport}
          viewport={viewport}
          rows={quadro.rows}
          card={quadro.card}
          cardBaseUrl="/cartao/"
          videoBaseUrl="/video/"
          cardAudio={som}
          // quem assiste vê o que o apresentador vê, marca inclusive
          readingMark={quadro.appearance.readingMarkOnOutput}
        />
      </div>

      {!ligado ? <AvisoDeQueda texto={traduzir(idioma, 'web.offline')} /> : null}
    </div>
  )
}
