import { useState, useEffect, useCallback } from 'react'
import { dealAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'

export default function OffersTab({ dealId, user, deal }) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOffer, setNewOffer] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    offer_amount: '',
    offer_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    notes: ''
  })

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Loading offers for dealId:', dealId)
      const response = await dealAPI.getOffers(dealId)
      console.log('Offers response:', response)
      setOffers(response.data || response || [])
    } catch (error) {
      console.error('Failed to load offers:', error)
      console.error('Error details:', error.response?.data)
      toast.error('Failed to load offers')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    if (dealId) {
      loadOffers()
    }
  }, [dealId, loadOffers])

  const handleSubmitOffer = async (e) => {
    e.preventDefault()
    
    if (!hasPermission(user, PERMISSIONS.DEALS_EDIT)) {
      toast.error('You do not have permission to create offers')
      return
    }

    try {
      await dealAPI.createOffer(dealId, newOffer)
      toast.success('Offer created successfully')
      setShowAddForm(false)
      setNewOffer({
        buyer_name: '',
        buyer_email: '',
        buyer_phone: '',
        offer_amount: '',
        offer_date: new Date().toISOString().split('T')[0],
        valid_until: '',
        notes: ''
      })
      loadOffers()
    } catch (error) {
      console.error('Failed to create offer:', error)
      toast.error('Failed to create offer')
    }
  }

  const handleUpdateOfferStatus = async (offerId, status) => {
    if (!hasPermission(user, PERMISSIONS.DEALS_EDIT)) {
      toast.error('You do not have permission to update offers')
      return
    }

    try {
      await dealAPI.updateOfferStatus(offerId, { status })
      toast.success(`Offer ${status.toLowerCase()} successfully`)
      loadOffers()
    } catch (error) {
      console.error('Failed to update offer:', error)
      toast.error('Failed to update offer')
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Accepted': return 'bg-green-100 text-green-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Countered': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (deal?.status !== 'For Sale') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Offers Not Available</h3>
        <p className="text-gray-600">This property must be marked as &quot;For Sale&quot; to receive offers.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Offers</h3>
          <p className="text-sm text-gray-500">Manage buyer offers for this property</p>
        </div>
        {hasPermission(user, PERMISSIONS.DEALS_EDIT) && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Offer
          </button>
        )}
      </div>

      {/* Add Offer Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <form onSubmit={handleSubmitOffer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOffer.buyer_name}
                  onChange={(e) => setNewOffer({ ...newOffer, buyer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Amount *
                </label>
                <input
                  type="number"
                  required
                  value={newOffer.offer_amount}
                  onChange={(e) => setNewOffer({ ...newOffer, offer_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ appearance: 'textfield' }}
                  placeholder="₹"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Email
                </label>
                <input
                  type="email"
                  value={newOffer.buyer_email}
                  onChange={(e) => setNewOffer({ ...newOffer, buyer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Phone
                </label>
                <input
                  type="tel"
                  value={newOffer.buyer_phone}
                  onChange={(e) => setNewOffer({ ...newOffer, buyer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Date *
                </label>
                <input
                  type="date"
                  required
                  value={newOffer.offer_date}
                  onChange={(e) => setNewOffer({ ...newOffer, offer_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={newOffer.valid_until}
                  onChange={(e) => setNewOffer({ ...newOffer, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={newOffer.notes}
                onChange={(e) => setNewOffer({ ...newOffer, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional notes about the offer..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
          <p className="text-gray-600">Start by adding an offer from a potential buyer.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {offers.map((offer) => (
              <li key={offer.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">{offer.buyer_name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">Amount:</span> {formatCurrency(offer.offer_amount)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Date:</span> {formatDate(offer.offer_date)}
                      </div>
                      {offer.valid_until && (
                        <div>
                          <span className="font-medium text-gray-900">Valid Until:</span> {formatDate(offer.valid_until)}
                        </div>
                      )}
                      {(offer.buyer_email || offer.buyer_phone) && (
                        <div>
                          <span className="font-medium text-gray-900">Contact:</span>{' '}
                          {offer.buyer_email && <span>{offer.buyer_email}</span>}
                          {offer.buyer_email && offer.buyer_phone && <span>, </span>}
                          {offer.buyer_phone && <span>{offer.buyer_phone}</span>}
                        </div>
                      )}
                    </div>
                    {offer.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Notes:</span> {offer.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                {hasPermission(user, PERMISSIONS.DEALS_EDIT) && offer.status === 'Pending' && (
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleUpdateOfferStatus(offer.id, 'Accepted')}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleUpdateOfferStatus(offer.id, 'Rejected')}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateOfferStatus(offer.id, 'Countered')}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Counter
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
