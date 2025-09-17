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
  const [tableLoading, setTableLoading] = useState(false)
  const [filterYear, setFilterYear] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // 'all', 'open', 'closed', 'commission'
  
  // Statistics state (fetched separately for performance)
  const [totalDeals, setTotalDeals] = useState(0)
  const [availableYears, setAvailableYears] = useState([])
  
  // Pagination state - backend controlled
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Modal states
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const fetchDeals = useCallback(async (page = 1, isInitialLoad = false) => {
    console.log('fetchDeals called with page:', page, 'isInitialLoad:', isInitialLoad)
    try {
      // Only show full loading on initial load, use tableLoading for pagination
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setTableLoading(true)
      }
      
      // Build query parameters for backend pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      })
      
      // Add filter parameters if they exist
      if (filterYear) {
        params.append('year', filterYear)
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      console.log('Fetching with params:', params.toString())
      
      // For initial load, also fetch statistics
      if (isInitialLoad) {
        // Fetch statistics separately (lightweight query)
        const statsResponse = await dealAPI.getStats()
        if (statsResponse.data) {
          const stats = statsResponse.data
          setTotalDeals(stats.total || 0)
          setAvailableYears(stats.years || [])
        }
      }
      
      // Fetch paginated deals
      const response = await dealAPI.getPaginated(params.toString())
      
      if (response.data) {
        const { deals: paginatedDeals, pagination } = response.data
        
        console.log('Received deals:', paginatedDeals.length, 'pagination:', pagination)
        
        // Update deals state with current page data
        setDeals(paginatedDeals || [])
        setTotalPages(pagination?.totalPages || 1)
        setTotalCount(pagination?.totalCount || 0)
        setCurrentPage(pagination?.currentPage || page)
      }
      
    } catch (error) {
      console.error('Error in fetchDeals:', error)
      if (error?.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch deals')
      }
      setDeals([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
      setTableLoading(false)
    }
  }, [router, itemsPerPage, filterYear, statusFilter])

  useEffect(() => {
    // Add a small delay to ensure page is fully mounted before checking auth
    const timer = setTimeout(() => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      setUser(getUser())
      fetchDeals(1, true) // Pass page 1 and isInitialLoad flag
    }, 100)

    return () => clearTimeout(timer)
  }, [router, fetchDeals])

  // Handle page changes - fetch data when currentPage changes
  useEffect(() => {
    if (user && currentPage !== 1) {
      // For pages other than 1, fetch data when page changes
      fetchDeals(currentPage, false)
    }
  }, [currentPage, user, fetchDeals])

  // Reset to page 1 when filters change and fetch filtered data
  useEffect(() => {
    if (user) {
      console.log('Filter changed - Year:', filterYear, 'Status:', statusFilter)
      if (currentPage === 1) {
        // If already on page 1, fetch data with new filters
        fetchDeals(1, false)
      } else {
        // If not on page 1, setting page to 1 will trigger the above useEffect
        setCurrentPage(1)
      }
    }
  }, [filterYear, statusFilter, user, currentPage, fetchDeals])

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
      // Refresh current page data and statistics
      fetchDeals(currentPage, currentPage === 1)
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
      // Refresh current page data and statistics
      fetchDeals(currentPage, currentPage === 1)
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

  const resetFilters = () => {
    console.log('Resetting all filters')
    setFilterYear('')
    setStatusFilter('')
    setCurrentPage(1) // Reset to first page when clearing filters
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
                  onChange={(e) => {
                    const selectedYear = e.target.value
                    setFilterYear(selectedYear)
                    // When year is selected, clear status filter to show all deals in that year
                    if (selectedYear && statusFilter) {
                      setStatusFilter('')
                      console.log('Year filter applied, clearing status filter to show all deals in', selectedYear)
                    }
                  }}
                  className="text-sm border border-slate-300 rounded px-3 py-1 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                {/* Status Filter - only show if no year is selected or allow secondary filtering */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-slate-300 rounded px-3 py-1 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">All Status</option>
                  <option value="open">Active</option>
                  <option value="closed">Closed</option>
                  <option value="commission">Commission</option>
                </select>
                
                {(filterYear || statusFilter) && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-50"
                  >
                    Clear All
                  </button>
                )}
              </div>              {(user?.role === 'admin' || user?.role === 'auditor') && (
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
      <div className="w-full px-6 py-8">

        {/* Main Content Layout */}
        <div className="w-full">
          
          {/* Main Content - Recent Deals (Full width) */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                        {(filterYear || statusFilter) ? 'Filtered Deals' : 'Property Deals'}
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {(filterYear || statusFilter) ? `Found: ${totalCount}` : `Total: ${totalDeals}`}
                        </span>
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        {(filterYear || statusFilter) && totalCount !== totalDeals && (
                          <span className="text-slate-500">
                            {totalCount} of {totalDeals} deals match your filters • 
                          </span>
                        )}
                        Showing {totalCount === 0 ? '0' : `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalCount)}`} of {totalCount} deal{totalCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {(filterYear || statusFilter) && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Filtered by:</span>
                        {filterYear && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            Year: {filterYear}
                          </span>
                        )}
                        {statusFilter && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                            Status: {statusFilter === 'open' ? 'Active' : statusFilter === 'commission' ? 'Commission' : 'Closed'}
                          </span>
                        )}
                        {filterYear && !statusFilter && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            All deals in {filterYear}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {totalCount === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-slate-300 rounded"></div>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-3">
                      {totalDeals === 0 ? 'No deals available' : 'No deals match your filters'}
                    </h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      {totalDeals === 0 
                        ? 'Get started by creating your first property deal to begin tracking your transactions and managing your portfolio.'
                        : 'Try adjusting your filter criteria to see more deals.'
                      }
                    </p>
                    {totalDeals === 0 && (user?.role === 'admin' || user?.role === 'auditor') && (
                      <Link href="/deals/new">
                        <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 cursor-pointer ">
                          Create Your First Deal
                        </span>
                      </Link>
                    )}
                    {totalCount === 0 && totalDeals > 0 && (
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
                        {tableLoading ? (
                          // Loading state for table - single row with centered spinner
                          <tr className="h-[365px]">
                            <td className="px-6 py-4" colSpan="8">
                              <div className="flex items-center justify-center">
                                <div className="text-center">
                                  <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
                                  <p className="text-sm text-slate-600">Loading deals...</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <>
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

                        {/* Fill empty rows to maintain consistent table height */}
                        {!tableLoading && Array.from({ length: itemsPerPage - deals.length }, (_, index) => (
                          <tr key={`empty-${index}`} className="h-[73px]">
                            <td className="px-6 py-4 w-48">&nbsp;</td>
                            <td className="px-6 py-4 w-32">&nbsp;</td>
                            <td className="px-6 py-4 w-40">&nbsp;</td>
                            <td className="px-6 py-4 w-32">&nbsp;</td>
                            <td className="px-6 py-4 w-24">&nbsp;</td>
                            <td className="px-6 py-4 w-32">&nbsp;</td>
                            <td className="px-6 py-4 w-24">&nbsp;</td>
                            <td className="px-6 py-4 w-24">&nbsp;</td>
                          </tr>
                        ))}
                        </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-4 mt-4">
                    {/* Pagination Buttons - Centered */}
                    <div className="flex items-center justify-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => {
                          if (tableLoading || currentPage === 1) return
                          const newPage = currentPage - 1
                          console.log('Going to previous page:', newPage)
                          setCurrentPage(newPage)
                        }}
                        disabled={currentPage === 1 || tableLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => {
                              if (tableLoading || pageNum === currentPage) return
                              console.log('Going to page:', pageNum)
                              setCurrentPage(pageNum)
                            }}
                            disabled={tableLoading}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 min-w-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => {
                          if (tableLoading || currentPage === totalPages) return
                          const newPage = currentPage + 1
                          console.log('Going to next page:', newPage)
                          setCurrentPage(newPage)
                        }}
                        disabled={currentPage === totalPages || tableLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
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