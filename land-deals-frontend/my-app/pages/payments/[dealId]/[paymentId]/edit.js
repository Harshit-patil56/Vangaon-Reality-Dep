import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../../../../lib/auth'
import { paymentsAPI, dealAPI, ownersAPI, investorsAPI } from '../../../../lib/api'
import { hasPermission, PERMISSIONS } from '../../../../lib/permissions'
import toast from 'react-hot-toast'
import Navbar from '../../../../components/layout/Navbar'
import Link from 'next/link'

export default function EditPayment() {
  const [user, setUser] = useState(null)
  const [deal, setDeal] = useState(null)
  const [payment, setPayment] = useState(null)
  const [owners, setOwners] = useState([])
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [partyOptions, setPartyOptions] = useState([])
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: '',
    due_date: '',
    description: '',
    // default align with backend enum values
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
  const [errors, setErrors] = useState({})
  
  const router = useRouter()
  const { dealId, paymentId } = router.query

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

  // Payment mode options
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [dealResponse, paymentResponse] = await Promise.all([
        dealAPI.getById(dealId),
        paymentsAPI.detail(dealId, paymentId)
      ])
      
      // Also load owners and investors for name resolution
      loadOwnersAndInvestors()
      
      const dealData = dealResponse.data || {}
      const paymentData = paymentResponse.data || {}

      // normalize deal shape similar to new.js
      let mergedDeal = {}
      if (dealData.deal) {
        mergedDeal = { ...dealData.deal }
        mergedDeal.owners = dealData.owners || dealData.deal.owners || []
        mergedDeal.buyers = dealData.buyers || dealData.deal.buyers || []
        mergedDeal.investors = dealData.investors || dealData.deal.investors || []
        mergedDeal.documents = dealData.documents || dealData.deal.documents || []
      } else {
        mergedDeal = { ...dealData }
        mergedDeal.owners = mergedDeal.owners || []
        mergedDeal.buyers = mergedDeal.buyers || []
        mergedDeal.investors = mergedDeal.investors || []
        mergedDeal.documents = mergedDeal.documents || []
      }

      setDeal(mergedDeal)
      setPayment(paymentData)

      // Build structured party options similar to Add Payment page
      const partyGroups = {
        investors: [],
        buyers: [],
        owners: []
      }

      // Process investors
      if (Array.isArray(mergedDeal.investors)) {
        mergedDeal.investors.forEach(inv => {
          const name = inv.investor_name || inv.name || 'Investor'
          const id = inv.id || inv.investor_id
          partyGroups.investors.push({ 
            value: `investor_${id}`, 
            label: name,
            name: name,
            id: id,
            type: 'investor'
          })
        })
      }

      // Process buyers
      if (Array.isArray(mergedDeal.buyers)) {
        mergedDeal.buyers.forEach(buyer => {
          const name = buyer.name || buyer.buyer_name || 'Buyer'
          const id = buyer.id || buyer.buyer_id
          partyGroups.buyers.push({ 
            value: `buyer_${id}`, 
            label: name,
            name: name,
            id: id,
            type: 'buyer'
          })
        })
      }

      // Process owners
      if (Array.isArray(mergedDeal.owners)) {
        mergedDeal.owners.forEach(owner => {
          const name = owner.name || owner.owner_name || owner.owner || 'Owner'
          const id = owner.id || owner.owner_id
          partyGroups.owners.push({ 
            value: `owner_${id}`, 
            label: name,
            name: name,
            id: id,
            type: 'owner'
          })
        })
      }

      // Build structured options with groups (Investors first, then buyers, then owners)
      const structuredOptions = []
      
      if (partyGroups.investors.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Investors' })
        partyGroups.investors.forEach(investor => structuredOptions.push(investor))
      }
      
      if (partyGroups.buyers.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Buyers' })
        partyGroups.buyers.forEach(buyer => structuredOptions.push(buyer))
      }
      
      if (partyGroups.owners.length > 0) {
        structuredOptions.push({ type: 'group', label: 'Owners' })
        partyGroups.owners.forEach(owner => structuredOptions.push(owner))
      }

      // Add "Other" option
      structuredOptions.push({ value: '__other__', label: 'Other (specify below)', type: 'Other' })
      
      setPartyOptions(structuredOptions)

      // Helper to find party in structured options by name or ID format
      const findPartyInOptions = (searchValue) => {
        if (!searchValue) return null
        
        // First try to find exact value match (for ID format like "investor_123")
        let party = structuredOptions.find(p => p.value === searchValue && p.type !== 'group')
        if (party) return party
        
        // Try to find by name (clean any role prefixes)
        const cleanName = searchValue.replace(/^(Owner|Investor|Buyer):\s*/i, '').trim()
        party = structuredOptions.find(p => p.label === cleanName && p.type !== 'group')
        if (party) return party
        
        // Try partial name matching
        party = structuredOptions.find(p => 
          p.label && p.label.toLowerCase().includes(cleanName.toLowerCase()) && p.type !== 'group'
        )
        
        return party
      }

      // Prepare initial paid_by select/other values
      let initialPaidBySelect = ''
      let initialPaidByOther = ''
      if (paymentData.paid_by) {
        const foundParty = findPartyInOptions(paymentData.paid_by)
        if (foundParty) {
          initialPaidBySelect = foundParty.value
        } else {
          initialPaidBySelect = '__other__'
          initialPaidByOther = paymentData.paid_by
        }
      }

      // Prepare initial paid_to select/other values
      let initialPaidToSelect = ''
      let initialPaidToOther = ''
      if (paymentData.paid_to) {
        const foundPartyTo = findPartyInOptions(paymentData.paid_to)
        if (foundPartyTo) {
          initialPaidToSelect = foundPartyTo.value
        } else {
          initialPaidToSelect = '__other__'
          initialPaidToOther = paymentData.paid_to
        }
      }

      // helper to safely extract date in YYYY-MM-DD format for input[type="date"]
      const formatDateForInput = (dateValue) => {
        if (!dateValue) return ''
        try {
          // If it's already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue
          }
          // If it contains 'T' (ISO datetime), take just the date part
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0]
          }
          // Try to parse and format
          const date = new Date(dateValue)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
          }
          return ''
        } catch (error) {
          console.warn('Date formatting error:', error)
          return ''
        }
      }

      // Keep payment_type as-is since backend now supports legacy types
      const normalizePaymentType = (val) => {
        return val || 'other'  // Default to 'other' if no value
      }

      setFormData({
        amount: paymentData.amount || '',
        payment_date: formatDateForInput(paymentData.payment_date),
        due_date: formatDateForInput(paymentData.due_date),
        description: paymentData.description || '',
        payment_type: normalizePaymentType(paymentData.payment_type),
        status: paymentData.status || 'pending',
        paid_by_select: initialPaidBySelect,
        paid_by_other: initialPaidByOther,
        paid_to_select: initialPaidToSelect,
        paid_to_other: initialPaidToOther,
        payment_mode: paymentData.payment_mode || '',
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        category: paymentData.category || ''
      })
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
    
    if (!hasPermission(currentUser, PERMISSIONS.PAYMENTS_EDIT)) {
      toast.error('Access denied: insufficient permissions')
      router.push('/payments')
      return
    }

    setUser(currentUser)
    
    if (dealId && paymentId) {
      loadData()
    }
  }, [router, dealId, paymentId, loadData])

  // Update form data with resolved names when owners and investors are loaded
  useEffect(() => {
    if (payment && owners.length > 0 && investors.length > 0) {
      setFormData(prev => {
        const newData = { ...prev }
        
        // Update paid_by_other if it contains an ID
        if (prev.paid_by_select === '__other__' && prev.paid_by_other) {
          const resolvedPaidBy = getPaymentDisplayName(payment, 'paid_by')
          if (resolvedPaidBy !== prev.paid_by_other) {
            newData.paid_by_other = resolvedPaidBy
          }
        }
        
        // Update paid_to_other if it contains an ID
        if (prev.paid_to_select === '__other__' && prev.paid_to_other) {
          const resolvedPaidTo = getPaymentDisplayName(payment, 'paid_to')
          if (resolvedPaidTo !== prev.paid_to_other) {
            newData.paid_to_other = resolvedPaidTo
          }
        }
        
        return newData
      })
    }
  }, [payment, owners, investors, getPaymentDisplayName])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
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

    // Prepare data for submission
    // Build paid_by value from select/other
    const paidByValue = formData.paid_by_select === '__other__' ? formData.paid_by_other : formData.paid_by_select
    
    // Build paid_to value from select/other  
    const paidToValue = formData.paid_to_select === '__other__' ? formData.paid_to_other : formData.paid_to_select

    // Prepare minimal payload with only known updatable fields
    const payload = {}

    // amount (required and validated above)
    const amount = parseFloat(formData.amount)
    payload.amount = amount

    // helper to set string fields only when non-empty
    const setIf = (key, val) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') payload[key] = val
    }

    // helper to safely format date for backend
    const formatDateForBackend = (dateValue, originalDate = null) => {
      if (!dateValue) return null
      const dateStr = String(dateValue).trim()
      if (!dateStr) return null
      
      // If the date hasn't changed from the original, use the original format
      if (originalDate && dateStr === originalDate) {
        return originalDate
      }
      
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
      }
      
      // Try to parse and format to YYYY-MM-DD
      try {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]
        }
      } catch (error) {
        console.warn('Date parsing error:', error)
      }
      
      // If all else fails, return the original value (backend will handle/reject)
      return dateStr
    }

    // dates: ensure they are in YYYY-MM-DD format
    // Pass original payment dates to detect if they haven't changed
    const originalPaymentDate = payment?.payment_date ? (payment.payment_date.includes('T') ? payment.payment_date.split('T')[0] : payment.payment_date) : null
    const originalDueDate = payment?.due_date ? (payment.due_date.includes('T') ? payment.due_date.split('T')[0] : payment.due_date) : null
    
    const formattedPaymentDate = formatDateForBackend(formData.payment_date, originalPaymentDate)
    const formattedDueDate = formatDateForBackend(formData.due_date, originalDueDate)
    
    console.log('Date debugging:')
    console.log('Original payment date:', originalPaymentDate)
    console.log('Form payment date:', formData.payment_date)
    console.log('Formatted payment date:', formattedPaymentDate)
    console.log('Original due date:', originalDueDate)
    console.log('Form due date:', formData.due_date)
    console.log('Formatted due date:', formattedDueDate)
    
    // Only include dates in payload if they are valid and have actually changed
    if (formattedPaymentDate && formattedPaymentDate !== originalPaymentDate) {
      payload.payment_date = formattedPaymentDate
      console.log('Payment date changed, including in payload')
    } else if (formattedPaymentDate && formattedPaymentDate === originalPaymentDate) {
      console.log('Payment date unchanged, skipping')
    }
    
    if (formattedDueDate && formattedDueDate !== originalDueDate) {
      payload.due_date = formattedDueDate
      console.log('Due date changed, including in payload')
    } else if (formattedDueDate && formattedDueDate === originalDueDate) {
      console.log('Due date unchanged, skipping')
    }
    
    setIf('description', formData.description)
    // Keep payment_type as-is since backend now supports legacy types
    const normalizePaymentType = (val) => {
      return val || 'other'  // Default to 'other' if no value
    }
    setIf('payment_type', normalizePaymentType(formData.payment_type))
    setIf('status', formData.status)
    
    // Only set paid_by if it has a meaningful value
    if (paidByValue && paidByValue.trim() !== '' && paidByValue !== '__other__') {
      payload.paid_by = paidByValue
    }
    
    // Only set paid_to if it has a meaningful value
    if (paidToValue && paidToValue.trim() !== '' && paidToValue !== '__other__') {
      payload.paid_to = paidToValue
    }
    setIf('reference', formData.reference)
    setIf('notes', formData.notes)
    setIf('payment_mode', formData.payment_mode)
    setIf('category', formData.category)

    const submitData = payload

    // Ensure we always have at least amount and payment_date in the payload
    if (!submitData.payment_date && formattedPaymentDate) {
      submitData.payment_date = formattedPaymentDate
    }
    
    // Ensure we have minimum required fields
    if (!submitData.amount) {
      submitData.amount = amount
    }

    // Check if only amount and description are being updated (no meaningful changes)
    const hasDateChanges = payload.payment_date || payload.due_date
    const hasOtherChanges = payload.paid_by || payload.paid_to || payload.reference || payload.notes || payload.payment_mode || payload.category || 
                           (payload.payment_type && payload.payment_type !== (payment?.payment_type || 'land_purchase')) ||
                           (payload.status && payload.status !== (payment?.status || 'pending'))
    
    // Always allow updates if amount or description changed, even if dates are the same
    const hasAmountChange = payload.amount !== payment?.amount
    const hasDescriptionChange = payload.description !== payment?.description
    
    // If no meaningful changes detected
    if (!hasDateChanges && !hasOtherChanges && !hasAmountChange && !hasDescriptionChange) {
      toast.info('No changes detected. Payment details are already up to date.')
      setSaving(false)
      return
    }

    // Special check: if the same date is applied, show a friendly message instead of making API call
    if (formData.payment_date === originalPaymentDate && !hasOtherChanges && !hasAmountChange && !hasDescriptionChange) {
      toast.info('Payment date is already set to this value. No changes needed.')
      setSaving(false)
      return
    }

    // Add debugging information
    console.log('Submitting payment update with data:', submitData)
    console.log('Deal ID:', dealId, 'Payment ID:', paymentId)
    console.log('Deal ID type:', typeof dealId, 'Payment ID type:', typeof paymentId)
    console.log('URL will be:', `/payments/${dealId}/${paymentId}`)

    // Validate dealId and paymentId before making the request
    if (!dealId || !paymentId || dealId === 'undefined' || paymentId === 'undefined') {
      toast.error('Invalid payment or deal ID. Please refresh the page and try again.')
      setSaving(false)
      return
    }

    // Convert to numbers to ensure proper format
    const numericDealId = parseInt(dealId)
    const numericPaymentId = parseInt(paymentId)
    
    if (isNaN(numericDealId) || isNaN(numericPaymentId)) {
      toast.error('Invalid payment or deal ID format. Please refresh the page and try again.')
      setSaving(false)
      return
    }

    try {
      setSaving(true)
      await paymentsAPI.update(numericDealId, numericPaymentId, submitData)
      toast.success('Payment updated successfully')
      
      // Redirect back to the deal's payments section since this payment belongs to a specific deal
      router.push(`/deals/${numericDealId}?section=payments`)
    } catch (error) {
      console.error('Failed to update payment:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Submit data that failed:', submitData)
      
      const serverMsg = error.response?.data || error.message || 'Unknown server error'
      console.error('Server message:', serverMsg)
      
      // Show user-friendly error messages
      let errorMessage = 'Failed to update payment'
      
      if (error.response?.status === 404) {
        // Special handling for 404 errors
        errorMessage = 'Payment not found or endpoint unavailable. This might be a temporary issue. Please check the payment exists and try again.'
        console.log('404 Error Details:')
        console.log('- Deal ID:', numericDealId)
        console.log('- Payment ID:', numericPaymentId)
        console.log('- Request URL would be:', `/api/payments/${numericDealId}/${numericPaymentId}`)
        console.log('- Submit data:', submitData)
        
        // Check if it's a same-date issue by adding additional context
        if (formData.payment_date === originalPaymentDate) {
          errorMessage = 'Unable to update payment. The date appears to be unchanged. Please try refreshing the page.'
        }
      } else if (error.response?.status === 400) {
        // Handle validation errors
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = 'Invalid payment data. Please check your inputs and try again.'
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data)
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
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
    <>
      <style jsx>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
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
            <Link href={`/payments/${dealId}/${paymentId}`} className="hover:text-slate-900">
              Payment #{paymentId}
            </Link>
            <span>→</span>
            <span className="text-slate-900">Edit</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Edit Payment</h1>
              {deal && (
                <p className="mt-2 text-slate-600">
                  Deal: {deal.property_details || `Deal #${deal.id}`}
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

        {/* Installment Information Display */}
        {payment && payment.is_installment && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
              Installment Payment
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-700 mb-1">Current Installment</label>
                <div className="text-xl font-bold text-blue-900">
                  {payment.installment_number} of {payment.total_installments}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-700 mb-1">Total Plan Amount</label>
                <div className="text-xl font-bold text-blue-900">
                  ₹{Number(payment.parent_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-700 mb-1">Progress</label>
                <div className="text-xl font-bold text-blue-900">
                  {Math.round((payment.installment_number / payment.total_installments) * 100)}%
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(payment.installment_number / payment.total_installments) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.626 0L5.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Installment Payment Notice
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This is installment {payment.installment_number} of {payment.total_installments}. 
                    Changes to amount may affect the installment plan structure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                      errors.amount ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                    style={{ appearance: 'textfield' }}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.amount && (
                  <div className="mt-1 text-xs text-red-500">{errors.amount}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Type
                </label>
                <select
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                    errors.payment_date ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {errors.payment_date && (
                  <div className="mt-1 text-xs text-red-500">{errors.payment_date}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paid By <span className="text-red-500">*</span>
                </label>
                <select
                  name="paid_by_select"
                  value={formData.paid_by_select}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_by_select: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                    errors.paid_by_select ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">-- Select payer --</option>
                  {partyOptions.map((p, idx) => 
                    p.type === 'group' ? (
                      <optgroup key={idx} label={p.label} />
                    ) : (
                      <option key={idx} value={p.value}>{p.label}</option>
                    )
                  )}
                </select>
                {errors.paid_by_select && (
                  <div className="mt-1 text-xs text-red-500">{errors.paid_by_select}</div>
                )}

                {formData.paid_by_select === '__other__' && (
                  <input
                    type="text"
                    name="paid_by_other"
                    value={formData.paid_by_other}
                    onChange={(e) => setFormData(prev => ({ ...prev, paid_by_other: e.target.value }))}
                    className={`mt-2 w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                      errors.paid_by_other ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                    placeholder="Enter payer name"
                  />
                )}
                {errors.paid_by_other && (
                  <div className="mt-1 text-xs text-red-500">{errors.paid_by_other}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paid To
                </label>
                <select
                  name="paid_to_select"
                  value={formData.paid_to_select}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_to_select: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select receiver --</option>
                  {partyOptions.map((p, idx) => 
                    p.type === 'group' ? (
                      <optgroup key={idx} label={p.label} />
                    ) : p.value === '__other__' ? null : (
                      <option key={idx} value={p.value}>{p.label}</option>
                    )
                  )}
                  <option value="__other__">Other (enter name below)</option>
                </select>

                {formData.paid_to_select === '__other__' && (
                  <input
                    type="text"
                    name="paid_to_other"
                    value={formData.paid_to_other}
                    onChange={(e) => setFormData(prev => ({ ...prev, paid_to_other: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter receiver name"
                  />
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
                {formData.status === 'pending' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input 
                      name="due_date" 
                      type="date" 
                      value={formData.due_date} 
                      onChange={handleInputChange} 
                      className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                        errors.due_date ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                    {errors.due_date && (
                      <div className="mt-1 text-xs text-red-500">{errors.due_date}</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Mode
                </label>
                <select
                  name="payment_mode"
                  value={formData.payment_mode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select payment mode</option>
                  {paymentModes.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                    errors.reference ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                  }`}
                  placeholder="Transaction reference or ID"
                />
                {errors.reference && (
                  <div className="mt-1 text-xs text-red-500">{errors.reference}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Payment category (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Additional notes or comments"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                  }`}
                  placeholder="Payment description or notes"
                  required
                />
                {errors.description && (
                  <div className="mt-1 text-xs text-red-500">{errors.description}</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <div className="flex space-x-3">
                <Link href={`/deals/${dealId}?section=payments`} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors">
                  Cancel
                </Link>
              </div>
              
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  )
}
