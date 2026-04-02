import { StrictMode } from 'react'
import '../index.css'
import App from '../App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

export default function RsvAppRoot() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
