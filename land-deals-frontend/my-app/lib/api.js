// lib/api.js - API utilities
import axios from 'axios'
import { getToken } from './auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Simple cache for performance
const cache = new Map()
const pendingRequests = new Map() // Prevent duplicate requests
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for faster development

const getCacheKey = (url, config) => `${url}_${JSON.stringify(config?.params || {})}`

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Response interceptor for better error handling and caching
api.interceptors.response.use(
  (response) => {
    // Cache GET requests for performance
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config.url, response.config)
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      })
    }
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server may be slow')
    }
    return Promise.reject(error)
  }
)

// Cached request function with deduplication
const cachedRequest = async (requestFn, cacheKey) => {
  // Check cache first
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Cache hit:', cacheKey)
    return cached.data
  }
  
  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    console.log('Request deduplication:', cacheKey)
    return await pendingRequests.get(cacheKey)
  }
  
  // Make new request
  const requestPromise = requestFn()
  pendingRequests.set(cacheKey, requestPromise)
  
  try {
    const response = await requestPromise
    // Cache the response
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })
    return response
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

// Cache management functions
const clearCache = (keyPattern) => {
  if (keyPattern) {
    // Clear specific cache keys matching pattern
    for (const key of cache.keys()) {
      if (key.includes(keyPattern)) {
        cache.delete(key)
      }
    }
  } else {
    // Clear all cache
    cache.clear()
  }
}

export const dealAPI = {
  getAll: () => {
    const cacheKey = 'deals_all'
    return cachedRequest(() => api.get('/deals'), cacheKey)
  },
  getById: (id) => {
    const cacheKey = `deals_${id}`
    return cachedRequest(() => api.get(`/deals/${id}`), cacheKey)
  },
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  updateStatus: (id, status) => api.put(`/deals/${id}/status`, { status }),
  addExpense: (dealId, data) => api.post(`/deals/${dealId}/expenses`, data),
  uploadDocument: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // New structured document upload endpoints
  uploadLandDocuments: (dealId, formData) => api.post(`/deals/${dealId}/land-documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadOwnerDocuments: (dealId, ownerId, formData) => api.post(`/deals/${dealId}/owners/${ownerId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadInvestorDocuments: (dealId, investorId, formData) => api.post(`/deals/${dealId}/investors/${investorId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocumentStructure: (dealId) => api.get(`/deals/${dealId}/documents/structure`),
  getDocumentTypes: () => api.get('/document-types'),
  delete: (id) => api.delete(`/deals/${id}`),
  
  // Offers Management  
  getOffers: (dealId) => api.get(`/deals/${dealId}/offers`),
  createOffer: (dealId, offerData) => api.post(`/deals/${dealId}/offers`, offerData),
  updateOfferStatus: (offerId, status, notes = '') => api.put(`/offers/${offerId}/status`, { status, notes }),
  
  // Location Management
  updateLocation: (dealId, locationData) => api.put(`/deals/${dealId}/location`, locationData),
  
  // Purchase Amount Management
  updatePurchaseAmount: (dealId, purchaseAmount) => api.put(`/deals/${dealId}/purchase-amount`, { purchase_amount: purchaseAmount }),
  
  // Owner Shares Management
  updateOwnerShares: (dealId, shareData) => api.put(`/deals/${dealId}/owner-shares`, shareData),
  
  // Selling Amount Management (for deal details page)
  updateSellingAmount: (dealId, sellingData) => api.put(`/deals/${dealId}/selling-amount`, sellingData),
  
  // Investor Percentage Shares Management (exactly like owners)
  updateInvestorPercentageShares: (dealId, investorShares) => {
    // Convert dictionary format to list format expected by backend (same as owners)
    const investorSharesList = Object.entries(investorShares).map(([investorId, percentage]) => ({
      investor_id: parseInt(investorId),
      percentage_share: parseFloat(percentage)
    }));
    return api.put(`/deals/${dealId}/investors/percentage-shares`, { investor_shares: investorSharesList });
  },
  
  // Buyer Management
  addBuyer: async (dealId, buyerData) => {
    const response = await api.post(`/deals/${dealId}/buyers`, buyerData)
    // Clear cache for this deal to ensure fresh data is fetched
    clearCache(`deals_${dealId}`)
    return response
  },
  
  // Audit Logs
  getLogs: (dealId) => api.get(`/deals/${dealId}/logs`),
  
  // Payment Reminders (convenience methods)
  getPaymentReminders: (dealId) => api.get(`/deals/${dealId}/payment-reminders`),
  createPaymentReminder: (dealId, reminderData) => api.post(`/deals/${dealId}/payment-reminders`, reminderData),
  updatePaymentReminderStatus: (reminderId, status) => api.put(`/payment-reminders/${reminderId}/status`, { status }),
  deletePaymentReminder: (reminderId) => api.delete(`/payment-reminders/${reminderId}`),
  
  // Document Delete Methods
  deleteLandDocument: (dealId, documentId) => api.delete(`/deals/${dealId}/land-documents/${documentId}`),
  deleteOwnerDocument: (dealId, ownerId, documentId) => api.delete(`/deals/${dealId}/owners/${ownerId}/documents/${documentId}`),
  deleteInvestorDocument: (dealId, investorId, documentId) => api.delete(`/deals/${dealId}/investors/${investorId}/documents/${documentId}`)
}

export const investorsAPI = {
  getAll: () => api.get('/investors'),
  getById: (id) => api.get(`/investors/${id}`),
  create: (data) => api.post('/investors', data),
  update: (id, data) => api.put(`/investors/${id}`, data),
  delete: (id) => api.delete(`/investors/${id}`),
  
  // Deal-Investor Association
  addToDeal: (dealId, investorData) => api.post(`/deals/${dealId}/investors`, investorData),
  getAvailableInvestors: (dealId) => api.get(`/investors/available/${dealId}`),
  
  // Percentage shares management (exactly like owners)
  updatePercentageShares: (dealId, investorShares) => {
    // Convert dictionary format to list format expected by backend
    const investorSharesList = Object.entries(investorShares).map(([investorId, percentage]) => ({
      investor_id: parseInt(investorId),
      percentage_share: parseFloat(percentage)
    }));
    return api.put(`/deals/${dealId}/investors/percentage-shares`, { investor_shares: investorSharesList });
  },
  
  // Test endpoint for debugging
  testAvailableInvestors: (dealId) => api.get(`/test-investors-simple/${dealId}`)
}

export const ownersAPI = {
  getAll: () => api.get('/owners'),
  getStarred: () => api.get('/owners/starred'),
  getById: (id) => api.get(`/owners/${id}`),
  create: (data) => api.post('/owners', data),
  update: (id, data) => api.put(`/owners/${id}`, data),
  delete: (id) => api.delete(`/owners/${id}`),
  star: (id, starred = true) => api.post(`/owners/${id}/star`, { starred }),
  updatePercentageShares: (dealId, ownerShares) => {
    // Convert dictionary format to list format expected by backend
    const ownerSharesList = Object.entries(ownerShares).map(([ownerId, percentage]) => ({
      owner_id: parseInt(ownerId),
      percentage_share: parseFloat(percentage)
    }));
    return api.put(`/deals/${dealId}/owners/percentage-shares`, { owner_shares: ownerSharesList });
  }
}

export const paymentsAPI = {
  list: (dealId) => api.get(`/payments/${dealId}`),
  listAll: () => api.get('/payments'), // New endpoint for all payments across deals
  detail: (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}`),
  // create accepts optional options object: { params: { force: true } }
  create: (dealId, data, options = {}) => api.post(`/payments/${dealId}`, data, { params: options.params || {} }),
  update: (dealId, paymentId, data) => api.put(`/payments/${dealId}/${paymentId}`, data),
  delete: (dealId, paymentId) => api.delete(`/payments/${dealId}/${paymentId}`),
  // Split installments - creates multiple individual payments
  createInstallments: (dealId, data) => api.post(`/payments/${dealId}/split-installments`, data)
}

// Proofs
paymentsAPI.uploadProof = (dealId, paymentId, formData) => api.post(`/payments/${dealId}/${paymentId}/proof`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Investor to Owner Payments
paymentsAPI.createInvestorToOwnerPayment = (dealId, paymentData) => api.post(`/payments/${dealId}/investor-to-owner`, paymentData)
paymentsAPI.getPaymentTrackingData = (dealId) => api.get(`/deals/${dealId}/payment-tracking`)

// Admin user management
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`)
}

paymentsAPI.listProofs = (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}/proofs`)
paymentsAPI.deleteProof = (dealId, paymentId, proofId) => api.delete(`/payments/${dealId}/${paymentId}/proofs/${proofId}`)

// Ledger: flexible filter endpoint
paymentsAPI.ledger = (filters) => api.get('/payments/ledger', { params: filters })
// Server CSV export
paymentsAPI.ledgerCsv = (filters) => api.get('/payments/ledger.csv', { params: filters, responseType: 'blob' })
// Server PDF export (returns a PDF blob)
paymentsAPI.ledgerPdf = (filters) => api.get('/payments/ledger.pdf', { params: filters, responseType: 'blob' })

// Cleanup/Maintenance API
export const cleanupAPI = {
  orphanedOwners: () => api.delete('/cleanup/orphaned-owners'),
  orphanedInvestors: () => api.delete('/cleanup/orphaned-investors'),
  orphanedDocuments: () => api.delete('/cleanup/orphaned-documents'),
  allOrphaned: () => api.delete('/cleanup/all-orphaned-data')
}

// Payment Reminders API
export const paymentRemindersAPI = {
  getForDeal: (dealId) => api.get(`/deals/${dealId}/payment-reminders`),
  create: (dealId, reminderData) => api.post(`/deals/${dealId}/payment-reminders`, reminderData),
  updateStatus: (reminderId, status) => api.put(`/payment-reminders/${reminderId}/status`, { status }),
  delete: (reminderId) => api.delete(`/payment-reminders/${reminderId}`)
}

export default api