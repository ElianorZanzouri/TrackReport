import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Landing from './components/Landing'
import Layout from './components/Layout'
import Applications from './components/Applications'
import ApplicationDetail from './components/ApplicationDetail'
import Companies from './components/Companies'
import CompanyDetail from './components/CompanyDetail'
import Questions from './components/Questions'
import Profile from './components/Profile'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  if (!session) {
    if (authMode) {
      return <Auth initialMode={authMode} onBack={() => setAuthMode(null)} />
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
          <Route index element={<Applications user={session.user} />} />
          <Route
            path="applications/:id"
            element={<ApplicationDetail user={session.user} />}
          />
          <Route path="companies" element={<Companies user={session.user} />} />
          <Route
            path="companies/:id"
            element={<CompanyDetail user={session.user} />}
          />
          <Route path="questions" element={<Questions user={session.user} />} />
          <Route path="profile" element={<Profile user={session.user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}