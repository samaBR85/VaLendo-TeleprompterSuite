import { createRoot } from 'react-dom/client'
import '../styles.css'
import { App } from './App'

// a escala da interface não precisa de bootstrap aqui: o main já a passou no
// construtor da janela (`webPreferences.zoomFactor`), então a primeira pintura
// já sai no tamanho certo — sem o quadro em 100% que um efeito deixaria passar

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
