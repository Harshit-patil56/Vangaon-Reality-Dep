import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { adminAPI } from '../../lib/api'
import { getUser, logout } from '../../lib/auth'
import { hasPermission, PERMISSIONS, getRoleName, getRoleDescription } from '../../lib/permissions'
import { CreateButton, EditButton, DeleteButton } from '../../components/common/PermissionButton'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import Link from 'next/link'
import { InputModal } from '../../components/common/ConfirmModal'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', role: 'user', full_name: '' })
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()
  
  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [userToReset, setUserToReset] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.listUsers()
      setUsers(res.data)
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to load users'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // run once: guard access and only load when confirmed admin
  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    if (!hasPermission(currentUser, PERMISSIONS.USERS_VIEW)) {
      setError('Access denied: insufficient permissions')
      return
    }
    setUser(currentUser)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!hasPermission(user, PERMISSIONS.USERS_CREATE)) {
      toast.error('You do not have permission to create users')
      return
    }
    if (!form.username || !form.password || !form.full_name) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await adminAPI.createUser(form)
      toast.success('User created successfully')
      setForm({ username: '', password: '', role: 'user', full_name: '' })
      setShowCreateForm(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Create failed')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    if (!hasPermission(user, PERMISSIONS.USERS_EDIT)) {
      toast.error('You do not have permission to edit users')
      return
    }
    try {
      await adminAPI.updateUser(editingUser.id, editingUser)
      toast.success('User updated successfully')
      setEditingUser(null)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  const handleDelete = async (userToDelete) => {
    if (!hasPermission(user, PERMISSIONS.USERS_DELETE)) {
      toast.error('You do not have permission to delete users')
      return
    }
    if (!confirm(`Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone.`)) return
    try {
      await adminAPI.deleteUser(userToDelete.id)
      toast.success(`User "${userToDelete.username}" deleted successfully`)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed')
    }
  }

  const handleResetClick = (targetUser) => {
    if (!hasPermission(user, PERMISSIONS.USERS_EDIT)) {
      toast.error('You do not have permission to reset passwords')
      return
    }
    setUserToReset(targetUser)
    setShowPasswordModal(true)
  }

  const handleReset = async (newPassword) => {
    if (!userToReset || !newPassword) return
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    
    try {
      await adminAPI.updateUser(userToReset.id, { password: newPassword })
      toast.success(`Password updated for user "${userToReset.username}"`)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    } finally {
      setShowPasswordModal(false)
      setUserToReset(null)
    }
  }

  const handleEdit = (userToEdit) => {
    setEditingUser({ ...userToEdit })
  }

  const cancelEdit = () => {
    setEditingUser(null)
  }

  // Filter users based on search term and role
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'auditor':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (error === 'Access denied: insufficient permissions') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-6">You need administrator privileges to manage users.</p>
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Current role: <span className="font-medium">{getRoleName(user?.role)}</span></p>
              <p className="text-xs text-slate-400">{getRoleDescription(user?.role)}</p>
            </div>
            <Link href="/dashboard" className="mt-6">
              <span className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer">
                Return to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="bg-white border-b border-slate-200">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Panel - User Management</h1>
                <p className="text-slate-600 mt-1">Manage system users, roles, and permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <span className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded cursor-pointer">
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
      <div className="px-6 py-8">
        {error && error !== 'Access denied: admin only' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded  border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">Users ({filteredUsers.length})</h2>
              <CreateButton
                user={user}
                resource="users"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New User
              </CreateButton>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users by name, username, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">Filter by role:</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Create User Form */}
          {showCreateForm && hasPermission(user, PERMISSIONS.USERS_CREATE) && (
            <div className="px-6 py-6 border-b border-slate-200 bg-blue-50">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Create New User</h3>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm({...form, full_name: e.target.value})}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex items-center space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setForm({ username: '', password: '', role: 'user', full_name: '' })
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-slate-600 rounded-full animate-pulse"></div>
                  <div className="w-4 h-4 bg-slate-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-4 h-4 bg-slate-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-slate-600">No users found matching your criteria</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      {editingUser && editingUser.id === u.id ? (
                        <>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingUser.username}
                                onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Username"
                              />
                              <input
                                type="text"
                                value={editingUser.full_name || ''}
                                onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Full Name"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={editingUser.role}
                              onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                              className="px-2 py-1 border border-slate-300 rounded text-sm"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="auditor">Auditor</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Editing
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={handleUpdate}
                                className="flex items-center px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded "
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center px-2 py-1 bg-slate-500 hover:bg-slate-600 text-white text-xs rounded "
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-slate-600">
                                  {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{u.full_name || 'No name'}</div>
                                <div className="text-sm text-slate-500">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                              {getRoleName(u.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <EditButton
                                user={user}
                                resource="users"
                                onClick={() => handleEdit(u)}
                                title="Edit user"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </EditButton>
                              {hasPermission(user, PERMISSIONS.USERS_EDIT) && (
                                <button
                                  onClick={() => handleResetClick(u)}
                                  className="flex items-center px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded "
                                  title="Reset password"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                </button>
                              )}
                              <DeleteButton
                                user={user}
                                resource="users"
                                onClick={() => handleDelete(u)}
                                title="Delete user"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </DeleteButton>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <InputModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleReset}
        title="Reset Password"
        message={`Enter new password for user "${userToReset?.username}"`}
        placeholder="Enter new password (min 6 characters)"
        confirmText="Reset Password"
        cancelText="Cancel"
      />
    </div>
  )
}
