// pages/dashboard.js - Full Width Professional Dashboard with Fixed Icons
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout, isAuthenticated } from '../lib/auth'
import { dealAPI } from '../lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Navbar from '../components/layout/Navbar'
import { DeleteConfirmModal, CloseConfirmModal } from '../components/common/ConfirmModal'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // 'all', 'open', 'closed', 'commission'
  
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
    // Add a small delay to ensure page is fully mounted before checking auth
    const timer = setTimeout(() => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      setUser(getUser())
      fetchDeals()
    }, 50)
    
    return () => clearTimeout(timer)
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
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Dashboard</h3>
          <p className="text-slate-600">Please wait while we prepare your data</p>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalDeals = deals.length
  const activeDeals = deals.filter(deal => deal.status === 'open').length
  const closedDeals = deals.filter(deal => deal.status === 'closed').length
  const commissionDeals = deals.filter(deal => deal.status === 'commission').length

  // Filter functions
  const filteredDeals = deals.filter(deal => {
    const dealYear = deal.purchase_date ? new Date(deal.purchase_date).getFullYear().toString() : 'No Date'
    const matchesYear = !filterYear || dealYear === filterYear
    const matchesStatus = !statusFilter || 
      (statusFilter === 'all') ||
      (statusFilter === 'open' && deal.status === 'open') ||
      (statusFilter === 'closed' && deal.status === 'closed') ||
      (statusFilter === 'commission' && deal.status === 'commission')
    return matchesYear && matchesStatus
  })

  // Get unique years for filter options
  const availableYears = [...new Set(deals.map(deal => 
    deal.purchase_date ? new Date(deal.purchase_date).getFullYear() : 'No Date'
  ).filter(year => year !== 'No Date'))].sort((a, b) => b - a)

  const resetFilters = () => {
    setFilterYear('')
    setStatusFilter('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Property Management Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Filter Section */}
              <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Filter:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="text-sm border border-slate-300 rounded px-3 py-1 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {(filterYear || statusFilter) && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>

              {(user?.role === 'admin' || user?.role === 'auditor') && (
                <Link href="/deals/new">
                  <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer">
                    + Create New Deal
                  </span>
                </Link>
              )}
              <Link href="/deals/all">
                <span className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                  View All Deals
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Deals */}
          <div 
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-300 ${
              statusFilter === 'all' ? 'border-slate-400 shadow-md' : 'border-slate-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'all' ? '' : 'all')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Deals</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{totalDeals}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <span className="text-xs font-semibold text-slate-600">TOTAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Deals */}
          <div 
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-300 ${
              statusFilter === 'open' ? 'border-emerald-400 shadow-md' : 'border-slate-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'open' ? '' : 'open')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Active Deals</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-2">{activeDeals}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg">
                  <span className="text-xs font-semibold text-emerald-600">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Closed Deals */}
          <div 
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-300 ${
              statusFilter === 'closed' ? 'border-slate-400 shadow-md' : 'border-slate-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'closed' ? '' : 'closed')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Closed Deals</p>
                  <p className="text-3xl font-bold text-slate-700 mt-2">{closedDeals}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <span className="text-xs font-semibold text-slate-600">CLOSED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Deals */}
          <div 
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-300 ${
              statusFilter === 'commission' ? 'border-blue-400 shadow-md' : 'border-slate-200'
            }`}
            onClick={() => setStatusFilter(statusFilter === 'commission' ? '' : 'commission')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Commission Deals</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">{commissionDeals}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <span className="text-xs font-semibold text-blue-600">COMM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="w-full">
          
          {/* Main Content - Recent Deals (Full width) */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Property Deals
                      {(filterYear || statusFilter) && (
                        <span className="ml-2 text-sm text-slate-600 font-normal">
                          ({filteredDeals.length} of {totalDeals} deals)
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center mt-1">
                      {(filterYear || statusFilter) && (
                        <div className="ml-4 flex items-center space-x-2">
                          <span className="text-xs text-slate-500">Filtered by:</span>
                          {filterYear && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Year: {filterYear}
                            </span>
                          )}
                          {statusFilter && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              Status: {statusFilter === 'all' ? 'All' : statusFilter === 'open' ? 'Active' : statusFilter === 'commission' ? 'Commission' : 'Closed'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {filteredDeals.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-slate-300 rounded"></div>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-3">
                      {deals.length === 0 ? 'No deals available' : 'No deals match your filters'}
                    </h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      {deals.length === 0 
                        ? 'Get started by creating your first property deal to begin tracking your transactions and managing your portfolio.'
                        : 'Try adjusting your filter criteria to see more deals.'
                      }
                    </p>
                    {deals.length === 0 && (user?.role === 'admin' || user?.role === 'auditor') && (
                      <Link href="/deals/new">
                        <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 cursor-pointer ">
                          Create Your First Deal
                        </span>
                      </Link>
                    )}
                    {deals.length > 0 && (
                      <button
                        onClick={resetFilters}
                        className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer mx-auto"
                      >
                        Clear Filters
                      </button>
                    )}
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
                        {filteredDeals.slice(0, 10).map((deal) => (
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