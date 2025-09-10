import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import { paymentsAPI } from '../../lib/api'
import { getToken, getUser, logout } from '../../lib/auth'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import { InputModal } from '../../components/common/ConfirmModal'

export default function PaymentsPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [ledgerFilters, setLedgerFilters] = useState({ payment_mode: '', party_type: '', party_id: '', payment_type: '' })
  const [ledgerResults, setLedgerResults] = useState([])
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [paymentToAnnotate, setPaymentToAnnotate] = useState(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const isAuthed = mounted && !!getToken()

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await paymentsAPI.list(id)
      setPayments(res.data || [])
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchPayments()
  }, [id, fetchPayments])

  const getParticipantLabel = (pt) => {
    if (!pt) return ''
    if (pt.party_name) return `${pt.party_name} (${pt.party_type || 'participant'})`
    if (pt.party_id) return `${pt.party_type || 'participant'} #${pt.party_id}`
    return pt.party_type || 'participant'
  }

  const handleAnnotateClick = (payment) => {
    setPaymentToAnnotate(payment)
    setShowNotesModal(true)
  }

  const annotate = async (notes) => {
    if (!paymentToAnnotate || !notes) return
    
    try {
      await paymentsAPI.update(id, paymentToAnnotate.id, { notes })
      toast.success('Notes updated')
      fetchPayments()
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setShowNotesModal(false)
      setPaymentToAnnotate(null)
    }
  }

  const handleProofUpload = async (paymentId, file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('proof', file)
    setUploading(true)
    try {
      await paymentsAPI.uploadProof(id, paymentId, fd)
      toast.success('Proof uploaded')
      fetchPayments()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const runLedger = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const res = await paymentsAPI.ledger(filters)
      setLedgerResults(res.data || [])
    } catch {
      toast.error('Ledger query failed')
    }
  }

  const exportLedgerCSV = () => {
    if (!ledgerResults || ledgerResults.length === 0) return
    const rows = []
    const headers = ['deal_id','payment_id','payment_date','amount','payment_mode','party_type','party_id','party_amount','notes']
    ledgerResults.forEach(r => {
      if (r.parties && r.parties.length > 0) {
        r.parties.forEach(p => rows.push([r.deal_id || id || '', r.id, r.payment_date?.split('T')[0] || r.payment_date || '', r.amount, r.payment_mode || '', p.party_type || '', p.party_id || '', p.amount || '', r.notes || '']))
      } else {
        rows.push([r.deal_id || id || '', r.id, r.payment_date?.split('T')[0] || r.payment_date || '', r.amount, r.payment_mode || '', '', '', '', r.notes || ''])
      }
    })
    const csv = [headers.join(',')].concat(rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${id || 'all'}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadServerCsv = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const resp = await paymentsAPI.ledgerCsv(filters)
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_deal_${id || 'all'}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download server CSV', err)
      toast.error('Failed to download server CSV')
    }
  }

  const downloadServerPdf = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const resp = await paymentsAPI.ledgerPdf(filters)
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_deal_${id || 'all'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download server PDF', err)
      toast.error('Failed to download server PDF')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      <div className="bg-white border-b border-slate-200 w-full">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
              <p className="text-sm text-slate-500 mt-1">Track payments for deal #{id}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/deals/${id}`)} 
                className="flex items-center rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200  border border-slate-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Deal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded border border-slate-200 p-6">
              <h3 className="text-lg font-medium mb-4 text-slate-900">Add Payment</h3>
              {!isAuthed ? (
                <div className="text-sm text-slate-600">Please log in to add payments.</div>
              ) : (
                <div>
                  <button 
                    onClick={() => router.push(`/deals/${id}/add-payment`)} 
                    className="flex items-center rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 "
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium mb-4">Payments</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select value={ledgerFilters.payment_mode} onChange={e => setLedgerFilters(prev => ({ ...prev, payment_mode: e.target.value }))} className="border rounded px-3 py-2 text-sm h-10 min-w-[140px]">
                  <option value="">All modes</option>
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
                <select value={ledgerFilters.party_type} onChange={e => setLedgerFilters(prev => ({ ...prev, party_type: e.target.value }))} className="border rounded px-3 py-2 text-sm h-10 min-w-[140px]">
                  <option value="">All parties</option>
                  <option value="owner">Owner</option>
                  <option value="buyer">Buyer</option>
                  <option value="investor">Investor</option>
                </select>
                <select value={ledgerFilters.payment_type} onChange={e => setLedgerFilters(prev => ({ ...prev, payment_type: e.target.value }))} className="border rounded px-3 py-2 text-sm h-10 min-w-[140px]">
                  <option value="">All types</option>
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
                <input placeholder="Party ID" value={ledgerFilters.party_id} onChange={e => setLedgerFilters(prev => ({ ...prev, party_id: e.target.value }))} className="border rounded px-3 py-2 text-sm h-10 w-28" />
                <button onClick={runLedger} className="flex items-center rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white h-10">Run Ledger</button>
                <button onClick={exportLedgerCSV} className="flex items-center rounded bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 h-10">Export CSV</button>
                <button onClick={downloadServerCsv} disabled={!isAuthed} title={!isAuthed ? 'Login required to download server CSV' : 'Download CSV from server'} className={`flex items-center rounded px-4 py-2 text-sm font-medium h-10 ${isAuthed ? 'bg-white text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  Download CSV (server)
                </button>
                <button onClick={downloadServerPdf} disabled={!isAuthed} title={!isAuthed ? 'Login required to download server PDF' : 'Download PDF from server'} className={`flex items-center rounded px-4 py-2 text-sm font-medium h-10 ${isAuthed ? 'bg-white text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  Download PDF (server)
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-200 mb-4">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-slate-600">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <p className="text-slate-500">No payments recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {payments.map(p => (
                  <div key={p.id} className="bg-white rounded border border-slate-200 p-4 ">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900">₹{Number(p.amount).toLocaleString()} <span className="text-xs font-normal text-slate-500">{p.currency || 'INR'}</span></h4>
                            <div className="text-xs text-slate-500">{p.payment_date?.split('T')[0] || p.payment_date} • ID: #{p.id}</div>
                            {p.reference && <div className="text-xs text-slate-500">Reference: {p.reference}</div>}
                          </div>
                          <div className="text-right text-sm text-slate-500">{getParticipantLabel({ party_type: p.party_type, party_id: p.party_id, party_name: p.party_name })}<div className="text-xs">Created by: {p.created_by || '-'}</div></div>
                        </div>
                        <div className="mt-3 text-sm text-slate-700">
                          <div><strong>Mode:</strong> {p.payment_mode || '-'}</div>
                          <div><strong>Reference:</strong> {p.reference || '-'}</div>
                          <div className="mt-2"><strong>Notes:</strong> <span className="text-slate-600">{p.notes ? p.notes : '-'}</span></div>
                          {p.parties && p.parties.length > 0 && (
                            <div className="mt-3 border-t pt-3 text-sm text-slate-700">
                              <strong>Party splits:</strong>
                              <ul className="mt-2 space-y-1">
                                {p.parties.map(pp => (
                                  <li key={`pp-${pp.id}`} className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">{getParticipantLabel(pp)} {pp.percentage != null ? `• ${pp.percentage}%` : ''}</div>
                                    <div className="text-sm font-medium">{pp.amount != null ? `₹${Number(pp.amount).toLocaleString()}` : (pp.percentage != null ? `~₹${Number(((pp.percentage||0)/100)*p.amount).toLocaleString()}` : '-')}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-36 flex flex-col items-end gap-2">
                        <button onClick={() => handleAnnotateClick(p)} className="w-full inline-flex justify-center rounded bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Annotate</button>
                        <button onClick={() => router.push(`/deals/${id}/payment/${p.id}`)} className="w-full inline-flex justify-center rounded bg-white px-3 py-1 text-sm font-medium text-indigo-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">View proofs</button>
                        <label className="w-full flex items-center justify-center cursor-pointer">
                          <input type="file" className="hidden" onChange={(e) => handleProofUpload(p.id, e.target.files[0])} />
                          <span className={`w-full inline-flex justify-center rounded px-3 py-1 text-sm font-medium ${uploading ? 'bg-slate-500 text-slate-200' : 'bg-white text-slate-900'} ring-1 ring-inset ring-slate-200 hover:bg-slate-50`}>{uploading ? 'Uploading...' : 'Upload Proof'}</span>
                        </label>
                        <button onClick={async () => {
                          if (!confirm('Delete this payment and its proofs?')) return
                          try {
                            await paymentsAPI.delete(id, p.id)
                            toast.success('Deleted')
                            fetchPayments()
                          } catch {
                            toast.error('Delete failed')
                          }
                        }} className="w-full inline-flex justify-center rounded bg-white px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-inset ring-slate-200 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ledgerResults.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium mb-2">Ledger Results ({ledgerResults.length})</h4>
                <div className="space-y-3">
                  {ledgerResults.map(r => (
                    <div key={`l-${r.id}`} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">₹{Number(r.amount).toLocaleString()} • {r.payment_date?.split('T')[0] || r.payment_date}</div>
                          <div className="text-xs text-slate-500">{r.party_type} {r.party_id ? `#${r.party_id}` : ''} • {r.payment_mode}</div>
                        </div>
                        <div>
                          <button onClick={() => router.push(`/deals/${r.deal_id}/payment/${r.id}`)} className="text-sm text-indigo-600">Open</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Notes Input Modal */}
      <InputModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onConfirm={annotate}
        title="Add Payment Notes"
        message={`Add notes for payment of ₹${paymentToAnnotate?.amount?.toLocaleString('en-IN') || '0'}`}
        placeholder="Enter notes for this payment..."
        confirmText="Save Notes"
        cancelText="Cancel"
      />
    </div>
  )
}
 
