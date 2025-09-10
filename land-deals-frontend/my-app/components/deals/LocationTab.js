import { useState, useEffect } from 'react'
import { dealAPI } from '../../lib/api'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'

export default function LocationTab({ dealId, user, deal }) {
  const [location, setLocation] = useState({
    latitude: deal?.latitude || '',
    longitude: deal?.longitude || ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (deal) {
      setLocation({
        latitude: deal.latitude || '',
        longitude: deal.longitude || ''
      })
    }
  }, [deal])

  const handleSaveLocation = async () => {
    if (!hasPermission(user, PERMISSIONS.DEALS_EDIT)) {
      toast.error('You do not have permission to update location')
      return
    }

    if (!location.latitude || !location.longitude) {
      toast.error('Both latitude and longitude are required')
      return
    }

    try {
      setSaving(true)
      await dealAPI.updateLocation(dealId, location)
      toast.success('Location updated successfully')
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update location:', error)
      toast.error('Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        })
        toast.success('Current location retrieved')
      },
      (error) => {
        console.error('Error getting location:', error)
        toast.error('Failed to get current location')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const generateMapUrl = () => {
    if (!location.latitude || !location.longitude) return null
    
    // Generate Google Maps URL
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
  }

  const generateDirectionsUrl = () => {
    if (!location.latitude || !location.longitude) return null
    
    return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
  }

  const mapUrl = generateMapUrl()
  const hasLocation = location.latitude && location.longitude

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Location</h3>
          <p className="text-sm text-gray-500">Property geolocation and map view</p>
        </div>
        {hasPermission(user, PERMISSIONS.DEALS_EDIT) && (
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Location
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setLocation({
                      latitude: deal?.latitude || '',
                      longitude: deal?.longitude || ''
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLocation}
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location Form */}
      {isEditing && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.latitude}
                  onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ appearance: 'textfield' }}
                  placeholder="e.g., 19.0760"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.longitude}
                  onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ appearance: 'textfield' }}
                  placeholder="e.g., 72.8777"
                />
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleGetCurrentLocation}
                className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use Current Location
              </button>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              <p>You can get coordinates from Google Maps by right-clicking on a location</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Display */}
      {hasLocation ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Property Location</h4>
                <p className="text-xs text-gray-500">
                  {location.latitude}, {location.longitude}
                </p>
              </div>
              <a
                href={generateDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Directions
              </a>
            </div>
            
            <div className="relative h-96">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property Location Map"
              />
            </div>
          </div>
          
          {/* Location Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Coordinates</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Latitude: {location.latitude}</div>
                <div>Longitude: {location.longitude}</div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h5>
              <div className="space-y-2">
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-indigo-600 hover:text-indigo-800"
                >
                  View in Google Maps →
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`)
                    toast.success('Coordinates copied to clipboard')
                  }}
                  className="block text-sm text-indigo-600 hover:text-indigo-800 text-left"
                >
                  Copy Coordinates →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Location Set</h3>
          <p className="text-gray-600 mb-4">Add coordinates to display the property location on a map.</p>
          {hasPermission(user, PERMISSIONS.DEALS_EDIT) && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Location
            </button>
          )}
        </div>
      )}
    </div>
  )
}
