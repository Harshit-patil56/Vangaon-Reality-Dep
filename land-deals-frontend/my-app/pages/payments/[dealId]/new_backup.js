import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../../../lib/auth'
import { paymentsAPI, dealAPI } from '../../../lib/api'
import { hasPermission, PERMISSIONS } from '../../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../../components/layout/Navbar'
import Link from 'next/link'

export default function NewPayment() {
  const [user, setUser] = useState(null)
  const [deal, setDeal] = useState(null)
  const [partyOptions, setPartyOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0], // Default to today
    due_date: '',
    description: '',
    payment_type: 'land_purchase',
    status: 'pending',
    paid_by_select: '',
    paid_by_other: '',
    paid_to_select: '',
    paid_to_other: '',
    payment_mode: '',
    reference: '',
    notes: '',
    category: ''
  })
  
  const router = useRouter()
  const { dealId } = router.query

  // Payment type definitions - complete list matching backend and UI requirements
  const paymentTypes = [
    { 
      value: 'land_purchase', 
      label: 'Land Purchase', 
      description: 'Direct land acquisition payments'
    },
    { 
      value: 'investment_sale', 
      label: 'Investment Sale', 
      description: 'Investment returns or property sales'
    },
    { 
      value: 'documentation_legal', 
      label: 'Documentation/Legal', 
      description: 'Legal fees, documentation costs'
    },
    { 
      value: 'maintenance_taxes', 
      label: 'Maintenance/Taxes', 
      description: 'Property maintenance, tax payments'
    },
    { 
      value: 'other', 
      label: 'Other', 
      description: 'Miscellaneous payments'
    },
    { 
      value: 'advance', 
      label: 'Advance', 
      description: 'Advance payments'
    },
    { 
      value: 'partial', 
      label: 'Partial', 
      description: 'Partial payments'
    },
    { 
      value: 'final', 
      label: 'Final', 
      description: 'Final payments'
    },
    { 
      value: 'registration', 
      label: 'Registration', 
      description: 'Registration and registration-related payments'
    }
  ]

  // Payment mode options - simplified without icons
  const paymentModes = [
    { value: 'UPI', label: 'UPI' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'IMPS', label: 'IMPS' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Other', label: 'Other' }
  ]

  const loadDeal = useCallback(async () => {
    if (!dealId) return
    
    try {
      const response = await dealAPI.getById(dealId)
      const data = response.data || {}

      // normalize deal shape (support wrapped and flat responses)
      let mergedDeal = {}
      if (data.deal) {
        mergedDeal = { ...data.deal }
        mergedDeal.owners = data.owners || data.deal.owners || []
        mergedDeal.buyers = data.buyers || data.deal.buyers || []
        mergedDeal.investors = data.investors || data.deal.investors || []
        mergedDeal.documents = data.documents || data.deal.documents || []
      } else {
        mergedDeal = { ...data }
        mergedDeal.owners = mergedDeal.owners || []
        mergedDeal.buyers = mergedDeal.buyers || []
        mergedDeal.investors = mergedDeal.investors || []
        mergedDeal.documents = mergedDeal.documents || []
      }

      setDeal(mergedDeal)
      
      // Build party options from deal data
      const partyGroups = {
        owners: [],
        investors: [],
        buyers: []
      }

      // owners
      if (Array.isArray(mergedDeal.owners)) {
        mergedDeal.owners.forEach(o => {
          const name = o.name || o.owner_name || o.owner || 'Owner'
          partyGroups.owners.push({ 
            value: name, 
            label: name,
            type: 'Owner',
            phone: o.phone || o.contact_number,
            email: o.email
          })
        })
      }

      // investors
      if (Array.isArray(mergedDeal.investors)) {
        mergedDeal.investors.forEach(inv => {
          const name = inv.investor_name || inv.name || 'Investor'
          partyGroups.investors.push({ 
            value: name, 
            label: name,
            type: 'Investor',
            phone: inv.phone || inv.contact_number,
            email: inv.email
          })
        })
      }

      // buyers
      if (Array.isArray(mergedDeal.buyers)) {
        mergedDeal.buyers.forEach(b => {
          const name = b.name || b.buyer_name || 'Buyer'
          partyGroups.buyers.push({ 
            value: name, 
            label: name,
            type: 'Buyer',
            phone: b.phone || b.contact_number,
            email: b.email
          })
        })
      }

      // Build structured options with groups
      const structuredOptions = []
      
      if (partyGroups.owners.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Owners' })
        partyGroups.owners.forEach(owner => structuredOptions.push(owner))
      }
      
      if (partyGroups.investors.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Investors' })
        partyGroups.investors.forEach(investor => structuredOptions.push(investor))
      }
      
      if (partyGroups.buyers.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Buyers' })
        partyGroups.buyers.forEach(buyer => structuredOptions.push(buyer))
      }

      // Add "Other" option
      structuredOptions.push({ value: '__other__', label: 'Other (specify below)', type: 'Other' })
      
      setPartyOptions(structuredOptions)
    } catch (error) {
      console.error('Failed to load deal:', error)
      toast.error('Failed to load deal information')
    }
  }, [dealId])

  const loadUser = useCallback(async () => {
    try {
      const userData = await getUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    loadUser()
    loadDeal()
  }, [loadUser, loadDeal])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateField = (name, value) => {
    let error = ''
    
    switch (name) {
      case 'amount':
        if (!value || parseFloat(value) <= 0) {
          error = 'Amount must be greater than 0'
        }
        break
      case 'description':
        if (!value.trim()) {
          error = 'Description is required'
        }
        break
      case 'paid_by_select':
        if (!value) {
          error = 'Please select who paid'
        }
        break
      case 'paid_by_other':
        if (formData.paid_by_select === '__other__' && !value.trim()) {
          error = 'Please enter the payer name'
        }
        break
    }
    
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const validateForm = () => {
    const requiredFields = {
      amount: formData.amount,
      description: formData.description,
      paid_by_select: formData.paid_by_select
    }

    const newErrors = {}
    Object.entries(requiredFields).forEach(([field, value]) => {
      if (!value) {
        newErrors[field] = `${field.replace('_', ' ')} is required`
      }
    })

    // Custom validations
    if (formData.amount && parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (formData.paid_by_select === '__other__' && !formData.paid_by_other) {
      newErrors.paid_by_other = 'Please enter the payer name'
    }

    if (formData.payment_date && new Date(formData.payment_date) > new Date()) {
      newErrors.payment_date = 'Payment date cannot be in the future'
    }

    if (formData.due_date && formData.payment_date && new Date(formData.due_date) < new Date(formData.payment_date)) {
      newErrors.due_date = 'Due date cannot be before payment date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please correct the errors below')
      return
    }

    const payload = {
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      due_date: formData.due_date,
      description: formData.description.trim(),
      payment_type: formData.payment_type,
      status: formData.status,
      paid_by: formData.paid_by_select === '__other__' ? formData.paid_by_other.trim() : formData.paid_by_select,
      paid_to: formData.paid_to_select === '__other__' ? formData.paid_to_other.trim() : formData.paid_to_select || '',
      payment_mode: formData.payment_mode,
      reference: formData.reference.trim(),
      notes: formData.notes.trim(),
      category: formData.category.trim()
    }

    try {
      setLoading(true)
      const resp = await paymentsAPI.create(dealId, payload)
      const newPaymentId = resp?.data?.payment_id
      toast.success('Payment created successfully!')

      // Enhanced receipt upload with better error handling
      if (receiptFile && newPaymentId) {
        await handleReceiptUpload(newPaymentId)
      }

      // Navigate to the new payment detail
      router.push(newPaymentId ? `/payments/${dealId}/${newPaymentId}` : `/payments`)
    } catch (error) {
      console.error('Failed to create payment:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create payment'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptUpload = async (paymentId) => {
    if (!receiptFile) return

    // Enhanced file validation
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

    if (receiptFile.size > MAX_SIZE) {
      toast.error('Receipt file too large (max 5MB). Payment created without receipt.')
      return
    }

    if (!ALLOWED_TYPES.includes(receiptFile.type)) {
      toast.error('Invalid file type. Only PDF, JPG, and PNG files are allowed.')
      return
    }

    try {
      setUploadingReceipt(true)
      const fd = new FormData()
      fd.append('proof', receiptFile)
      if (formData.payment_mode) {
        fd.append('doc_type', formData.payment_mode)
      }
      
      const uploadResp = await paymentsAPI.uploadProof(dealId, paymentId, fd)
      if (uploadResp && (uploadResp.status === 201 || uploadResp.status === 200)) {
        toast.success('Receipt uploaded successfully!')
      } else {
        toast.error('Receipt upload completed with warnings')
      }
    } catch (uploadErr) {
      console.error('Failed to upload receipt:', uploadErr)
      toast.error('Failed to upload receipt. Payment created successfully.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
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
                  <Link href={`/payments`} className="hover:text-slate-900">
                    {deal?.deal_name || `Deal #${dealId}`}
                  </Link>
                  <span>→</span>
                  <span className="text-slate-900">New Payment</span>
                </nav>
                <h1 className="text-3xl font-bold text-slate-900">
                  Create New Payment
                </h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span className="font-medium text-slate-700">{user?.name || 'User'}</span>
                  <span>•</span>
                  <span className="capitalize">{user?.role}</span>
                  <span>•</span>
                  {deal && (
                    <span>{deal.deal_name || deal.property_details || `Deal #${deal.id}`} • {deal.city || 'Unknown Location'}</span>
                  )}
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
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Single Form - All sections combined */}
            <div className="bg-white rounded border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Payment Information</h2>
              
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Basic Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.amount ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter payment amount"
                    />
                    {errors.amount && (
                      <div className="mt-1 text-xs text-red-500">{errors.amount}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      {paymentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                      errors.description ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Brief description of the payment"
                  />
                  {errors.description && (
                    <div className="mt-1 text-xs text-red-500">{errors.description}</div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Dates & Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.payment_date ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.payment_date && (
                      <div className="mt-1 text-xs text-red-500">{errors.payment_date}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Due Date (optional)
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.due_date ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.due_date && (
                      <div className="mt-1 text-xs text-red-500">{errors.due_date}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Mode
                    </label>
                    <select
                      name="payment_mode"
                      value={formData.payment_mode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="">Select payment mode</option>
                      {paymentModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="Transaction reference"
                    />
                  </div>
                </div>
              </div>

              {/* Parties Section */}
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Payment Parties</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Paid By <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paid_by_select"
                      value={formData.paid_by_select}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.paid_by_select ? 'border-red-500' : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select who paid</option>
                      {partyOptions.map((option, index) => (
                        option.type === 'group' ? (
                          <optgroup key={index} label={option.label}>
                          </optgroup>
                        ) : (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        )
                      ))}
                      <option value="__other__">Other (specify below)</option>
                    </select>
                    {errors.paid_by_select && (
                      <div className="mt-1 text-xs text-red-500">{errors.paid_by_select}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Paid To
                    </label>
                    <select
                      name="paid_to_select"
                      value={formData.paid_to_select}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="">Select who received</option>
                      {partyOptions.map((option, index) => (
                        option.type === 'group' ? (
                          <optgroup key={index} label={option.label}>
                          </optgroup>
                        ) : (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        )
                      ))}
                      <option value="__other__">Other (specify below)</option>
                    </select>
                  </div>
                </div>

                {/* Custom name inputs for "Other" selections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.paid_by_select === '__other__' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="paid_by_other"
                        value={formData.paid_by_other}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData(prev => ({ ...prev, paid_by_other: value }))
                          validateField('paid_by_other', value)
                        }}
                        className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                          errors.paid_by_other ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Enter the name of the payer"
                      />
                      {errors.paid_by_other && (
                        <div className="mt-1 text-xs text-red-500">{errors.paid_by_other}</div>
                      )}
                    </div>
                  )}

                  {formData.paid_to_select === '__other__' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Receiver Name
                      </label>
                      <input
                        type="text"
                        name="paid_to_other"
                        value={formData.paid_to_other}
                        onChange={(e) => setFormData(prev => ({ ...prev, paid_to_other: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                        placeholder="Enter the name of the receiver"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="Payment category"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="Additional notes about this payment"
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Receipt Upload (Optional)</h3>
                
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                  <div className="text-center">
                    <div className="mt-4">
                      <label htmlFor="receipt-upload" className="cursor-pointer">
                        <span className="block text-sm font-medium text-slate-900">
                          Upload receipt or payment proof
                        </span>
                        <span className="block text-sm text-slate-500 mt-1">
                          PNG, JPG, PDF up to 5MB
                        </span>
                      </label>
                      <input
                        id="receipt-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => document.getElementById('receipt-upload').click()}
                        className="inline-flex items-center px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                      >
                        Choose File
                      </button>
                    </div>
                  </div>
                </div>

                {receiptFile && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{receiptFile.name}</p>
                        <p className="text-xs text-slate-600">
                          {(receiptFile.size / 1024).toFixed(1)} KB • {receiptFile.type}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptFile(null)}
                        className="ml-3 text-slate-600 hover:text-slate-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {uploadingReceipt && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                      <span className="ml-3 text-sm text-amber-800">Uploading receipt...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-200">
                <Link
                  href={`/payments`}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || uploadingReceipt}
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Payment...
                    </>
                  ) : (
                    'Create Payment'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
