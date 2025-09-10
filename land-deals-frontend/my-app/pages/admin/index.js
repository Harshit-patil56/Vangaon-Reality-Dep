import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getUser, isAuthenticated, logout } from '../../lib/auth'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import Link from 'next/link'

export default function AdminIndex() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentUser = getUser()
    if (!hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS)) {
      toast.error('Access denied. Admin privileges required.')
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
  }, [router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage system users, roles, and permissions',
      href: '/admin/users',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      permission: PERMISSIONS.USERS_VIEW
    },
    {
      title: 'System Maintenance',
      description: 'Database cleanup and system maintenance tools',
      href: '/admin/maintenance',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-orange-500',
      permission: PERMISSIONS.SYSTEM_ADMIN
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate system reports and view analytics',
      href: '/reports',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-green-500',
      permission: PERMISSIONS.REPORTS_GENERATE
    },
    {
      title: 'Payments Management',
      description: 'Oversee all payments across deals',
      href: '/payments',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'bg-purple-500',
      permission: PERMISSIONS.PAYMENTS_VIEW
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Administration Panel</h1>
          <p className="mt-2 text-slate-600">Manage users, system maintenance, and administrative functions</p>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminModules.map((module, index) => (
            hasPermission(user, module.permission) && (
              <Link key={index} href={module.href} className="group block">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${module.color} text-white p-3 rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                      {module.icon}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {module.description}
                      </p>
                    </div>
                    <div className="ml-2">
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            )
          ))}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Admin</div>
              <div className="text-sm text-slate-600">Current Role</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{user?.username || 'N/A'}</div>
              <div className="text-sm text-slate-600">Logged in as</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {adminModules.filter(module => hasPermission(user, module.permission)).length}
              </div>
              <div className="text-sm text-slate-600">Available Modules</div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-slate-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-700">User Role:</span>
              <span className="ml-2 text-slate-600">{user?.role || 'Unknown'}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Access Level:</span>
              <span className="ml-2 text-slate-600">Administrator</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Last Login:</span>
              <span className="ml-2 text-slate-600">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Full Name:</span>
              <span className="ml-2 text-slate-600">{user?.full_name || 'Not set'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
