import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../../lib/auth'
import { cleanupAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import Link from 'next/link'

export default function AdminMaintenance() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cleanupResults, setCleanupResults] = useState(null)
  
  const router = useRouter()

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    if (!hasPermission(currentUser, PERMISSIONS.SYSTEM_ADMIN)) {
      toast.error('Access denied: system administrator privileges required')
      router.push('/admin')
      return
    }

    setUser(currentUser)
  }, [router])

  const cleanupOrphanedOwners = async () => {
    if (!confirm('This will delete all owners whose associated deals have been removed. This action cannot be undone. Continue?')) {
      return
    }

    try {
      setLoading(true)
      const response = await cleanupAPI.orphanedOwners()
      setCleanupResults(response.data)
      toast.success(`Successfully cleaned up ${response.data.deleted_count} orphaned owners`)
    } catch (error) {
      console.error('Failed to cleanup orphaned owners:', error)
      toast.error(error.response?.data?.error || 'Failed to cleanup orphaned owners')
    } finally {
      setLoading(false)
    }
  }

  const cleanupAllOrphanedData = async () => {
    if (!confirm('This will delete ALL orphaned data (owners, buyers, investors, expenses) whose associated deals have been removed. This action cannot be undone. Continue?')) {
      return
    }

    try {
      setLoading(true)
      const response = await cleanupAPI.allOrphaned()
      setCleanupResults(response.data)
      toast.success(`Successfully cleaned up ${response.data.total_deleted} orphaned records`)
    } catch (error) {
      console.error('Failed to cleanup all orphaned data:', error)
      toast.error(error.response?.data?.error || 'Failed to cleanup orphaned data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-slate-600 mb-2">
            <Link href="/admin" className="hover:text-slate-900">
              Admin
            </Link>
            <span>→</span>
            <span className="text-slate-900">System Maintenance</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">System Maintenance</h1>
          <p className="mt-2 text-slate-600">Database cleanup and maintenance tools</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Caution Required</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>These operations permanently delete data from the database. Always ensure you have a backup before proceeding. These actions cannot be undone.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cleanup Tools */}
        <div className="space-y-6">
          {/* Orphaned Owners Cleanup */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Clean Up Orphaned Owners</h2>
                <p className="text-slate-600 mb-4">
                  Remove owners whose associated deals have been deleted. This helps maintain database consistency by removing references to non-existent deals.
                </p>
                <div className="text-sm text-slate-500">
                  <strong>What this does:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Finds owners linked to deleted deals</li>
                    <li>Removes owner documents first</li>
                    <li>Deletes the orphaned owner records</li>
                  </ul>
                </div>
              </div>
              <div className="ml-6">
                <button
                  onClick={cleanupOrphanedOwners}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clean Owners
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* All Orphaned Data Cleanup */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Clean Up All Orphaned Data</h2>
                <p className="text-slate-600 mb-4">
                  Comprehensive cleanup that removes all data (owners, buyers, investors, expenses) linked to deleted deals. This is a more thorough cleanup operation.
                </p>
                <div className="text-sm text-slate-500">
                  <strong>What this does:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Removes orphaned owners and their documents</li>
                    <li>Removes orphaned buyers</li>
                    <li>Removes orphaned investors</li>
                    <li>Removes orphaned expenses</li>
                    <li>Provides detailed cleanup summary</li>
                  </ul>
                </div>
              </div>
              <div className="ml-6">
                <button
                  onClick={cleanupAllOrphanedData}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clean All Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cleanup Results */}
        {cleanupResults && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Cleanup Results</h2>
            
            {cleanupResults.cleanup_results ? (
              /* Comprehensive cleanup results */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {Object.entries(cleanupResults.cleanup_results).map(([category, data]) => (
                    <div key={category} className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-700 mb-1 capitalize">
                        {category}
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {data.count}
                      </div>
                      <div className="text-xs text-slate-500">records deleted</div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Cleanup Completed Successfully
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>{cleanupResults.message}</p>
                        <p className="mt-1"><strong>Total deleted:</strong> {cleanupResults.total_deleted} records</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed breakdown */}
                <div className="space-y-3">
                  {Object.entries(cleanupResults.cleanup_results).map(([category, data]) => (
                    data.count > 0 && (
                      <div key={category} className="border border-slate-200 rounded-lg p-4">
                        <h4 className="font-medium text-slate-900 mb-2 capitalize">{category} ({data.count} deleted)</h4>
                        {data.names && data.names.length > 0 && (
                          <div className="text-sm text-slate-600">
                            <strong>Deleted items:</strong> {data.names.join(', ')}
                          </div>
                        )}
                        {data.types && data.types.length > 0 && (
                          <div className="text-sm text-slate-600">
                            <strong>Types:</strong> {data.types.join(', ')}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            ) : (
              /* Simple cleanup results */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Cleanup Completed Successfully
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>{cleanupResults.message}</p>
                        <p className="mt-1"><strong>Records deleted:</strong> {cleanupResults.deleted_count}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {cleanupResults.deleted_owners && cleanupResults.deleted_owners.length > 0 && (
                  <div className="border border-slate-200 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-2">Deleted Owners</h4>
                    <div className="space-y-1">
                      {cleanupResults.deleted_owners.map((owner, index) => (
                        <div key={index} className="text-sm text-slate-600">
                          <strong>{owner.name}</strong> (ID: {owner.id}, Deal: {owner.deal_id})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Panel
          </Link>
        </div>
      </div>
    </div>
  )
}
