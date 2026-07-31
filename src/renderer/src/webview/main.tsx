import { createRoot } from 'react-dom/client'
import '../styles.css'
import { Webview } from './Webview'

createRoot(document.getElementById('root') as HTMLElement).render(<Webview />)
