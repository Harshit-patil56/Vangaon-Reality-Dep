import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import { paymentsAPI, dealAPI } from '../../../lib/api'
import { getToken, getUser, logout } from '../../../lib/auth'
import toast from 'react-hot-toast'
import Navbar from '../../../components/layout/Navbar'

export default function AddPaymentPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ amount: '', payment_date: '', payment_mode: '', reference: '', notes: '', status: 'pending', due_date: '', payment_type: 'other' })
  const [customMode, setCustomMode] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [participants, setParticipants] = useState([])
  const [parties, setParties] = useState([{ party_type: 'owner', party_id: '', percentage: '', amount: '', party_name: '', manual_amount: false }])
  const [saving, setSaving] = useState(false)
  const [forceSave, setForceSave] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [totalPercentage, setTotalPercentage] = useState(0)
  const [totalPartiesAmount, setTotalPartiesAmount] = useState(0)
  const [computedAmountsPreview, setComputedAmountsPreview] = useState([])
  const amountRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => { if (amountRef.current) amountRef.current.focus() }, [amountRef, mounted])

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  useEffect(() => {
    if (!id) return
    (async () => {
      try {
        const res = await dealAPI.getById(id)
        const data = res.data || {}
        const owners = data.owners || []
        const investors = data.investors || []
        const buyers = data.buyers || []
        const ownerRows = owners.map(o => ({ party_type: 'owner', id: o.id, name: o.name || '', role: 'owner' }))
        const investorRows = investors.map(i => ({ party_type: 'investor', id: i.id, name: i.investor_name || '', role: 'investor' }))
        const buyerRows = buyers.map(b => ({ party_type: 'buyer', id: b.id, name: b.name || '', role: 'buyer' }))
        setParticipants([...ownerRows, ...investorRows, ...buyerRows])
      } catch {
        // ignore
      }
    })()
  }, [id])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handlePartyChange = (index, key, value) => {
    setParties(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [key]: value }
      return copy
    })
  }
  const addParty = () => setParties(prev => ([...prev, { party_type: 'owner', party_id: '', amount: '', percentage: '', party_name: '', manual_amount: false }]))
  const removeParty = (index) => setParties(prev => prev.filter((_, i) => i !== index))

  const importParticipants = () => {
    if (!participants || participants.length === 0) { toast('No participants to import'); return }
    const rows = participants.map(p => ({ party_type: p.party_type, party_id: p.id, party_name: p.name || '', percentage: '', amount: '', manual_amount: false }))
    setParties(rows)
  }

  // Compute totals and an amounts preview from percentages when form.amount or parties change
  useEffect(() => {
    const amt = parseFloat(form.amount || 0) || 0
    // total percentage
    let tp = 0
    let tpa = 0
    parties.forEach(p => {
      const pct = parseFloat(p.percentage)
      const a = parseFloat(p.amount)
      if (!isNaN(pct)) tp += pct
      if (!isNaN(a)) tpa += a
    })
    // compute amounts from percentages (penny-accurate)
    const computed = []
    if (amt > 0) {
      // prepare entries for those with percentage
  const entries = parties.map((p, i) => ({ idx: i, pct: (p.percentage !== '' ? parseFloat(p.percentage) : null) }))
      const percentEntries = entries.filter(e => typeof e.pct === 'number' && !isNaN(e.pct))
  if (percentEntries.length > 0) {
        const amountCents = Math.round(amt * 100)
        // raw cents and fractional remainder for sorting
        const raws = percentEntries.map(e => {
          const raw = (e.pct / 100) * amountCents
          const floor = Math.floor(raw)
          return { idx: e.idx, floor, rem: raw - floor }
        })
        const sumFloor = raws.reduce((s, r) => s + r.floor, 0)
        let remainder = amountCents - sumFloor
        // distribute remainder by highest fractional rem
  raws.sort((a, b) => b.rem - a.rem)
        const assigned = {}
        for (let r of raws) assigned[r.idx] = r.floor
        for (let j = 0; j < remainder; j++) {
          const target = raws[j % raws.length].idx
          assigned[target] = (assigned[target] || 0) + 1
        }
        // build computed array
        percentEntries.forEach(e => {
          const cents = assigned[e.idx] || 0
          computed[e.idx] = +(cents / 100).toFixed(2)
        })
      }
    }
    setComputedAmountsPreview(computed)
    setTotalPercentage(+(tp).toFixed(2))
    setTotalPartiesAmount(+(tpa).toFixed(2))
  }, [form.amount, parties])

  const splitEqually = () => {
    const n = parties.length || 1
    if (n <= 0) return
    const base = Math.floor((100 / n) * 100) / 100
    let remainder = Math.round((100 - base * n) * 100) / 100
  const next = parties.map((pt) => {
      let pct = base
      if (remainder > 0) { pct = +(pct + 0.01).toFixed(2); remainder = +(remainder - 0.01).toFixed(2) }
      return { ...pt, percentage: pct.toString(), amount: '' }
    })
    setParties(next)
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (saving) return
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.payment_date) { toast.error('Select a payment date'); return }
    setSaving(true)
    try {
      const preparedParties = parties.map(p => ({ party_type: p.party_type, party_id: p.party_id || null, amount: p.amount ? parseFloat(p.amount) : null, percentage: p.percentage ? parseFloat(p.percentage) : null }))
      const percentProvided = preparedParties.some(p => typeof p.percentage === 'number')
      const amountProvided = preparedParties.some(p => typeof p.amount === 'number')
      const paymentAmount = parseFloat(form.amount || 0)

      if (percentProvided) {
        const totalPct = preparedParties.reduce((s, x) => s + (typeof x.percentage === 'number' ? x.percentage : 0), 0)
        if (Math.abs(totalPct - 100) > 0.01 && !forceSave) {
          setFieldErrors({ form: 'Party percentage must sum to 100%. Check "Force save" to override.' })
          return
        }
      }

      let computedParties = preparedParties.map(p => ({ ...p }))
      if (percentProvided && !amountProvided) {
        computedParties = computedParties.map(p => ({ ...p, amount: (typeof p.percentage === 'number' ? +((p.percentage / 100) * paymentAmount).toFixed(2) : null) }))
      }

      if (amountProvided) {
        const totalPartyAmount = computedParties.reduce((s, x) => s + (typeof x.amount === 'number' ? x.amount : 0), 0)
        if (Math.abs(totalPartyAmount - paymentAmount) > 0.01 && !forceSave) {
          setFieldErrors({ form: 'Party sums do not match payment amount. Check "Force save" to override or adjust amounts.' })
          return
        }
      }

      setFieldErrors({})
      const params = {}
      if (forceSave) params.force = true
      const payload = { 
        ...form, 
        amount: parseFloat(form.amount), 
        parties: computedParties,
        status: form.status === 'paid' ? 'completed' : (form.status || 'pending')
      }
      if ((form.payment_mode === 'other' || !form.payment_mode) && customMode) payload.payment_mode = customMode

      // Check if this is an investor-to-owner payment for real-time tracking
      const hasInvestorPayer = computedParties.some(p => p.party_type === 'investor' && p.party_id)
      const hasOwnerRecipient = computedParties.some(p => p.party_type === 'owner' && p.party_id)
      const isInvestorToOwnerPayment = hasInvestorPayer && hasOwnerRecipient && computedParties.length === 2

      let resp
      if (isInvestorToOwnerPayment) {
        // Use specialized endpoint for investor-to-owner payments
        const investorParty = computedParties.find(p => p.party_type === 'investor' && p.party_id)
        const ownerParty = computedParties.find(p => p.party_type === 'owner' && p.party_id)
        
        const specializedPayload = {
          investor_id: investorParty.party_id,
          owner_id: ownerParty.party_id,
          amount: parseFloat(form.amount),
          payment_date: form.payment_date,
          payment_mode: form.payment_mode || customMode || 'cash',
          reference: form.reference || '',
          notes: form.notes || '',
          status: form.status === 'paid' ? 'completed' : (form.status || 'pending')
        }
        
        try {
          resp = await paymentsAPI.createInvestorToOwnerPayment(id, specializedPayload)
          toast.success('Investor to Owner payment recorded and tracked')
        } catch (error) {
          console.warn('Specialized endpoint failed, falling back to regular payment creation:', error)
          // Fallback to regular payment creation
          resp = await paymentsAPI.create(id, payload, { params })
          toast.success('Payment recorded')
        }
      } else {
        // Use regular payment creation for other types
        resp = await paymentsAPI.create(id, payload, { params })
        toast.success('Payment recorded')
      }
      
      const newPaymentId = resp?.data?.payment_id

      if (receiptFile && newPaymentId) {
        try {
          const fd = new FormData()
          fd.append('proof', receiptFile)
          await paymentsAPI.uploadProof(id, newPaymentId, fd)
          toast.success('Receipt uploaded')
        } catch {
          toast.error('Receipt upload failed')
        }
      }

  // reset and navigate back to the Deal Details page payments section
  setForm({ amount: '', payment_date: '', payment_mode: '', reference: '', notes: '', status: 'pending', due_date: '' })
  setReceiptFile(null)
  setCustomMode('')
  setParties([{ party_type: 'owner', party_id: '', percentage: '', amount: '' }])
  setForceSave(false)
  // Navigate back to Deal Details page with payments section active
  router.push(`/deals/${id}?section=payments`)

      } catch (err) {
      try {
        const resp = err?.response
        const data = resp?.data
        if (data && data.error === 'party_amount_mismatch') {
          toast.error(`Party sum mismatch: payment ${data.payment_amount} vs parties ${data.parties_total}`)
        } else if (data && data.error === 'party_percentage_mismatch') {
          toast.error(`Party percentage mismatch: total ${data.total_percentage}`)
        } else if (resp && resp.status) {
          const msg = (data && (data.error || data.message)) || resp.statusText || `Server error ${resp.status}`
          toast.error(`${resp.status}: ${msg}`)
        } else if (err && err.message) {
          toast.error(err.message)
        } else {
          toast.error('Failed to record payment')
        }
      } catch {
        toast.error('Failed to prepare parties')
      }
    } finally {
      setSaving(false)
    }
  }

  const isAuthed = mounted && !!getToken()

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      {/* Navigation - Full Width */}
      <div className="bg-white shadow-sm border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => router.push({ pathname: '/deals/payments', query: { id } })}
                className="mr-3 p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-semibold text-slate-900">Add Payment</h1>
            </div>
            <button
              type="button"
              onClick={() => router.push({ pathname: '/deals/payments', query: { id } })}
              className="px-4 py-2 text-sm border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
          {!isAuthed ? (
            <div className="text-sm text-slate-600">Please log in to add payments.</div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input 
                    ref={amountRef} 
                    name="amount" 
                    value={form.amount} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                  <input 
                    name="payment_date" 
                    type="date" 
                    value={form.payment_date} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select 
                    name="payment_mode" 
                    value={form.payment_mode || ''} 
                    onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, payment_mode: v })); if (v !== 'other') setCustomMode('') }} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="">Select mode</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                  {form.payment_mode === 'other' && (
                    <input 
                      placeholder="Specify payment mode" 
                      value={customMode} 
                      onChange={e => setCustomMode(e.target.value)} 
                      className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                  <select 
                    name="payment_type" 
                    value={form.payment_type || ''} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="">Select type</option>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select 
                    name="status" 
                    value={form.status || 'pending'} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                  </select>
                  {form.status === 'pending' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                      <input 
                        name="due_date" 
                        type="date" 
                        value={form.due_date} 
                        onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                <input 
                  name="reference" 
                  value={form.reference} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  name="notes" 
                  value={form.notes} 
                  onChange={handleChange} 
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Receipt</span>
                <input 
                  type="file" 
                  id="receipt-upload"
                  accept=".pdf,.jpg,.jpeg,.png" 
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)} 
                  className="hidden"
                />
                <label
                  htmlFor="receipt-upload"
                  className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-700 text-xs rounded cursor-pointer hover:bg-slate-200"
                >
                  Choose File
                </label>
                <span className="text-xs text-slate-500">
                  {receiptFile ? receiptFile.name : 'No file chosen'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parties</label>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <div>Total: {totalPercentage}%</div>
                      <div>₹{totalPartiesAmount.toLocaleString()}</div>
                    </div>
                  {parties.map((pt, idx) => (
                    <div key={`p-${idx}`} className="flex items-center gap-2 p-2 border rounded bg-white">
                      <div className="w-24">
                        <select value={pt.party_type || 'other'} onChange={e => { const t = e.target.value; handlePartyChange(idx, 'party_type', t); handlePartyChange(idx, 'party_id', ''); handlePartyChange(idx, 'party_name', '') }} className="w-full border rounded p-2 text-sm">
                          <option value="owner">Owner</option>
                          <option value="buyer">Buyer</option>
                          <option value="investor">Investor</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="flex-1 min-w-0">
                        {pt.party_type && pt.party_type !== 'other' ? (
                          <select value={pt.party_id || ''} onChange={e => { const val = e.target.value; handlePartyChange(idx, 'party_id', val); const found = participants.find(p => String(p.id) === String(val) && p.party_type === pt.party_type); handlePartyChange(idx, 'party_name', found ? found.name : '') }} className="w-full border rounded p-2 text-sm">
                            <option value="">-- select {pt.party_type} --</option>
                            {participants.filter(pp => pp.party_type === pt.party_type).map(pp => (
                              <option key={`op-${pp.id}`} value={pp.id}>{`#${pp.id} — ${pp.name || 'Unnamed'} • ${pp.role || pp.party_type}`}</option>
                            ))}
                          </select>
                        ) : (
                          <input placeholder="Party name (manual)" value={pt.party_name || ''} onChange={e => handlePartyChange(idx, 'party_name', e.target.value)} className="w-full border rounded p-2 text-sm" />
                        )}
                      </div>

                      <div className="w-20">
                        <input placeholder="%" value={pt.percentage} onChange={e => handlePartyChange(idx, 'percentage', e.target.value)} className="w-full border rounded p-2 text-sm text-center" />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center text-sm"><input type="checkbox" checked={!!pt.manual_amount} onChange={e => handlePartyChange(idx, 'manual_amount', e.target.checked)} className="mr-2" />Custom</label>
                        <input placeholder="Amount" value={pt.amount} onChange={e => handlePartyChange(idx, 'amount', e.target.value)} className={`w-28 border rounded p-2 text-sm ${pt.manual_amount ? '' : 'bg-slate-50'}`} disabled={!pt.manual_amount} />
                      </div>

                      <div className="flex-shrink-0">
                        <button type="button" onClick={() => removeParty(idx)} className="inline-flex items-center rounded px-2 py-1 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-100 hover:bg-red-50">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button type="button" onClick={addParty} className="px-3 py-1 text-sm border border-slate-300 bg-white hover:bg-slate-50 rounded">Add party</button>
                  <button type="button" onClick={splitEqually} className="px-3 py-1 text-sm border border-slate-300 bg-white hover:bg-slate-50 rounded">Split equally</button>
                  <button type="button" onClick={importParticipants} className="px-3 py-1 text-sm border border-slate-300 bg-white hover:bg-slate-50 rounded">Import</button>
                  {computedAmountsPreview && computedAmountsPreview.length > 0 && (
                    <button type="button" onClick={() => {
                      setParties(prev => prev.map((p, i) => {
                        const val = computedAmountsPreview[i]
                        if (typeof val === 'number') {
                          return { ...p, amount: val.toFixed(2), manual_amount: true }
                        }
                        return p
                      }))
                    }} className="px-3 py-1 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded">Apply computed</button>
                  )}
                </div>
              </div>

              {fieldErrors.form && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{fieldErrors.form}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <label className="inline-flex items-center">
                  <input 
                    type="checkbox" 
                    checked={forceSave} 
                    onChange={e => setForceSave(e.target.checked)} 
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded" 
                  />
                  <span className="ml-2 text-sm text-slate-700">Force save if party sums mismatch</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => { if (id) router.push(`/deals/${id}?section=payments`); else router.back() }} 
                    className="px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className={`px-4 py-2 text-white rounded ${
                      saving 
                        ? 'bg-slate-400 cursor-not-allowed' 
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save payment'}
                  </button>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
