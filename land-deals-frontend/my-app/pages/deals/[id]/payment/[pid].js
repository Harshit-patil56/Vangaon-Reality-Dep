import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '../../../../components/layout/Navbar'
import { paymentsAPI } from '../../../../lib/api'
import { getUser, logout } from '../../../../lib/auth'
import toast from 'react-hot-toast'

export default function PaymentDetailPage() {
  const router = useRouter()
  const { id, pid } = router.query
  const [user, setUser] = useState(null)
  const [payment, setPayment] = useState(null)
  const [proofs, setProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  // const [failedImages, setFailedImages] = useState(new Set()) // Unused variable - kept for potential future use
  const [selectedDocType, setSelectedDocType] = useState('receipt')

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Use the detailed payment endpoint instead of filtering from list
      const paymentRes = await paymentsAPI.detail(id, pid)
      setPayment(paymentRes.data)
      
      const proofsRes = await paymentsAPI.listProofs(id, pid)
      setProofs(proofsRes.data || [])
    } catch {
      toast.error('Failed to load payment details')
    } finally {
      setLoading(false)
    }
  }, [id, pid])

  useEffect(() => {
    if (!id || !pid) return
    fetchData()
  }, [id, pid, fetchData])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('proof', file)
  fd.append('doc_type', selectedDocType)
    try {
      setUploading(true)
      await paymentsAPI.uploadProof(id, pid, fd)
      toast.success('Uploaded')
      // reset failed image set in case this upload fixes rendering issues
      setFailedImages(new Set())
      fetchData()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      // clear the file input value so the same file can be re-selected
      try { e.target.value = null } catch {}
    }
  }

  // const handleDeleteProof = async (proofId) => { // Unused function - kept for potential future use
  //   if (!confirm('Delete this proof?')) return
  //   try {
  //     await paymentsAPI.deleteProof(id, pid, proofId)
  //     toast.success('Deleted')
  //     fetchData()
  //   } catch {
  //     toast.error('Delete failed')
  //   }
  // }

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-slate-600">Loading payment details...</div>
        </div>
      </div>
    </div>
  )

  if (!payment) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-slate-600">Payment not found</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Payment #{payment.id}</h2>
                <p className="text-lg text-slate-600 mt-1">
                  {(payment.payment_date || '').split('T')[0]} • ₹{Number(payment.amount).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {payment.payment_type && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {payment.payment_type === 'land_purchase' ? 'Land Purchase' :
                     payment.payment_type === 'investment_sale' ? 'Investment/Sale' :
                     payment.payment_type === 'documentation_legal' ? 'Documentation & Legal' :
                     'Other Payment'}
                  </span>
                )}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Pending'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => router.push({ pathname: '/deals/payments', query: { id } })} 
              className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Payments
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Payment Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Payment Information */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mode:</span>
                    <span className="font-medium text-slate-900">{payment.payment_mode || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Reference:</span>
                    <span className="font-medium text-slate-900">{payment.reference || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Created by:</span>
                    <span className="font-medium text-slate-900">{payment.created_by || 'Unknown'}</span>
                  </div>
                  {payment.payment_type && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {payment.payment_type === 'land_purchase' ? 'Land Purchase' :
                         payment.payment_type === 'investment_sale' ? 'Investment/Sale' :
                         payment.payment_type === 'documentation_legal' ? 'Documentation & Legal' :
                         'Other Payment'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Date:</span>
                    <span className="font-medium text-slate-900">{(payment.payment_date || '').split('T')[0] || 'Not set'}</span>
                  </div>
                  {payment.due_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Due Date:</span>
                      <span className="font-medium text-slate-900">{(payment.due_date || '').split('T')[0]}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recorded:</span>
                    <span className="font-medium text-slate-900">{(payment.created_at || '').split('T')[0] || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-600">Notes:</span>
                    <p className="font-medium text-slate-900 mt-1">{payment.notes || 'No additional notes'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Flow Details */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Flow Details</h3>
              {payment.parties && payment.parties.length > 0 ? (
                (() => {
                  const getParticipantLabel = (pt) => {
                    if (pt.party_name) {
                      if (pt.party_id) {
                        return `${pt.party_name} (${pt.party_type} #${pt.party_id})`
                      } else {
                        return `${pt.party_name} (${pt.party_type})`
                      }
                    } else {
                      if (pt.party_id) return `${pt.party_type || 'participant'} #${pt.party_id}`
                      return pt.party_type || 'participant'
                    }
                  }

                  const payers = payment.parties.filter(pp => (pp.role || '').toLowerCase() === 'payer')
                  const payees = payment.parties.filter(pp => (pp.role || '').toLowerCase() === 'payee')
                  
                  if (payers.length > 0 && payees.length > 0) {
                    return (
                      <div className="space-y-4">
                        <div className="text-center">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-blue-100 text-blue-800">
                            ₹{Number(payment.amount).toLocaleString()} Transfer
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">From (Payer)</p>
                            <div className="space-y-2">
                              {payers.map((payer, idx) => (
                                <div key={idx} className="bg-green-100 border border-green-200 rounded-lg p-4">
                                  <div className="font-medium text-green-800 text-lg">
                                    {getParticipantLabel(payer)}
                                  </div>
                                  <div className="text-sm text-green-600 mt-1">
                                    Role: {payer.role}
                                  </div>
                                  {payer.amount && (
                                    <div className="text-sm text-green-600 mt-1">
                                      Amount: ₹{Number(payer.amount).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="px-6">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                          
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">To (Payee)</p>
                            <div className="space-y-2">
                              {payees.map((payee, idx) => (
                                <div key={idx} className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                                  <div className="font-medium text-blue-800 text-lg">
                                    {getParticipantLabel(payee)}
                                  </div>
                                  <div className="text-sm text-blue-600 mt-1">
                                    Role: {payee.role}
                                  </div>
                                  {payee.amount && (
                                    <div className="text-sm text-blue-600 mt-1">
                                      Amount: ₹{Number(payee.amount).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } else if (payment.parties.length > 0) {
                    return (
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-gray-100 text-gray-800">
                            ₹{Number(payment.amount).toLocaleString()} Payment
                          </span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Parties Involved:</p>
                          {payment.parties.map((party, idx) => (
                            <div key={idx} className="bg-slate-100 border border-slate-200 rounded-lg p-4">
                              <div className="font-medium text-slate-800 text-lg">
                                {getParticipantLabel(party)}
                              </div>
                              {party.role && (
                                <div className="text-sm text-slate-600 mt-1">
                                  Role: {party.role}
                                </div>
                              )}
                              {party.amount && (
                                <div className="text-sm text-slate-600 mt-1">
                                  Amount: ₹{Number(party.amount).toLocaleString()}
                                </div>
                              )}
                              {party.pay_to_name && (
                                <div className="text-sm text-blue-600 mt-1 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                                  <strong>Paid to:</strong> {party.pay_to_name}
                                </div>
                              )}
                              {party.pay_to_id && !party.pay_to_name && (
                                <div className="text-sm text-blue-600 mt-1 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                                  <strong>Paid to:</strong> {party.pay_to_type} #{party.pay_to_id}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Show payment flow summary */}
                        {payment.payment_flow && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm font-medium text-blue-800">Payment Flow:</div>
                            <div className="text-blue-700 mt-1">{payment.payment_flow}</div>
                          </div>
                        )}
                        
                        {/* Show suggestion for incomplete data */}
                        {payers.length > 0 && payees.length === 0 && !payment.parties.some(p => p.pay_to_name || p.pay_to_id) && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-sm text-yellow-800">
                              <strong>Note:</strong> This payment shows who made the payment, but doesn&apos;t specify who received it. 
                              For complete payment tracking, consider adding payee information when creating new payments.
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    return (
                      <div className="text-center text-slate-600">
                        No detailed payment flow information available
                      </div>
                    )
                  }
                })()
              ) : (
                <div className="text-center py-6">
                  <div className="text-lg text-slate-600 mb-2">
                    <strong>Payment Amount:</strong> ₹{Number(payment.amount).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">
                    Detailed payment flow information not available for this payment.
                    {payment.party_type && payment.party_id && (
                      <div className="mt-2">
                        Related to: {payment.party_type} #{payment.party_id}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Proofs Section */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Proofs</h3>
              {proofs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proofs.map((proof, idx) => (
                    <div key={idx} className="border border-slate-300 rounded-lg p-4">
                      <div className="text-sm font-medium text-slate-900 mb-2">{proof.filename || (proof.file_path || '').split('/').pop() || 'Document'}</div>
                      <div className="text-xs text-slate-500 mb-3">
                        {proof.doc_type && <span className="inline-block px-2 py-1 bg-slate-100 rounded mr-2">{proof.doc_type}</span>}
                        {proof.uploaded_at && <span>Uploaded: {(proof.uploaded_at || '').split('T')[0]}</span>}
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={proof.url || proof.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                        <a 
                          href={proof.url || proof.file_url}
                          download
                          className="inline-flex items-center px-3 py-1 bg-slate-500 text-white text-xs rounded hover:bg-slate-600 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  No proofs uploaded for this payment
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} className="border border-slate-200 rounded p-1 text-xs">
              <option value="receipt">Receipt</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash Receipt</option>
              <option value="upi">UPI</option>
              <option value="contra">Contra</option>
              <option value="other">Other</option>
            </select>
            <input 
              type="file" 
              id="payment-proof-upload-detail"
              onChange={handleUpload} 
              disabled={uploading}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label
              htmlFor="payment-proof-upload-detail"
              className={`px-2 py-1 text-xs rounded cursor-pointer ${uploading ? 'bg-slate-400 text-slate-200' : 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'}`}
            >
              Choose File
            </label>
            <span className={`px-2 py-1 text-xs rounded ${uploading ? 'bg-slate-500 text-slate-200' : 'bg-slate-900 text-white'}`}>
              {uploading ? 'Uploading...' : 'Upload'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
