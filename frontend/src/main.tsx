import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import Dashboard from './pages/Dashboard'
import Weekly from './pages/Weekly'
import Monthly from './pages/Monthly'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import { AuthProvider } from './hooks/useAuth'
import Daily from './pages/Daily'
import MarketDetail from './pages/MarketDetail'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'weekly', element: <Weekly /> },
      { path: 'monthly', element: <Monthly /> },
      { path: 'daily/:date', element: <Daily /> },
      { path: 'markets/:name', element: <MarketDetail /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/auth/callback', element: <AuthCallback /> },
])

const qc = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
