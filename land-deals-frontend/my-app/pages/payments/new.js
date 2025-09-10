import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getUser } from '../../lib/auth'
import { dealAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import Link from 'next/link'

export default function PaymentDealSelection() {
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState('')
  const router = useRouter()

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    if (!hasPermission(currentUser, PERMISSIONS.PAYMENTS_CREATE)) {
      toast.error('Access denied: insufficient permissions')
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    loadDeals()
  }, [router])

  const loadDeals = async () => {
    try {
      setLoading(true)
      const response = await dealAPI.getAll()
      setDeals(response.data || [])
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!selectedDeal) {
      toast.error('Please select a deal first')
      return
    }
    router.push(`/payments/${selectedDeal}/new`)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
                  <Link href="/payments" className="hover:text-slate-900">Payments</Link>
                  <span>→</span>
                  <span className="text-slate-900">Select Deal</span>
                </nav>
                <h1 className="text-3xl font-bold text-slate-900">
                  Add New Payment
                </h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span className="font-medium text-slate-700">{user?.name || 'User'}</span>
                  <span>•</span>
                  <span className="capitalize">{user?.role}</span>
                  <span>•</span>
                  <span>First, select the deal you want to add a payment for</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/payments">
                <span className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                  Back to Payments
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded border border-slate-200 p-6">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded border border-slate-200 mb-6">
                  <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Loading deals...</h3>
                <p className="text-slate-600">Please wait while we fetch available deals</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Deal Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Deal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDeal}
                    onChange={(e) => setSelectedDeal(e.target.value)}
                    className="w-full border-slate-300 rounded shadow-sm focus:border-slate-500 focus:ring-slate-500"
                    required
                  >
                    <option value="">Choose a deal...</option>
                    {deals.map(deal => (
                      <option key={deal.id} value={deal.id}>
                        {deal.project_name || deal.property_details || `Deal #${deal.id}`} - {deal.city || deal.village || deal.district}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Details Preview */}
                {selectedDeal && (
                  <div className="bg-slate-50 rounded border border-slate-200 p-4">
                    <h3 className="text-sm font-medium text-slate-900 mb-2">Selected Deal Details:</h3>
                    {(() => {
                      const deal = deals.find(d => d.id === parseInt(selectedDeal))
                      if (!deal) return null
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Project:</span>
                            <span className="ml-2 font-medium text-slate-900">{deal.project_name || deal.property_details || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Location:</span>
                            <span className="ml-2 font-medium text-slate-900">{deal.city || deal.village || deal.district || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Type:</span>
                            <span className="ml-2 font-medium text-slate-900">{deal.deal_type || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              deal.status === 'open' 
                                ? 'bg-slate-100 text-slate-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {deal.status === 'open' ? 'Active' : 'Closed'}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Link href="/payments">
                    <span className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer">
                      Cancel
                    </span>
                  </Link>
                  <button
                    onClick={handleContinue}
                    disabled={!selectedDeal}
                    className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded transition-colors"
                  >
                    Continue to Payment Form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
