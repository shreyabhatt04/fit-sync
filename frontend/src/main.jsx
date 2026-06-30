import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import './styles/global.css'
import App from './App'

// Provider order matters:
// - ErrorBoundary outermost so it catches EVERYTHING including provider errors
// - BrowserRouter before anything using Link/useNavigate
// - AuthProvider before anything reading user state
// - ToastProvider so any component can call useToast()
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
