import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import AppErrorBoundary from './components/debug/AppErrorBoundary.jsx'
import { registerGlobalErrorHandlers } from './utils/logger'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key (VITE_CLERK_PUBLISHABLE_KEY)')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ClerkProvider>
  </React.StrictMode>,
)

registerGlobalErrorHandlers()
