// pages/deals/all.js - Display all deals
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout, isAuthenticated } from '../../lib/auth'
import { dealAPI } from '../../lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import { DeleteConfirmModal, CloseConfirmModal } from '../../components/common/ConfirmModal'

export default function AllDeals() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const fetchDeals = useCallback(async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data)
    } catch (error) {
      if (error?.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch deals')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    setUser(getUser())
    fetchDeals()
  }, [fetchDeals, router])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  // Modal handlers
  const handleCloseClick = (deal) => {
    setSelectedDeal(deal)
    setShowCloseModal(true)
  }

  const handleDeleteClick = (deal) => {
    setSelectedDeal(deal)
    setShowDeleteModal(true)
  }

  const handleCloseDeal = async () => {
    if (!selectedDeal) return
    
    try {
      const response = await dealAPI.updateStatus(selectedDeal.id, 'closed')
      console.log('Close deal response:', response)
      toast.success('Deal closed successfully')
      // Update the deal status in the local state
      setDeals(deals.map(d => 
        d.id === selectedDeal.id ? { ...d, status: 'closed' } : d
      ))
    } catch (error) {
      console.error('Error closing deal:', error)
      console.error('Error details:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to close deal')
    } finally {
      setShowCloseModal(false)
      setSelectedDeal(null)
    }
  }

  const handleDeleteDeal = async () => {
    if (!selectedDeal) return
    
    try {
      await dealAPI.delete(selectedDeal.id)
      toast.success('Deal deleted successfully')
      setDeals(deals.filter(d => d.id !== selectedDeal.id))
    } catch (error) {
      console.error('Error deleting deal:', error)
      console.error('Error details:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to delete deal')
    } finally {
      setShowDeleteModal(false)
      setSelectedDeal(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading All Deals</h3>
          <p className="text-slate-600">Please wait while we prepare your data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      <div className="w-full px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">All Property Deals</h1>
            <p className="mt-2 text-sm text-slate-600">
              A complete list of all property transactions and agreements.
            </p>
          </div>
          <Link href="/dashboard">
            <span className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer">
              Back to Dashboard
            </span>
          </Link>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  All Property Deals
                  <span className="ml-2 text-sm text-slate-600 font-normal">
                    ({deals.length} deals)
                  </span>
                </h2>
              </div>
            </div>
          </div>

          <div className="p-6">
            {deals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-slate-300 rounded"></div>
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-3">No deals available</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Get started by creating your first property deal to begin tracking your transactions and managing your portfolio.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Survey No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deal ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Close</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {deals.map((deal) => (
                      <tr 
                        key={deal.id} 
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/deals/${deal.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 hover:text-blue-600">
                            {deal.project_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{deal.survey_number || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {[deal.city, deal.village, deal.district].filter(Boolean).join(', ') || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">#{deal.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              deal.status === 'open'
                                ? 'bg-emerald-100 text-emerald-800'
                                : deal.status === 'commission'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {deal.status === 'open' ? 'Active' : deal.status === 'commission' ? 'Commission' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {deal.purchase_date ? new Date(deal.purchase_date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {deal.status === 'open' && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleCloseClick(deal)
                              }}
                              className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 font-medium"
                            >
                              Close
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteClick(deal)
                            }}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Modals */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleCloseDeal}
        dealData={selectedDeal}
      />
      
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDeal}
        dealData={selectedDeal}
      />
    </div>
  )
}
