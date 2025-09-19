// pages/index.js - Root page with authentication-based routing
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAuthenticated } from '../lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check authentication status and redirect accordingly
    if (isAuthenticated()) {
      // User is logged in, redirect to dashboard
      router.replace('/dashboard')
    } else {
      // User is not logged in, redirect to login
      router.replace('/login')
    }
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  )
}