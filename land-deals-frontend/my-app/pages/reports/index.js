import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../../lib/auth'
import { paymentsAPI, dealAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'

export default function Reports() {
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [ledgerData, setLedgerData] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    deal_id: '',
    start_date: '',
    end_date: '',
    status: '',
    payment_type: '',
    min_amount: '',
    max_amount: ''
  })
  
  const router = useRouter()

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    if (!hasPermission(currentUser, PERMISSIONS.REPORTS_GENERATE)) {
      toast.error('Access denied: insufficient permissions')
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    loadDeals()
  }, [router])

  const loadDeals = async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data || [])
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast.error('Failed to load deals')
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateLedger = async () => {
    try {
      setLoading(true)
      
      // Filter out empty values
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value
        }
        return acc
      }, {})

      const response = await paymentsAPI.ledger(cleanFilters)
      setLedgerData(response.data || [])
      
      if (response.data && response.data.length === 0) {
        // react-hot-toast does not expose an `info` method; use the generic toast call
        toast('No payments found matching your criteria')
      }
    } catch (error) {
      console.error('Failed to generate ledger:', error)
      toast.error('Failed to generate ledger report')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async () => {
    try {
      // Filter out empty values
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value
        }
        return acc
      }, {})

      const response = await paymentsAPI.ledgerCsv(cleanFilters)
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payments_ledger_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('CSV report downloaded successfully')
    } catch (error) {
      console.error('Failed to export CSV:', error)
      toast.error('Failed to export CSV report')
    }
  }

  const exportPdf = async () => {
    try {
      // Filter out empty values
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value
        }
        return acc
      }, {})

      const response = await paymentsAPI.ledgerPdf(cleanFilters)
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payments_ledger_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF report downloaded successfully')
    } catch (error) {
      console.error('Failed to export PDF:', error)
      toast.error('Failed to export PDF report')
    }
  }

  const clearFilters = () => {
    setFilters({
      deal_id: '',
      start_date: '',
      end_date: '',
      status: '',
      payment_type: '',
      min_amount: '',
      max_amount: ''
    })
    setLedgerData([])
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const calculateTotals = () => {
    if (ledgerData.length === 0) return { total: 0, count: 0 }
    
    const total = ledgerData.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0)
    }, 0)
    
    return { total, count: ledgerData.length }
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payment Reports</h1>
          <p className="mt-2 text-slate-600">Generate and export payment ledger reports</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deal</label>
              <select
                name="deal_id"
                value={filters.deal_id}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Deals</option>
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    Deal #{deal.id} - {deal.property_details || 'Unknown Property'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Type</label>
              <select
                name="payment_type"
                value={filters.payment_type}
                onChange={handleFilterChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="land_purchase">Land Purchase</option>
                <option value="investment_sale">Investment Sale</option>
                <option value="documentation_legal">Documentation/Legal</option>
                <option value="maintenance_taxes">Maintenance/Taxes</option>
                <option value="other">Other</option>
                <option value="advance">Advance</option>
                <option value="partial">Partial</option>
                <option value="final">Final</option>
                <option value="registration">Registration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Amount</label>
              <input
                type="number"
                name="min_amount"
                value={filters.min_amount}
                onChange={handleFilterChange}
                placeholder="0"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Max Amount</label>
              <input
                type="number"
                name="max_amount"
                value={filters.max_amount}
                onChange={handleFilterChange}
                placeholder="No limit"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateLedger}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Generate Report
                </>
              )}
            </button>

            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Clear Filters
            </button>

            {ledgerData.length > 0 && (
              <>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>

                <button
                  onClick={exportPdf}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        {ledgerData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Report Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600 mb-1">Total Payments</div>
                <div className="text-2xl font-bold text-blue-900">{totals.count}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-600 mb-1">Total Amount</div>
                <div className="text-2xl font-bold text-green-900">₹{totals.total.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-600 mb-1">Average Payment</div>
                <div className="text-2xl font-bold text-purple-900">
                  ₹{totals.count > 0 ? Math.round(totals.total / totals.count).toLocaleString() : '0'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        {ledgerData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Payment Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Deal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Parties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ledgerData.map((payment, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          Deal #{payment.deal_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{payment.description || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          ₹{payment.amount ? Number(payment.amount).toLocaleString() : '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {payment.payment_type || 'other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          <div>From: {(payment.paid_by && payment.paid_by.replace(/^Owner:\s*/i, '').replace(/^Investor:\s*/i, '').replace(/^Buyer:\s*/i, '')) || 'N/A'}</div>
                          <div>To: {payment.paid_to || 'N/A'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No report generated</h3>
            <p className="text-slate-600">Configure your filters above and click &ldquo;Generate Report&rdquo; to view payment data.</p>
          </div>
        )}
      </div>
    </div>
  )
}
