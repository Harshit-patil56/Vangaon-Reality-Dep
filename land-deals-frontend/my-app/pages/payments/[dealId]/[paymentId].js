import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { getUser, logout } from '../../../lib/auth'
import { paymentsAPI, dealAPI, ownersAPI, investorsAPI } from '../../../lib/api'
import { hasPermission, PERMISSIONS } from '../../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../../components/layout/Navbar'
import Link from 'next/link'

// InstallmentTimeline Component
function InstallmentTimeline({ dealId, paymentId, currentInstallment, totalInstallments, parentAmount }) {
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInstallments = async () => {
      try {
        const response = await fetch(`/api/payments/${dealId}/${paymentId}/installments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setInstallments(data.installments || [])
        }
      } catch (error) {
        console.error('Failed to fetch installments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInstallments()
  }, [dealId, paymentId])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-slate-600">Loading installment timeline...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {installments.map((installment, index) => {
          const isCurrent = installment.installment_number === currentInstallment
          const isPaid = installment.status === 'completed'
          const isPending = installment.status === 'pending'
          const isOverdue = installment.status === 'overdue'
          
          return (
            <div 
              key={installment.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isCurrent 
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500 shadow-md' 
                  : isPaid 
                    ? 'bg-green-50 border-green-300 hover:shadow-md' 
                    : isOverdue
                      ? 'bg-red-50 border-red-300'
                      : 'bg-slate-50 border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-medium ${
                  isCurrent ? 'text-blue-900' : isPaid ? 'text-green-900' : isOverdue ? 'text-red-900' : 'text-slate-700'
                }`}>
                  Installment {installment.installment_number}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  isPaid ? 'bg-green-100 text-green-800' 
                  : isOverdue ? 'bg-red-100 text-red-800'
                  : isCurrent ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-600'
                }`}>
                  {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isCurrent ? 'Current' : 'Pending'}
                </div>
              </div>
              
              <div className={`text-lg font-bold mb-2 ${
                isCurrent ? 'text-blue-900' : isPaid ? 'text-green-900' : isOverdue ? 'text-red-900' : 'text-slate-900'
              }`}>
                {formatCurrency(installment.amount)}
              </div>
              
              <div className="text-sm text-slate-600 space-y-1">
                <div>Payment: {formatDate(installment.payment_date)}</div>
                {installment.due_date && (
                  <div>Due: {formatDate(installment.due_date)}</div>
                )}
                {installment.payment_mode && (
                  <div>Mode: {installment.payment_mode}</div>
                )}
              </div>
              
              {isCurrent && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <Link 
                    href={`/payments/${dealId}/${installment.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {installments.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-sm">No installment data available</div>
          <div className="text-xs mt-1">
            Showing fallback preview for {totalInstallments} installments
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentDetail() {
  const [user, setUser] = useState(null)
  const [deal, setDeal] = useState(null)
  const [payment, setPayment] = useState(null)
  const [proofs, setProofs] = useState([])
  const [owners, setOwners] = useState([])
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  
  const router = useRouter()
  const { dealId, paymentId } = router.query

  const loadOwnersAndInvestors = useCallback(async () => {
    try {
      const [ownersResponse, investorsResponse] = await Promise.all([
        ownersAPI.getAll(),
        investorsAPI.getAll()
      ])
      setOwners(ownersResponse.data || [])
      setInvestors(investorsResponse.data || [])
    } catch (error) {
      console.error('Failed to load owners and investors:', error)
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
      
      if (type === 'investor' && investors) {
        const investor = investors.find(inv => inv.id === numericId);
        return investor ? investor.investor_name : value;
      }
      
      if (type === 'owner' && owners) {
        const owner = owners.find(own => own.id === numericId);
        return owner ? owner.name : value;
      }
    }
    
    return value;
  }, [investors, owners])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [dealResponse, paymentResponse, proofsResponse] = await Promise.all([
        dealAPI.getById(dealId),
        paymentsAPI.detail(dealId, paymentId),
        paymentsAPI.listProofs(dealId, paymentId).catch(() => ({ data: [] }))
      ])
      
      // Also load owners and investors
      loadOwnersAndInvestors()
      
      // Handle deal data structure (same normalization as NewPayment)
      const dealData = dealResponse.data || {}
      let mergedDeal = {}
      if (dealData.deal) {
        mergedDeal = { ...dealData.deal }
        mergedDeal.owners = dealData.owners || dealData.deal.owners || []
        mergedDeal.buyers = dealData.buyers || dealData.deal.buyers || []
        mergedDeal.investors = dealData.investors || dealData.deal.investors || []
        mergedDeal.documents = dealData.documents || dealData.deal.documents || []
      } else {
        mergedDeal = { ...dealData }
        mergedDeal.owners = dealData.owners || mergedDeal.owners || []
        mergedDeal.buyers = dealData.buyers || mergedDeal.buyers || []
        mergedDeal.investors = dealData.investors || mergedDeal.investors || []
        mergedDeal.documents = dealData.documents || mergedDeal.documents || []
      }
      
      setDeal(mergedDeal)
      setPayment(paymentResponse.data)
      setProofs(proofsResponse.data || [])
    } catch (error) {
      console.error('Failed to load payment data:', error)
      toast.error('Failed to load payment details')
      router.push('/payments')
    } finally {
      setLoading(false)
    }
  }, [dealId, paymentId, router, loadOwnersAndInvestors])

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    if (!hasPermission(currentUser, PERMISSIONS.PAYMENTS_VIEW)) {
      toast.error('Access denied: insufficient permissions')
      router.push('/payments')
      return
    }

    setUser(currentUser)
    
    if (dealId && paymentId) {
      loadData()
    }
  }, [router, dealId, paymentId, loadData])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }
    
    if (!hasPermission(user, PERMISSIONS.DOCUMENTS_UPLOAD)) {
      toast.error('You do not have permission to upload documents')
      return
    }

    try {
      setUploadingProof(true)
      const formData = new FormData()
      formData.append('proof', selectedFile) // Changed from 'file' to 'proof' to match NewPayment
      
      await paymentsAPI.uploadProof(dealId, paymentId, formData)
      toast.success('Proof uploaded successfully')
      setSelectedFile(null)
      
      // Reload proofs
      const proofsResponse = await paymentsAPI.listProofs(dealId, paymentId)
      setProofs(proofsResponse.data || [])
    } catch (error) {
      console.error('Failed to upload proof:', error)
      toast.error('Failed to upload proof')
    } finally {
      setUploadingProof(false)
    }
  }

  const handleDeleteProof = async (proofId) => {
    if (!hasPermission(user, PERMISSIONS.DOCUMENTS_DELETE)) {
      toast.error('You do not have permission to delete documents')
      return
    }

    if (!confirm('Are you sure you want to delete this proof?')) {
      return
    }

    try {
      await paymentsAPI.deleteProof(dealId, paymentId, proofId)
      toast.success('Proof deleted successfully')
      
      // Reload proofs
      const proofsResponse = await paymentsAPI.listProofs(dealId, paymentId)
      setProofs(proofsResponse.data || [])
    } catch (error) {
      console.error('Failed to delete proof:', error)
      toast.error('Failed to delete proof')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'overdue': 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const typeColors = {
      'land_purchase': 'bg-blue-100 text-blue-800',
      'investment_sale': 'bg-orange-100 text-orange-800',
      'documentation_legal': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800',
      // Legacy support
      'advance': 'bg-blue-100 text-blue-800',
      'partial': 'bg-orange-100 text-orange-800',
      'final': 'bg-purple-100 text-purple-800',
      'registration': 'bg-green-100 text-green-800'
    }
    
    // Normalize display text
    const typeLabels = {
      'land_purchase': 'Land Purchase',
      'investment_sale': 'Investment/Sale',
      'documentation_legal': 'Documentation & Legal',
      'other': 'Other',
      // Legacy labels
      'advance': 'Advance',
      'partial': 'Partial',
      'final': 'Final',
      'registration': 'Registration'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {typeLabels[type] || type || 'Other'}
      </span>
    )
  }

  // Helper function to clean party names (remove role prefixes if they exist)
  const cleanPartyName = (name) => {
    if (!name) return 'Not specified'
    // Remove role prefixes that might have been added
    return name
      .replace(/^Owner\s*-\s*/i, '')
      .replace(/^Investor\s*-\s*/i, '')
      .replace(/^Buyer\s*-\s*/i, '')
      .replace(/^Owner:\s*/i, '')
      .replace(/^Investor:\s*/i, '')
      .replace(/^Buyer:\s*/i, '')
      .trim()
  }

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₹0'
    return `₹${Number(amount).toLocaleString('en-IN')}`
  }

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-2 text-slate-600">Loading payment details...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-slate-600 mb-2">
            <Link href="/payments" className="hover:text-slate-900">
              Payments
            </Link>
            <span>→</span>
            <Link href={`/payments/${dealId}`} className="hover:text-slate-900">
              Deal #{dealId}
            </Link>
            <span>→</span>
            <span className="text-slate-900">Payment #{paymentId}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Payment Details</h1>
              {deal && (
                <p className="mt-2 text-slate-600">
                  Deal: {deal.property_details || deal.title || `Deal #${deal.id}`}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push(`/deals/${dealId}?section=payments`)}
              className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Deal Details
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Payment Information</h2>
            
            {payment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type & Status</label>
                  <div className="space-x-2">
                    {getTypeBadge(payment.payment_type)}
                    {getStatusBadge(payment.status)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                  <div className="text-slate-900">
                    {formatDate(payment.payment_date)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <div className="text-slate-900">
                    {formatDate(payment.due_date)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paid By</label>
                  <div className="text-slate-900">
                    {payment && getPaymentDisplayName(payment, 'paid_by')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paid To</label>
                  <div className="text-slate-900">
                    {payment && getPaymentDisplayName(payment, 'paid_to')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <div className="text-slate-900">
                    {payment.payment_mode || 'Not specified'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                  <div className="text-slate-900 break-all">
                    {payment.reference || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <div className="text-slate-900">
                    {payment.category || 'Not specified'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Created Date</label>
                  <div className="text-slate-900">
                    {formatDate(payment.created_at)}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <div className="text-slate-900 whitespace-pre-wrap">
                    {payment.description || 'No description provided'}
                  </div>
                </div>

                {payment.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <div className="text-slate-900 whitespace-pre-wrap bg-slate-50 p-3 rounded-md">
                      {payment.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasPermission(user, PERMISSIONS.PAYMENTS_EDIT) && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <Link 
                  href={`/payments/${dealId}/${paymentId}/edit`} 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Payment
                </Link>
              </div>
            )}
          </div>

          {/* Installment Information */}
          {payment && payment.is_installment && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Installment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-700 mb-1">Current Installment</label>
                  <div className="text-2xl font-bold text-blue-900">
                    {payment.installment_number} of {payment.total_installments}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-green-700 mb-1">Total Amount</label>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(payment.parent_amount)}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-purple-700 mb-1">Installment Amount</label>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-amber-700 mb-1">Progress</label>
                  <div className="text-2xl font-bold text-amber-900">
                    {Math.round((payment.installment_number / payment.total_installments) * 100)}%
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full" 
                      style={{ width: `${(payment.installment_number / payment.total_installments) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Installment Timeline</h3>
                <InstallmentTimeline 
                  dealId={dealId} 
                  paymentId={paymentId} 
                  currentInstallment={payment.installment_number}
                  totalInstallments={payment.total_installments}
                  parentAmount={payment.parent_amount}
                />
              </div>
            </div>
          )}

          {/* Payment Proofs */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Payment Proofs</h2>
            
            {/* Upload Form */}
            {hasPermission(user, PERMISSIONS.DOCUMENTS_UPLOAD) && (
              <form onSubmit={handleFileUpload} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Upload Proof:</span>
                  <input
                    type="file"
                    id="payment-proof-upload"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label
                    htmlFor="payment-proof-upload"
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Choose File
                  </label>
                  <span className="text-sm text-slate-600 flex-1">
                    {selectedFile ? selectedFile.name : 'No file chosen (PDF, JPG, PNG, DOC)'}
                  </span>
                  <button
                    type="submit"
                    disabled={uploadingProof || !selectedFile}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingProof ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            )}

            {/* Proofs List */}
            {proofs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proofs.map((proof) => (
                  <div key={proof.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-w-16 aspect-h-9 mb-3">
                      {proof.file_name && proof.file_name.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-32 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      ) : proof.file_name && (proof.file_name.toLowerCase().includes('.doc') || proof.file_name.toLowerCase().includes('.docx')) ? (
                        <div className="w-full h-32 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      ) : (
                        <Image
                          src={proof.file_url}
                          alt={proof.file_name}
                          width={200}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      )}
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-900 mb-1 truncate" title={proof.file_name}>
                      {proof.file_name}
                    </div>
                    <div className="text-xs text-slate-500 mb-3">
                      Uploaded: {formatDate(proof.uploaded_at)}
                    </div>
                    <div className="flex justify-between">
                      <a
                        href={proof.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </a>
                      {hasPermission(user, PERMISSIONS.DOCUMENTS_DELETE) && (
                        <button
                          onClick={() => handleDeleteProof(proof.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No proofs uploaded</h3>
                <p className="text-slate-600">Upload payment proofs to keep track of transaction evidence.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
