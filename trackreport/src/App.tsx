import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken, setToken, apiGet } from './api'
import Auth from './components/Auth'
import Landing from './components/Landing'
import Layout from './components/Layout'
import Applications from './components/Applications'
import ApplicationDetail from './components/ApplicationDetail'
import Companies from './components/Companies'
import CompanyDetail from './components/CompanyDetail'
import Questions from './components/Questions'
import Analysis from './components/Analysis'
import Profile from './components/Profile'

type AppUser = { id: string; email: string; full_name?: string | null }

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)

  useEffect(() => {
    async function init() {
      // If a token is present, we verify it's still valid by reading the profile.
      if (getToken()) {
        try {
          const me = await apiGet('/profile')
          setUser(me)
        } catch {
          setToken(null) // token invalid or expired
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  function handleAuthed(u: AppUser) {
    setUser(u)
    setAuthMode(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user) {
    if (authMode) {
      return (
        <Auth
          initialMode={authMode}
          onBack={() => setAuthMode(null)}
          onAuthed={handleAuthed}
        />
      )
    }
    return (
      <Landing
        onCreate={() => setAuthMode('signup')}
        onSignIn={() => setAuthMode('signin')}
      />
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Applications user={user as any} />} />
          <Route
            path="applications/:id"
            element={<ApplicationDetail user={user as any} />}
          />
          <Route path="companies" element={<Companies user={user as any} />} />
          <Route
            path="companies/:id"
            element={<CompanyDetail user={user as any} />}
          />
          <Route path="questions" element={<Questions user={user as any} />} />
          <Route path="analysis" element={<Analysis user={user as any} />} />
          <Route path="profile" element={<Profile user={user as any} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}