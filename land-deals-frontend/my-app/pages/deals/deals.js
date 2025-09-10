// pages/deals/index.js - Enhanced Professional Deals Listing Page
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout, isAuthenticated } from '../../lib/auth'
import { dealAPI } from '../../lib/api'
import { CreateButton, EditButton, DeleteButton } from '../../components/common/PermissionButton'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Navbar from '../../components/layout/Navbar'

export default function DealsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDeals = useCallback(async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data)
    } catch (err) {
      if (err?.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch deals')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(getUser())
    fetchDeals()
  }, [fetchDeals, router])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Deals</h3>
          <p className="text-slate-600">Please wait while we fetch your deals</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">All Property Deals</h1>
                <p className="text-slate-600 mt-1">
                  Manage and view all your property transactions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-slate-100 px-3 py-2 rounded">
                <span className="text-sm font-medium text-slate-700">
                  {deals.length} deal{deals.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <CreateButton
                user={user}
                resource="deals"
                onClick={() => router.push('/deals/new')}
                className="flex items-center px-6 py-3 bg-slate-900 text-white rounded font-medium hover:bg-slate-800  "
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Deal
              </CreateButton>
              <Link href="/dashboard">
                <span className="flex items-center px-4 py-2 border border-slate-300 rounded  text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer ">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8">
        {deals.length === 0 ? (
          <div className="bg-white rounded  border border-slate-200 p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-900 mb-3">No deals found</h3>
            <p className="text-slate-600 mb-8">Get started by creating your first property deal to begin tracking your transactions.</p>
            <CreateButton
              user={user}
              resource="deals"
              onClick={() => router.push('/deals/new')}
              className="flex items-center px-6 py-3 border border-transparent rounded  text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 "
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Deal
            </CreateButton>
          </div>
        ) : (
          <div className="space-y-6">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="bg-white border border-slate-200 rounded hover:shadow-lg hover:border-slate-300 "
              >
                <Link href={`/deals/${deal.id}`}>
                  <div className="cursor-pointer">
                    {/* Main Deal Header */}
                    <div className="p-6 border-b border-slate-100">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-slate-900">
                              {deal.project_name}
                            </h3>
                            <span
                              className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                deal.status === 'open'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : deal.status === 'commission'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {deal.status === 'open' ? 'Active' : deal.status === 'commission' ? 'Commission' : 'Closed'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span><strong>Location:</strong> {(deal.district || deal.taluka || deal.village) ? `${deal.district || ''}${deal.district && deal.taluka ? ', ' : ''}${deal.taluka || ''}${(deal.village && (deal.district || deal.taluka)) ? ', ' : ''}${deal.village || ''}` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span><strong>Survey:</strong> {deal.survey_number || 'N/A'}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4" />
                              </svg>
                              <span><strong>Created:</strong> {new Date(deal.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Information Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        
                        {/* Property Details */}
                        <div className="bg-slate-50 rounded p-4">
                          <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                            <svg className="w-4 h-4 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Property Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">District:</span>
                              <span className="font-medium text-slate-900">{deal.district || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Taluka:</span>
                              <span className="font-medium text-slate-900">{deal.taluka || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Village:</span>
                              <span className="font-medium text-slate-900">{deal.village || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Total Area:</span>
                              <span className="font-medium text-slate-900">{deal.total_area || 'N/A'} sqft</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Created By:</span>
                              <span className="font-medium text-slate-900">{deal.created_by || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Information */}
                        <div className="bg-emerald-50 rounded p-4">
                          <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                            <svg className="w-4 h-4 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Financial Details
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600">Purchase Amount:</span>
                                <span className="font-bold text-lg text-slate-900">
                                  ₹{deal.purchase_amount?.toLocaleString('en-IN') || '0'}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Purchase Date:</span>
                                <span>{deal.purchase_date ? new Date(deal.purchase_date).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>
                            
                            {deal.selling_amount && (
                              <div className="pt-2 border-t border-emerald-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-emerald-700">Selling Amount:</span>
                                  <span className="font-bold text-lg text-emerald-800">
                                    ₹{deal.selling_amount?.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-emerald-600">
                                  <span>Profit/Loss:</span>
                                  <span className={`font-medium ${
                                    (deal.selling_amount - deal.purchase_amount) >= 0 
                                      ? 'text-emerald-700' 
                                      : 'text-red-600'
                                  }`}>
                                    ₹{((deal.selling_amount - deal.purchase_amount) || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="pt-2 border-t border-emerald-200">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Payment Mode:</span>
                                <span className="font-medium text-slate-900">{deal.payment_mode || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-slate-600">Cheque Date:</span>
                                <span className="font-medium text-slate-900">
                                  {deal.cheque_date ? new Date(deal.cheque_date).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information Row */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center text-slate-600">
                            <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span><strong>Owners:</strong> {deal.owners_count || 0} registered</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span><strong>Investors:</strong> {deal.investors_count || 0} involved</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span><strong>Documents:</strong> {deal.documents_count || 0} files</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Action Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>Deal ID: #{deal.id}</span>
                      <span>•</span>
                      <span><strong>Location:</strong> {(deal.district || deal.taluka || deal.village) ? `${deal.district || ''}${deal.district && deal.taluka ? ', ' : ''}${deal.taluka || ''}${(deal.village && (deal.district || deal.taluka)) ? ', ' : ''}${deal.village || ''}` : 'N/A'}</span>
                      <span>•</span>
                      <span><strong>Survey:</strong> {deal.survey_number || 'Not specified'}</span>
                      {deal.expenses_total && (
                        <>
                          <span>•</span>
                          <span className="flex items-center text-orange-600">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Expenses: ₹{deal.expenses_total?.toLocaleString('en-IN')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <EditButton
                        user={user}
                        resource="deals"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(`/deals/edit/${deal.id}`)
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded  flex items-center border border-blue-200 hover:border-blue-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Deal
                      </EditButton>
                      <DeleteButton
                        user={user}
                        resource="deals"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
                            try {
                              await dealAPI.delete(deal.id)
                              toast.success('Deal deleted successfully')
                              setDeals(deals.filter(d => d.id !== deal.id))
                            } catch {
                              toast.error('Failed to delete deal')
                            }
                          }
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-4 py-2 rounded  flex items-center border border-red-200 hover:border-red-300"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Deal
                      </DeleteButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
