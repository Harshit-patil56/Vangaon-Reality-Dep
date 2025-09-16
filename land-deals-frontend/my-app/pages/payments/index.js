import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../../lib/auth'
import { paymentsAPI, dealAPI, ownersAPI, investorsAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import Link from 'next/link'
import { GeneralDeleteModal } from '../../components/common/ConfirmModal'

export default function PaymentsIndex() {
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [selectedDeal, setSelectedDeal] = useState('')
  const [payments, setPayments] = useState([])
  const [owners, setOwners] = useState([])
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')
  const [viewMode, setViewMode] = useState('all') // 'all' or 'deal'
  const router = useRouter()
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)

  // Payment summary statistics
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    totalAmount: 0,
    pendingAmount: 0,
    completedAmount: 0
  })

  const loadDeals = useCallback(async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data || [])
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast.error('Failed to load deals')
    }
  }, [])

  const loadOwnersAndInvestors = useCallback(async () => {
    try {
      const [ownersResponse, investorsResponse] = await Promise.all([
        ownersAPI.getAll(),
        investorsAPI.getAll()
      ])
      setOwners(Array.isArray(ownersResponse.data) ? ownersResponse.data : [])
      setInvestors(Array.isArray(investorsResponse.data) ? investorsResponse.data : [])
    } catch (error) {
      console.error('Failed to load owners and investors:', error)
      // Ensure we always have arrays even on error
      setOwners([])
      setInvestors([])
      // Don't show error toast as this is supplementary data
    }
  }, [])

  // Function to get display name from payment data
  const getPaymentDisplayName = useCallback((payment, field) => {
    // Check if we have the new name fields first
    if (field === 'paid_by' && payment.paid_by_name) {
      return payment.paid_by_name;
    }
    if (field === 'paid_to' && payment.paid_to_name) {
      return payment.paid_to_name;
    }
    
    // Fallback to original field but clean up ID format
    const value = payment[field];
    if (!value) return 'N/A';
    
    // If it's in ID format (e.g., "investor_123"), extract the name from data
    if (value.includes('_')) {
      const [type, id] = value.split('_');
      const numericId = parseInt(id);
      
      if (type === 'investor' && Array.isArray(investors)) {
        const investor = investors.find(inv => inv.id === numericId);
        return investor ? investor.investor_name : value;
      }
      
      if (type === 'owner' && Array.isArray(owners)) {
        const owner = owners.find(own => own.id === numericId);
        return owner ? owner.name : value;
      }
    }
    
    return value;
  }, [investors, owners])

  const calculatePaymentStats = useCallback((paymentsData) => {
    const stats = paymentsData.reduce((acc, payment) => {
      const amount = parseFloat(payment.amount) || 0
      acc.total += 1
      acc.totalAmount += amount

      // Check if payment is overdue
      const isOverdue = payment.status === 'pending' && 
        payment.due_date && 
        new Date(payment.due_date) < new Date()

      if (isOverdue) {
        acc.overdue += 1
      } else if (payment.status === 'pending') {
        acc.pending += 1
        acc.pendingAmount += amount
      } else if (payment.status === 'completed') {
        acc.completed += 1
        acc.completedAmount += amount
      }

      return acc
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    })

    setPaymentStats(stats)
  }, [])

  const loadAllPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await paymentsAPI.listAll()
      const paymentsData = response.data?.payments || []
      
      setAllPayments(paymentsData)
      calculatePaymentStats(paymentsData)
      
    } catch (error) {
      console.error('Failed to load all payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [calculatePaymentStats])

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    if (!hasPermission(currentUser, PERMISSIONS.PAYMENTS_VIEW)) {
      toast.error('Access denied: insufficient permissions')
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    loadDeals()
    loadOwnersAndInvestors()
    if (viewMode === 'all') {
      loadAllPayments()
    }
  }, [router, viewMode, loadDeals, loadAllPayments, loadOwnersAndInvestors])

  const loadPayments = async (dealId) => {
    if (!dealId) {
      setPayments([])
      return
    }

    try {
      setLoading(true)
      const response = await paymentsAPI.list(dealId)
      const dealPayments = response.data || []
      setPayments(dealPayments)
      calculatePaymentStats(dealPayments)
    } catch (error) {
      console.error('Failed to load payments:', error)
      toast.error('Failed to load payments')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    if (mode === 'all') {
      setSelectedDeal('')
      loadAllPayments()
    } else {
      setPayments([])
      setPaymentStats({
        total: 0, pending: 0, completed: 0, overdue: 0,
        totalAmount: 0, pendingAmount: 0, completedAmount: 0
      })
    }
  }

  const handleDealChange = (dealId) => {
    setSelectedDeal(dealId)
    loadPayments(dealId)
  }

  const handleDeleteClick = (payment) => {
    if (!hasPermission(user, PERMISSIONS.PAYMENTS_DELETE)) {
      toast.error('You do not have permission to delete payments')
      return
    }
    setPaymentToDelete(payment)
    setShowDeleteModal(true)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return
    
    const targetDealId = paymentToDelete.deal_id || selectedDeal
    if (!targetDealId) return

    try {
      await paymentsAPI.delete(targetDealId, paymentToDelete.id)
      toast.success('Payment deleted successfully')
      
      // Refresh data based on current view mode
      if (viewMode === 'all') {
        loadAllPayments()
      } else {
        loadPayments(selectedDeal)
      }
    } catch (error) {
      console.error('Failed to delete payment:', error)
      toast.error('Failed to delete payment')
    } finally {
      setShowDeleteModal(false)
      setPaymentToDelete(null)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Enhanced filtering and sorting logic
  const getFilteredAndSortedPayments = () => {
    const sourcePayments = viewMode === 'all' ? allPayments : payments
    
    let filtered = sourcePayments.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paid_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paid_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.dealName?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Enhanced status filtering with overdue detection
      let matchesStatus = filterStatus === 'all'
      if (filterStatus === 'overdue') {
        const isOverdue = payment.status === 'pending' && 
          payment.due_date && 
          new Date(payment.due_date) < new Date()
        matchesStatus = isOverdue
      } else {
        matchesStatus = filterStatus === 'all' || payment.status === filterStatus
      }
      
      const matchesType = filterType === 'all' || payment.payment_type === filterType
      
      // Date filtering
      let matchesDate = dateFilter === 'all'
      if (dateFilter !== 'all' && payment.payment_date) {
        const paymentDate = new Date(payment.payment_date)
        const now = new Date()
        
        switch (dateFilter) {
          case 'today':
            matchesDate = paymentDate.toDateString() === now.toDateString()
            break
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = paymentDate >= weekAgo
            break
          case 'this_month':
            matchesDate = paymentDate.getMonth() === now.getMonth() && 
                         paymentDate.getFullYear() === now.getFullYear()
            break
          case 'this_year':
            matchesDate = paymentDate.getFullYear() === now.getFullYear()
            break
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate
    })

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount_asc':
          return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0)
        case 'amount_desc':
          return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0)
        case 'date_asc':
          return new Date(a.payment_date || 0) - new Date(b.payment_date || 0)
        case 'date_desc':
          return new Date(b.payment_date || 0) - new Date(a.payment_date || 0)
        case 'status':
          return (a.status || '').localeCompare(b.status || '')
        case 'deal':
          return (a.dealName || '').localeCompare(b.dealName || '')
        default:
          return new Date(b.payment_date || 0) - new Date(a.payment_date || 0)
      }
    })

    return filtered
  }

  const filteredPayments = getFilteredAndSortedPayments()

  // Enhanced status badge with overdue detection
  const getStatusBadge = (payment) => {
    let status = payment.status || 'pending'
    let colorClass = 'bg-gray-100 text-gray-800'
    
    // Check if payment is overdue
    if (status === 'pending' && payment.due_date && new Date(payment.due_date) < new Date()) {
      status = 'overdue'
      colorClass = 'bg-red-100 text-red-800'
    } else {
      const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'failed': 'bg-red-100 text-red-800'
      }
      colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {status === 'overdue' && (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const typeColors = {
      'land_purchase': 'bg-blue-100 text-blue-800',
      'investment_sale': 'bg-purple-100 text-purple-800',
      'documentation_legal': 'bg-green-100 text-green-800',
      'maintenance_taxes': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800',
      // Legacy support
      'advance': 'bg-blue-100 text-blue-800',
      'partial': 'bg-orange-100 text-orange-800',
      'final': 'bg-purple-100 text-purple-800',
      'registration': 'bg-green-100 text-green-800'
    }
    
    const displayNames = {
      'land_purchase': 'Land Purchase',
      'investment_sale': 'Investment Sale',
      'documentation_legal': 'Documentation/Legal',
      'maintenance_taxes': 'Maintenance/Taxes',
      'other': 'Other'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {displayNames[type] || type || 'Other'}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
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
                <h1 className="text-3xl font-bold text-slate-900">
                  Payment Management Dashboard
                </h1>
              </div>
            </div>
            <div className="flex space-x-3">
              {hasPermission(user, PERMISSIONS.PAYMENTS_CREATE) && (
                <button
                  onClick={() => {
                    if (viewMode === 'all') {
                      router.push('/payments/new')
                    } else if (selectedDeal) {
                      router.push(`/payments/${selectedDeal}/new`)
                    }
                  }}
                  disabled={viewMode === 'deal' && !selectedDeal}
                  className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 cursor-pointer"
                >
                  + Add Payment
                </button>
              )}
              <Link href="/dashboard">
                <span className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                  Back to Dashboard
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="bg-white rounded border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-slate-700">View Mode:</label>
                <div className="flex bg-slate-100 rounded p-1">
                  <button
                    onClick={() => handleViewModeChange('deal')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      viewMode === 'deal' 
                        ? 'bg-white text-slate-900 border border-slate-200' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single Deal
                  </button>
                  <button
                    onClick={() => handleViewModeChange('all')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      viewMode === 'all' 
                        ? 'bg-white text-slate-900 border border-slate-200' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Deals
                  </button>
                </div>
              </div>
              
              {viewMode === 'deal' && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Deal:</label>
                  <select
                    value={selectedDeal || ''}
                    onChange={(e) => handleDealChange(e.target.value)}
                    className="border-slate-300 rounded shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
                  >
                    <option value="">Select a deal</option>
                    {deals.map(deal => (
                      <option key={deal.id} value={deal.id}>
                        {deal.project_name || deal.property_details || `Deal #${deal.id}`} - {deal.city || deal.village || deal.district}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Amount</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(paymentStats.totalAmount)}</p>
                <p className="text-xs text-slate-500 mt-1">All transactions</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{paymentStats.completed}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(paymentStats.completedAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{paymentStats.pending}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(paymentStats.pendingAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overdue</p>
                <p className="text-3xl font-bold text-slate-700 mt-2">{paymentStats.overdue}</p>
                <p className="text-xs text-slate-500 mt-1">Needs attention</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <div className="bg-white rounded border border-slate-200 mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by description, party, or deal..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-slate-300 rounded focus:border-slate-500 focus:ring-slate-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border-slate-300 rounded focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full border-slate-300 rounded focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="all">All Types</option>
                  <option value="land_purchase">Land Purchase</option>
                  <option value="investment_sale">Investment Sale</option>
                  <option value="documentation_legal">Documentation/Legal</option>
                  <option value="maintenance_taxes">Maintenance/Taxes</option>
                  <option value="other">Other</option>
                  {/* Legacy support */}
                  <option value="advance">Advance</option>
                  <option value="partial">Partial</option>
                  <option value="final">Final</option>
                  <option value="registration">Registration</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full border-slate-300 rounded focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>
            </div>

            {/* Sort and Results Info */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border-slate-300 rounded text-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="amount_desc">Amount (High to Low)</option>
                  <option value="amount_asc">Amount (Low to High)</option>
                  <option value="status">Status</option>
                  {viewMode === 'all' && <option value="deal">Deal Name</option>}
                </select>
              </div>
              
              <div className="text-sm text-slate-600">
                Showing {filteredPayments.length} of {viewMode === 'all' ? allPayments.length : payments.length} payments
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Payments Table */}
        {(viewMode === 'all' || selectedDeal) ? (
          <div className="bg-white rounded border border-slate-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded border border-slate-200 mb-6">
                  <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Loading payments...</h3>
                <p className="text-slate-600">Please wait while we fetch your payment data</p>
              </div>
            ) : filteredPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      {viewMode === 'all' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Deal
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Type / Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {payment.description || 'No description'}
                              {payment.is_installment && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                  </svg>
                                  {payment.installment_number}/{payment.total_installments}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500">
                              From: {getPaymentDisplayName(payment, 'paid_by')} → To: {getPaymentDisplayName(payment, 'paid_to')}
                            </div>
                            {payment.is_installment && payment.parent_amount && (
                              <div className="text-xs text-blue-600 mt-1">
                                Total Plan: {formatCurrency(payment.parent_amount)} • Installment {payment.installment_number} of {payment.total_installments}
                              </div>
                            )}
                          </div>
                        </td>
                        {viewMode === 'all' && (
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {payment.dealName || payment.deal_name || `Deal #${payment.deal_id}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              {payment.dealLocation || payment.deal_location || 'Unknown location'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {formatCurrency(payment.amount)}
                            {payment.is_installment && (
                              <div className="flex items-center mt-1">
                                <div className="w-full bg-blue-100 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ width: `${(payment.installment_number / payment.total_installments) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-xs text-blue-600 font-medium whitespace-nowrap">
                                  {Math.round((payment.installment_number / payment.total_installments) * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getTypeBadge(payment.payment_type)}
                            {getStatusBadge(payment)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                          </div>
                          {payment.due_date && (
                            <div className="text-xs text-slate-500">
                              Due: {new Date(payment.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/payments/${payment.deal_id || selectedDeal}/${payment.id}`)}
                              className="text-slate-700 hover:text-slate-900 text-sm font-medium"
                            >
                              View
                            </button>
                            {hasPermission(user, PERMISSIONS.PAYMENTS_EDIT) && (
                              <button
                                onClick={() => router.push(`/payments/${payment.deal_id || selectedDeal}/${payment.id}/edit`)}
                                className="text-slate-700 hover:text-slate-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                            )}
                            {hasPermission(user, PERMISSIONS.PAYMENTS_DELETE) && (
                              <button
                                onClick={() => handleDeleteClick(payment)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-3">No payments found</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  {viewMode === 'all' 
                    ? 'No payments match your current filters.' 
                    : 'No payments found for the selected deal and filters.'
                  }
                </p>
                {hasPermission(user, PERMISSIONS.PAYMENTS_CREATE) && (
                  <button
                    onClick={() => {
                      if (viewMode === 'all') {
                        router.push('/payments/new')
                      } else if (selectedDeal) {
                        router.push(`/payments/${selectedDeal}/new`)
                      }
                    }}
                    className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Create Your First Payment
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded border border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0H3m0 0h4M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-900 mb-3">Select a deal to view payments</h3>
            <p className="text-slate-600">Choose a deal from the dropdown above to manage its payments.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <GeneralDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message={`Are you sure you want to delete this payment of ₹${paymentToDelete?.amount?.toLocaleString('en-IN')}? This action cannot be undone.`}
        itemType="payment"
      />
    </div>
  )
}
