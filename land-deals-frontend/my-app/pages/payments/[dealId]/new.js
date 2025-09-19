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
    category: '',
    payer_bank_name: '',
    payer_bank_account_no: '',
    receiver_bank_name: '',
    receiver_bank_account_no: '',
    // Installment fields
    is_installment: false,
    installment_count: 2, // Default to 2 (minimum valid value)
    installment_frequency: 'monthly', // monthly, quarterly, half_yearly, yearly
    installment_start_date: new Date().toISOString().split('T')[0],
    installment_type: 'equal', // equal, custom
    custom_installments: [] // For custom amounts and dates
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
            value: `owner_${o.id}`, // Store as owner_ID format
            label: name,
            type: 'Owner',
            id: o.id,
            name: name,
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
            value: `investor_${inv.id}`, // Store as investor_ID format
            label: name,
            type: 'Investor',
            id: inv.id,
            name: name,
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
            value: `buyer_${b.id}`, // Store as buyer_ID format
            label: name,
            type: 'Buyer',
            id: b.id,
            name: name,
            phone: b.phone || b.contact_number,
            email: b.email
          })
        })
      }

      // Build structured options with groups - Investors first, then buyers, then owners for paid by dropdown
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
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    // Special handling for installment count to ensure proper validation
    if (name === 'installment_count') {
      const count = parseInt(value) || 2
      const validatedCount = Math.max(2, Math.min(12, count))
      setFormData(prev => ({ ...prev, [name]: validatedCount }))
    } else {
      setFormData(prev => ({ ...prev, [name]: newValue }))
    }
    
    // Auto-fill amount when investor is selected or clear when deselected
    if (name === 'paid_by_select') {
      // Check if the selected value is an investor and payment type is land_purchase
      if (value && value !== '__other__' && value.startsWith('investor_') && formData.payment_type === 'land_purchase') {
        // Extract the investor ID from the value format "investor_123"
        const investorId = parseInt(value.split('_')[1])
        
        // Find the investor in the deal data
        const selectedInvestor = deal?.investors?.find(inv => inv.id === investorId)
        
        if (selectedInvestor) {
          // Prioritize calculated_investment_amount over investment_amount
          let suggestedAmount = null
          
          if (selectedInvestor.calculated_investment_amount && selectedInvestor.calculated_investment_amount > 0) {
            // Use calculated amount if available and positive
            suggestedAmount = selectedInvestor.calculated_investment_amount
          } else if (selectedInvestor.investment_amount && parseFloat(selectedInvestor.investment_amount) > 0) {
            // Fallback to investment_amount if calculated amount is not available
            suggestedAmount = parseFloat(selectedInvestor.investment_amount)
          }
          
          // Update the amount field with the suggested amount
          if (suggestedAmount) {
            setFormData(prev => ({ 
              ...prev, 
              [name]: newValue,
              amount: suggestedAmount.toString()
            }))
            
            // Clear any amount errors since we're setting a valid amount
            if (errors.amount) {
              setErrors(prev => ({ ...prev, amount: '' }))
            }
            
            return // Exit early since we've already updated formData
          }
        }
      } else if (!value || value === '' || value === '__other__' || !['land_purchase', 'advance', 'final', 'partial'].includes(formData.payment_type)) {
        // Clear the amount field when no selection, non-investor selection, or payment type is not land purchase related
        setFormData(prev => ({ 
          ...prev, 
          [name]: newValue,
          amount: ''
        }))
        
        return // Exit early since we've already updated formData
      }
    }
    
    // Also handle payment type changes - clear amount if switching away from land_purchase
    if (name === 'payment_type') {
      if (value !== 'land_purchase') {
        // Clear amount when payment type is not land_purchase
        setFormData(prev => ({ 
          ...prev, 
          [name]: newValue,
          amount: ''
        }))
        
        return // Exit early since we've already updated formData
      } else if (value === 'land_purchase' && formData.paid_by_select && formData.paid_by_select.startsWith('investor_')) {
        // Re-populate amount if switching to land_purchase and an investor is selected
        const investorId = parseInt(formData.paid_by_select.split('_')[1])
        const selectedInvestor = deal?.investors?.find(inv => inv.id === investorId)
        
        if (selectedInvestor) {
          let suggestedAmount = null
          
          if (selectedInvestor.calculated_investment_amount && selectedInvestor.calculated_investment_amount > 0) {
            suggestedAmount = selectedInvestor.calculated_investment_amount
          } else if (selectedInvestor.investment_amount && parseFloat(selectedInvestor.investment_amount) > 0) {
            suggestedAmount = parseFloat(selectedInvestor.investment_amount)
          }
          
          if (suggestedAmount) {
            setFormData(prev => ({ 
              ...prev, 
              [name]: newValue,
              amount: suggestedAmount.toString()
            }))
            
            // Clear any amount errors
            if (errors.amount) {
              setErrors(prev => ({ ...prev, amount: '' }))
            }
            
            return // Exit early since we've already updated formData
          }
        }
      }
    }
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Reset installment settings when toggling off
    if (name === 'is_installment' && !checked) {
      setFormData(prev => ({
        ...prev,
        is_installment: false,
        installment_count: 2, // Reset to minimum valid value
        installment_frequency: 'monthly',
        installment_start_date: new Date().toISOString().split('T')[0],
        installment_type: 'equal',
        custom_installments: []
      }))
    }
    
    // When enabling installments, ensure minimum count
    if (name === 'is_installment' && checked) {
      setFormData(prev => ({
        ...prev,
        is_installment: true,
        installment_count: Math.max(2, prev.installment_count), // Ensure minimum 2
      }))
    }
    
    // Reset custom installments when switching installment type
    if (name === 'installment_type') {
      if (value === 'equal') {
        // Clear custom installments when switching to auto-generated
        setFormData(prev => ({
          ...prev,
          installment_type: value,
          custom_installments: []
        }))
      } else if (value === 'custom') {
        // Initialize custom installments with auto-generated dates as defaults
        const count = parseInt(formData.installment_count)
        const amount = parseFloat(formData.amount) / count
        const dates = generateInstallmentDates(
          formData.installment_start_date,
          formData.installment_frequency,
          count
        )
        
        const initialCustomInstallments = dates.map((date, index) => ({
          date: date.toISOString().split('T')[0],
          amount: amount
        }))
        
        setFormData(prev => ({
          ...prev,
          installment_type: value,
          custom_installments: initialCustomInstallments
        }))
      }
    }
    
    // Update custom installments when installment count changes in custom mode
    if (name === 'installment_count' && formData.installment_type === 'custom') {
      const count = parseInt(value) || 2
      const validatedCount = Math.max(2, Math.min(12, count))
      const amount = parseFloat(formData.amount) / validatedCount
      
      // Generate new custom installments array
      const dates = generateInstallmentDates(
        formData.installment_start_date,
        formData.installment_frequency,
        validatedCount
      )
      
      const newCustomInstallments = Array.from({ length: validatedCount }, (_, index) => ({
        date: formData.custom_installments?.[index]?.date || dates[index]?.toISOString().split('T')[0] || formData.installment_start_date,
        amount: amount
      }))
      
      setFormData(prev => ({
        ...prev,
        installment_count: validatedCount,
        custom_installments: newCustomInstallments
      }))
    }
  }

  // Generate installment dates based on frequency and start date
  const generateInstallmentDates = (startDate, frequency, count) => {
    const dates = []
    let currentDate = new Date(startDate)
    
    for (let i = 0; i < count; i++) {
      dates.push(new Date(currentDate))
      
      switch (frequency) {
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3)
          break
        case 'half_yearly':
          currentDate.setMonth(currentDate.getMonth() + 6)
          break
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1)
          break
        default:
          currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }
    
    return dates
  }

  // Generate installment preview for UI display
  const generateInstallmentPreview = () => {
    if (!formData.amount || !formData.installment_count) return []
    
    const totalAmount = parseFloat(formData.amount)
    const count = parseInt(formData.installment_count)
    const equalAmount = totalAmount / count
    
    // Use custom dates if available, otherwise generate auto dates
    if (formData.installment_type === 'custom' && formData.custom_installments && formData.custom_installments.length > 0) {
      return Array.from({ length: count }, (_, index) => {
        const customInstallment = formData.custom_installments[index]
        const date = customInstallment?.date || formData.installment_start_date
        
        return {
          installment_number: index + 1,
          date: date,
          amount: customInstallment?.amount || equalAmount,
          formatted_date: new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        }
      })
    } else {
      // Auto-generate dates based on frequency
      const dates = generateInstallmentDates(
        formData.installment_start_date,
        formData.installment_frequency,
        count
      )
      
      return dates.map((date, index) => ({
        installment_number: index + 1,
        date: date.toISOString().split('T')[0],
        amount: equalAmount,
        formatted_date: date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      }))
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
      case 'reference':
        if (!value.trim()) {
          error = 'Transaction ID is required'
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
      paid_by_select: formData.paid_by_select,
      reference: formData.reference
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

    // Helper function to extract name from party options
    const getPartyDetails = (selectValue) => {
      if (selectValue === '__other__') return null;
      const party = partyOptions.find(p => p.value === selectValue);
      return party ? { id: party.id, name: party.name, type: party.type } : null;
    }

    const paidByDetails = getPartyDetails(formData.paid_by_select);
    const paidToDetails = getPartyDetails(formData.paid_to_select);

    try {
      setLoading(true)

      if (formData.is_installment && formData.installment_count > 1) {
        // Handle installment creation
        await handleInstallmentCreation(paidByDetails, paidToDetails)
      } else {
        // Handle single payment creation
        const payload = {
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date,
          due_date: formData.due_date,
          description: formData.description.trim(),
          payment_type: formData.payment_type,
          status: formData.status,
          paid_by: formData.paid_by_select === '__other__' ? formData.paid_by_other.trim() : formData.paid_by_select,
          paid_to: formData.paid_to_select === '__other__' ? formData.paid_to_other.trim() : formData.paid_to_select || '',
          // Add ID-based tracking fields
          paid_by_id: paidByDetails?.id || null,
          paid_by_name: paidByDetails?.name || (formData.paid_by_select === '__other__' ? formData.paid_by_other.trim() : null),
          paid_by_type: paidByDetails?.type || null,
          paid_to_id: paidToDetails?.id || null,
          paid_to_name: paidToDetails?.name || (formData.paid_to_select === '__other__' ? formData.paid_to_other.trim() : null),
          paid_to_type: paidToDetails?.type || null,
          payment_mode: formData.payment_mode,
          reference: formData.reference.trim(),
          notes: formData.notes.trim(),
          category: formData.category.trim(),
          // Bank fields
          payer_bank_name: formData.payer_bank_name?.trim() || '',
          payer_bank_account_no: formData.payer_bank_account_no?.trim() || '',
          receiver_bank_name: formData.receiver_bank_name?.trim() || '',
          receiver_bank_account_no: formData.receiver_bank_account_no?.trim() || ''
        }

        const resp = await paymentsAPI.create(dealId, payload)
        const newPaymentId = resp?.data?.payment_id
        toast.success('Payment created successfully!')

        // Enhanced receipt upload with better error handling
        if (receiptFile && newPaymentId) {
          await handleReceiptUpload(newPaymentId)
        }

        // Navigate to the new payment detail
        router.push(newPaymentId ? `/payments/${dealId}/${newPaymentId}` : `/deals/${dealId}#payments`)
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create payment'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInstallmentCreation = async (paidByDetails, paidToDetails) => {
    const totalAmount = parseFloat(formData.amount)
    const installmentCount = parseInt(formData.installment_count)
    
    // Prepare installments array
    const installments = []
    
    if (formData.installment_type === 'custom' && formData.custom_installments && formData.custom_installments.length > 0) {
      // Use custom amounts and dates
      for (let i = 0; i < installmentCount; i++) {
        const custom = formData.custom_installments[i] || {}
        const amount = custom.amount || (totalAmount / installmentCount)
        const date = custom.date || generateInstallmentDates(formData.installment_start_date, formData.installment_frequency, installmentCount)[i]?.toISOString().split('T')[0]
        
        installments.push({
          amount: amount,
          payment_date: date,
          due_date: date
        })
      }
    } else {
      // Use equal amounts and auto-generated dates
      const installmentAmount = totalAmount / installmentCount
      const installmentDates = generateInstallmentDates(
        formData.installment_start_date,
        formData.installment_frequency,
        installmentCount
      )

      for (let i = 0; i < installmentCount; i++) {
        installments.push({
          amount: installmentAmount,
          payment_date: installmentDates[i].toISOString().split('T')[0],
          due_date: installmentDates[i].toISOString().split('T')[0]
        })
      }
    }

    // Prepare the payload for creating individual installment payments
    const installmentPayload = {
      installments: installments,
      description: formData.description.trim(),
      payment_type: formData.payment_type,
      status: 'pending', // Always set status to pending for installments
      paid_by: formData.paid_by_select === '__other__' ? formData.paid_by_other.trim() : formData.paid_by_select,
      paid_to: formData.paid_to_select === '__other__' ? formData.paid_to_other.trim() : formData.paid_to_select || '',
      payment_mode: formData.payment_mode,
      reference: formData.reference.trim(),
      notes: formData.notes.trim(),
      category: formData.category.trim(),
      // Bank fields
      payer_bank_name: formData.payer_bank_name?.trim() || '',
      payer_bank_account_no: formData.payer_bank_account_no?.trim() || '',
      receiver_bank_name: formData.receiver_bank_name?.trim() || '',
      receiver_bank_account_no: formData.receiver_bank_account_no?.trim() || ''
    }

    try {
      // Create individual installment payments using the paymentsAPI
      const response = await paymentsAPI.createInstallments(dealId, installmentPayload)
      
      toast.success(`Successfully created ${installmentCount} installment payments!`)
      
      // Navigate back to deal details payments section to show all created installments
      router.push(`/deals/${dealId}#payments`)
      
    } catch (error) {
      console.error('Error creating installment payments:', error)
      throw error // Re-throw to be handled by the caller
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
      {/* Navigation - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mobile-header-stack">
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
                <h1 className="text-3xl md:text-3xl text-2xl font-bold text-slate-900">
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
            <div className="flex space-x-3 mobile-button-group">
              <button
                type="button"
                onClick={() => router.push(`/deals/${dealId}?section=payments`)}
                className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Deal Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Single Form - All sections combined */}
            <div className="bg-white rounded border border-slate-200 p-6 mobile-form-section">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Payment Information</h2>
              
              {/* Payment Parties - Moved to top */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Payment Parties</h3>
                
                {/* Payer and Payer Bank Details in same row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mobile-party-selection">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payer <span className="text-red-500">*</span>
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
                    
                    {/* Payer custom name input - appears directly below dropdown */}
                    {formData.paid_by_select === '__other__' && (
                      <div className="mt-3">
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payer Bank Name
                    </label>
                    <input
                      type="text"
                      name="payer_bank_name"
                      value={formData.payer_bank_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.payer_bank_name ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter payer's bank name"
                    />
                    {errors.payer_bank_name && (
                      <div className="mt-1 text-xs text-red-500">{errors.payer_bank_name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payer Bank Account Number
                    </label>
                    <input
                      type="text"
                      name="payer_bank_account_no"
                      value={formData.payer_bank_account_no}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.payer_bank_account_no ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter payer's account number"
                    />
                    {errors.payer_bank_account_no && (
                      <div className="mt-1 text-xs text-red-500">{errors.payer_bank_account_no}</div>
                    )}
                  </div>
                </div>

                {/* Receiver and Receiver Bank Details in same row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Receiver
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
                    
                    {/* Receiver custom name input - appears directly below dropdown */}
                    {formData.paid_to_select === '__other__' && (
                      <div className="mt-3">
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

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Receiver Bank Name
                    </label>
                    <input
                      type="text"
                      name="receiver_bank_name"
                      value={formData.receiver_bank_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.receiver_bank_name ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter receiver's bank name"
                    />
                    {errors.receiver_bank_name && (
                      <div className="mt-1 text-xs text-red-500">{errors.receiver_bank_name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Receiver Bank Account Number
                    </label>
                    <input
                      type="text"
                      name="receiver_bank_account_no"
                      value={formData.receiver_bank_account_no}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.receiver_bank_account_no ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter receiver's account number"
                    />
                    {errors.receiver_bank_account_no && (
                      <div className="mt-1 text-xs text-red-500">{errors.receiver_bank_account_no}</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Basic Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      style={{ appearance: 'textfield' }}
                      placeholder="Enter payment amount"
                    />
                    {errors.amount && (
                      <div className="mt-1 text-xs text-red-500">{errors.amount}</div>
                    )}
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

                {/* Installment Feature */}
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="is_installment"
                      name="is_installment"
                      checked={formData.is_installment}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <label htmlFor="is_installment" className="ml-2 text-sm font-medium text-slate-700">
                      Split this payment into installments
                    </label>
                  </div>

                  {formData.is_installment && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Number of Installments
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newCount = Math.max(2, parseInt(formData.installment_count) - 1)
                                setFormData(prev => ({ ...prev, installment_count: newCount }))
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold text-sm"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              name="installment_count"
                              value={formData.installment_count}
                              onChange={(e) => {
                                const value = Math.max(2, Math.min(12, parseInt(e.target.value) || 2))
                                setFormData(prev => ({ ...prev, installment_count: value }))
                              }}
                              min="2"
                              max="12"
                              className="w-16 px-2 py-2 text-sm border border-slate-300 rounded text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newCount = Math.min(12, parseInt(formData.installment_count) + 1)
                                setFormData(prev => ({ ...prev, installment_count: newCount }))
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold text-sm"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">2-12 installments</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Frequency
                          </label>
                          <select
                            name="installment_frequency"
                            value={formData.installment_frequency}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly (3 months)</option>
                            <option value="half_yearly">Half-yearly (6 months)</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            First Installment Date
                          </label>
                          <input
                            type="date"
                            name="installment_start_date"
                            value={formData.installment_start_date}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Date Configuration
                          </label>
                          <select
                            name="installment_type"
                            value={formData.installment_type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="equal">Auto-generate dates (by frequency)</option>
                            <option value="custom">Custom dates for each installment</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Amount per Installment
                          </label>
                          <div className="text-sm text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded">
                            {formData.amount && formData.installment_count > 0
                              ? `₹${(parseFloat(formData.amount) / parseInt(formData.installment_count)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : '₹0'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Custom Date Configuration */}
                      {formData.installment_type === 'custom' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-blue-900 mb-3">Configure Individual Installment Dates</h4>
                          <div className="space-y-3">
                            {Array.from({ length: parseInt(formData.installment_count) }, (_, index) => {
                              const installmentDate = formData.custom_installments[index]?.date || 
                                generateInstallmentDates(formData.installment_start_date, formData.installment_frequency, formData.installment_count)[index]?.toISOString().split('T')[0] || 
                                formData.installment_start_date;
                              
                              return (
                                <div key={index} className="grid grid-cols-2 gap-3 items-center">
                                  <div className="text-sm font-medium text-blue-800">
                                    Installment {index + 1}:
                                  </div>
                                  <input
                                    type="date"
                                    value={installmentDate}
                                    onChange={(e) => {
                                      const newCustomInstallments = [...(formData.custom_installments || [])];
                                      newCustomInstallments[index] = {
                                        ...newCustomInstallments[index],
                                        date: e.target.value,
                                        amount: parseFloat(formData.amount) / parseInt(formData.installment_count)
                                      };
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        custom_installments: newCustomInstallments 
                                      }));
                                    }}
                                    className="px-3 py-2 text-sm border border-blue-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 text-xs text-blue-600">
                            💡 Tip: You can set individual due dates for each installment payment
                          </div>
                        </div>
                      )}

                      {/* Installment Preview */}
                      {formData.installment_count > 0 && formData.amount && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-slate-600 mb-2">
                            Installment Preview
                          </label>
                          <div className="bg-white border border-slate-200 rounded p-3 max-h-40 overflow-y-auto">
                            {generateInstallmentPreview().map((installment, index) => (
                              <div key={index} className="flex justify-between items-center py-1 text-xs">
                                <span className="text-slate-600">
                                  Installment {index + 1}: {installment.date}
                                </span>
                                <span className="font-medium text-slate-900">
                                  ₹{installment.amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                      Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
                        errors.reference ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter transaction ID"
                    />
                    {errors.reference && (
                      <div className="mt-1 text-xs text-red-500">{errors.reference}</div>
                    )}
                  </div>
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
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-200 mobile-action-buttons">
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
    </>
  )
}

<style jsx>{`
  @media (max-width: 767px) {
    .mobile-header-stack {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .mobile-button-group {
      flex-direction: column;
      width: 100%;
      gap: 0.5rem;
    }
    
    .mobile-button-group > * {
      width: 100%;
      justify-content: center;
    }
    
    .mobile-form-grid {
      grid-template-columns: 1fr !important;
      gap: 1rem;
    }
    
    .mobile-form-section {
      padding: 1rem;
    }
    
    .mobile-action-buttons {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .mobile-action-buttons > * {
      width: 100%;
      justify-content: center;
      text-align: center;
    }
    
    .mobile-installment-grid {
      grid-template-columns: 1fr !important;
    }
    
    .mobile-bank-details {
      grid-template-columns: 1fr !important;
    }
    
    .mobile-party-selection {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>
