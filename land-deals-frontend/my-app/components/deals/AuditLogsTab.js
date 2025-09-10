import { useState, useEffect, useCallback } from 'react'
import { dealAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function AuditLogsTab({ dealId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const response = await dealAPI.getLogs(dealId)
      setLogs(response.data || [])
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    if (dealId) {
      loadLogs()
    }
  }, [dealId, loadLogs])

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )
      case 'UPDATE':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        )
      case 'DELETE':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        )
      case 'STATUS_CHANGE':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const getActionDescription = (log) => {
    const entityName = log.entity_name || `${log.entity_type} #${log.entity_id}`
    
    switch (log.action) {
      case 'CREATE':
        return `Created ${entityName}`
      case 'UPDATE':
        return `Updated ${entityName}`
      case 'DELETE':
        return `Deleted ${entityName}`
      case 'STATUS_CHANGE':
        return `Changed status of ${entityName}`
      default:
        return `${log.action} ${entityName}`
    }
  }

  const renderChanges = (changes) => {
    if (!changes || typeof changes !== 'object') return null

    return (
      <div className="mt-2 text-xs text-gray-600">
        <div className="bg-gray-50 rounded p-2">
          <h5 className="font-medium text-gray-700 mb-1">Changes:</h5>
          <div className="space-y-1">
            {Object.entries(changes).map(([field, change]) => {
              if (typeof change === 'object' && change.old !== undefined && change.new !== undefined) {
                return (
                  <div key={field} className="flex flex-wrap items-center gap-1">
                    <span className="font-medium">{field}:</span>
                    <span className="bg-red-100 text-red-800 px-1 rounded">{change.old || 'null'}</span>
                    <span>→</span>
                    <span className="bg-green-100 text-green-800 px-1 rounded">{change.new || 'null'}</span>
                  </div>
                )
              } else {
                return (
                  <div key={field} className="flex items-center gap-1">
                    <span className="font-medium">{field}:</span>
                    <span>{JSON.stringify(change)}</span>
                  </div>
                )
              }
            })}
          </div>
        </div>
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
      <div>
        <h3 className="text-lg font-medium text-gray-900">Audit History</h3>
        <p className="text-sm text-gray-500">Complete history of changes made to this deal</p>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-600">Changes and activities will appear here.</p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {logs.map((log, logIdx) => (
              <li key={log.id}>
                <div className="relative pb-8">
                  {logIdx !== logs.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{log.user_name || 'Unknown User'}</span>{' '}
                          {getActionDescription(log)}
                        </p>
                        {renderChanges(log.changes)}
                        {log.ip_address && (
                          <div className="mt-1 text-xs text-gray-500">
                            From: {log.ip_address}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
