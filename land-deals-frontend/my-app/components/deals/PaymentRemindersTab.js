import { useState, useEffect, useCallback } from 'react'
import { dealAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function PaymentRemindersTab({ dealId }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    due_date: '',
    reminder_date: '',
    amount: '',
    priority: 'medium',
    notes: ''
  })

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await dealAPI.getPaymentReminders(dealId)
      setReminders(response.data || [])
    } catch (error) {
      console.error('Failed to load payment reminders:', error)
      toast.error('Failed to load payment reminders')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    if (dealId) {
      loadReminders()
    }
  }, [dealId, loadReminders])

  const createReminder = async (e) => {
    e.preventDefault()
    
    if (!formData.description || !formData.due_date || !formData.reminder_date) {
      toast.error('Please fill in required fields')
      return
    }

    if (new Date(formData.reminder_date) > new Date(formData.due_date)) {
      toast.error('Reminder date should be before due date')
      return
    }

    try {
      await dealAPI.createPaymentReminder(dealId, {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null
      })
      
      toast.success('Payment reminder created successfully')
      setShowCreateForm(false)
      setFormData({
        description: '',
        due_date: '',
        reminder_date: '',
        amount: '',
        priority: 'medium',
        notes: ''
      })
      loadReminders()
    } catch (error) {
      console.error('Failed to create payment reminder:', error)
      toast.error('Failed to create payment reminder')
    }
  }

  const updateReminderStatus = async (reminderId, status) => {
    try {
      await dealAPI.updatePaymentReminderStatus(reminderId, status)
      toast.success(`Reminder marked as ${status}`)
      loadReminders()
    } catch (error) {
      console.error('Failed to update reminder status:', error)
      toast.error('Failed to update reminder status')
    }
  }

  const deleteReminder = async (reminderId) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return

    try {
      await dealAPI.deletePaymentReminder(reminderId)
      toast.success('Reminder deleted successfully')
      loadReminders()
    } catch (error) {
      console.error('Failed to delete reminder:', error)
      toast.error('Failed to delete reminder')
    }
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-'
    const date = new Date(dateTime)
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payment Reminders</h3>
          <p className="text-sm text-gray-500">Manage payment schedules and reminders</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
        >
          Add Reminder
        </button>
      </div>

      {/* Create Reminder Form */}
      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium mb-4">Create Payment Reminder</h4>
          <form onSubmit={createReminder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Second installment payment"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ appearance: 'textfield' }}
                  placeholder="Optional"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Date *
                </label>
                <input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Reminder
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders set</h3>
          <p className="text-gray-600">Create payment reminders to stay on top of your schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => {
            const daysUntilDue = getDaysUntilDue(reminder.due_date)
            const isOverdue = daysUntilDue < 0
            const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0

            return (
              <div
                key={reminder.id}
                className={`border rounded-lg p-4 ${
                  isOverdue ? 'border-red-200 bg-red-50' : 
                  isDueSoon ? 'border-yellow-200 bg-yellow-50' : 
                  'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{reminder.description}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reminder.status)}`}>
                        {reminder.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Due Date:</span>
                        <div>{formatDateTime(reminder.due_date)}</div>
                        {daysUntilDue !== null && (
                          <div className={`text-xs ${
                            isOverdue ? 'text-red-600' : 
                            isDueSoon ? 'text-yellow-600' : 
                            'text-gray-500'
                          }`}>
                            {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` :
                             daysUntilDue === 0 ? 'Due today' :
                             `${daysUntilDue} days remaining`}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Reminder Date:</span>
                        <div>{formatDateTime(reminder.reminder_date)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span>
                        <div>{formatAmount(reminder.amount)}</div>
                      </div>
                    </div>

                    {reminder.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {reminder.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {reminder.status === 'pending' && (
                      <button
                        onClick={() => updateReminderStatus(reminder.id, 'completed')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
