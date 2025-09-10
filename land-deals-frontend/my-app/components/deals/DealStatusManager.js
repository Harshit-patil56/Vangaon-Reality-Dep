import { useState } from 'react'
import { dealAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function DealStatusManager({ deal, onUpdate }) {
  const [showSellingForm, setShowSellingForm] = useState(false)
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [sellingData, setSellingData] = useState({
    asking_price: '',
    price_negotiable: true,
    listing_notes: ''
  })
  const [newStatus, setNewStatus] = useState(deal?.status || '')
  const [updating, setUpdating] = useState(false)

  const markForSelling = async (e) => {
    e.preventDefault()
    
    if (!sellingData.asking_price) {
      toast.error('Please enter an asking price')
      return
    }

    try {
      setUpdating(true)
      await dealAPI.updateSellingStatus(deal.id, {
        status: 'For Sale',
        asking_price: parseFloat(sellingData.asking_price),
        price_negotiable: sellingData.price_negotiable,
        listing_notes: sellingData.listing_notes
      })
      
      toast.success('Property marked for sale successfully')
      setShowSellingForm(false)
      setSellingData({
        asking_price: '',
        price_negotiable: true,
        listing_notes: ''
      })
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Failed to mark for sale:', error)
      toast.error('Failed to mark property for sale')
    } finally {
      setUpdating(false)
    }
  }

  const updateStatus = async (e) => {
    e.preventDefault()
    
    if (newStatus === deal.status) {
      toast.error('Status is already set to this value')
      return
    }

    try {
      setUpdating(true)
      
      if (newStatus === 'For Sale') {
        // If changing to For Sale, need selling details
        setShowSellingForm(true)
        setShowStatusForm(false)
        return
      }

      await dealAPI.updateSellingStatus(deal.id, { status: newStatus })
      toast.success('Deal status updated successfully')
      setShowStatusForm(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update deal status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'On Hold':
        return 'bg-gray-100 text-gray-800'
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      case 'For Sale':
        return 'bg-purple-100 text-purple-800'
      case 'Sold':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPrice = (price) => {
    if (!price) return ''
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price)
  }

  const statusOptions = [
    'Under Review',
    'In Progress', 
    'Completed',
    'On Hold',
    'Cancelled',
    'For Sale',
    'Sold'
  ]

  return (
    <div className="space-y-4">
      {/* Current Status Display */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Current Status</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deal?.status)}`}>
              {deal?.status || 'Unknown'}
            </span>
            {deal?.asking_price && (
              <span className="text-sm text-gray-600">
                Listed at {formatPrice(deal.asking_price)}
                {deal.price_negotiable && ' (Negotiable)'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowStatusForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
        >
          Change Status
        </button>
      </div>

      {/* Quick Actions */}
      {deal?.status !== 'For Sale' && deal?.status !== 'Sold' && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowSellingForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
          >
            Mark for Sale
          </button>
        </div>
      )}

      {/* Status Change Form */}
      {showStatusForm && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium mb-4">Change Deal Status</h4>
          <form onSubmit={updateStatus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updating}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
              <button
                type="button"
                onClick={() => setShowStatusForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selling Form */}
      {showSellingForm && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium mb-4">Mark Property for Sale</h4>
          <form onSubmit={markForSelling} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  value={sellingData.asking_price}
                  onChange={(e) => setSellingData({ ...sellingData, asking_price: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ appearance: 'textfield' }}
                  placeholder="Enter asking price"
                  min="0"
                  required
                />
              </div>
              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="price_negotiable"
                  checked={sellingData.price_negotiable}
                  onChange={(e) => setSellingData({ ...sellingData, price_negotiable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="price_negotiable" className="ml-2 text-sm text-gray-700">
                  Price is negotiable
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Notes
              </label>
              <textarea
                value={sellingData.listing_notes}
                onChange={(e) => setSellingData({ ...sellingData, listing_notes: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Additional details about the property, features, etc."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updating}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {updating ? 'Marking for Sale...' : 'Mark for Sale'}
              </button>
              <button
                type="button"
                onClick={() => setShowSellingForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Listing Info */}
      {deal?.status === 'For Sale' && deal?.listing_notes && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h5 className="font-medium text-purple-900 mb-2">Listing Notes</h5>
          <p className="text-purple-800 text-sm">{deal.listing_notes}</p>
        </div>
      )}
    </div>
  )
}
