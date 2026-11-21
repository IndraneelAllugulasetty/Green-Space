
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GISPage from './GISPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GISPage />
  </StrictMode>,
)
