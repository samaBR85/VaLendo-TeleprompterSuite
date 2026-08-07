import { CabecalhoDePainel } from './console'

/**
 * Cabeçalho de painel com a moldura do console: filete colorido no topo,
 * gradiente tingido, título na cor da seção. A cor é a assinatura — âmbar é
 * Edição, vermelho é Saída — e o `ponto` é o olhinho de estado da Saída.
 */
export function PanelHeader({
  label,
  detail,
  cor,
  ponto,
  action
}: {
  label: string
  detail?: React.ReactNode
  cor?: string
  ponto?: boolean
  action?: React.ReactNode
}): React.JSX.Element {
  return <CabecalhoDePainel cor={cor} ponto={ponto} titulo={label} detalhe={detail} acao={action} />
}
