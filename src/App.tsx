import { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { router } from '@/router'
import ThemeProvider from '@/providers/ThemeProvider'
import { useMonedaStore } from '@/store'
import { auth } from '@/lib/firebase'
import { seedFirestoreIfEmpty } from '@/lib/seedFirestore'
import Login from '@/pages/Login'

const ALLOWED_EMAILS = ['jeancarlo2722@gmail.com', 'jazminsalaso05@gmail.com']

function AppInit() {
  const [authUser, setAuthUser]   = useState<User | null | undefined>(undefined)
  const fetchTipoCambio = useMonedaStore((s) => s.fetchTipoCambio)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (authUser) {
      fetchTipoCambio()
      seedFirestoreIfEmpty().catch(console.error)
    }
  }, [authUser, fetchTipoCambio])

  // Still loading auth state
  if (authUser === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not signed in, or signed in with a non-allowed email
  if (!authUser || !ALLOWED_EMAILS.includes(authUser.email ?? '')) {
    return <Login />
  }

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInit />
    </ThemeProvider>
  )
}
