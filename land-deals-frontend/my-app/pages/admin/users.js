import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getUser, logout, isAuthenticated } from '../../lib/auth';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import Navbar from '../../components/layout/Navbar';
import { Plus, Search, Edit, Trash2, User, Shield, UserCheck } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

export default function AdminUsers() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    owner_id: '',
    investor_id: '',
    linkType: 'owner' // 'owner' or 'investor'
  });

  // State for starred owners and investors
  const [starredOwners, setStarredOwners] = useState([]);
  const [starredInvestors, setStarredInvestors] = useState([]);

  useEffect(() => {
    // Check authentication and admin permission
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const userData = getUser();
    if (!hasPermission(userData, PERMISSIONS.ADMIN_ACCESS)) {
      router.push('/dashboard');
      return;
    }
    
    setUser(userData);
    setAuthChecked(true);
    fetchUsers();
    fetchStarredOwners();
    fetchStarredInvestors();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStarredOwners = async () => {
    try {
      const response = await api.get('/owners/starred');
      setStarredOwners(response.data || []);
    } catch (error) {
      console.error('Failed to fetch starred owners:', error);
      setStarredOwners([]);
    }
  };

  const fetchStarredInvestors = async () => {
    try {
      const response = await api.get('/investors/starred');
      setStarredInvestors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch starred investors:', error);
      setStarredInvestors([]);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validate that regular users have either owner or investor selected
    if (newUser.role === 'user') {
      if (newUser.linkType === 'owner' && !newUser.owner_id) {
        toast.error('Please select an owner for the user');
        return;
      }
      if (newUser.linkType === 'investor' && !newUser.investor_id) {
        toast.error('Please select an investor for the user');
        return;
      }
    }
    
    try {
      const userData = {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        // Only include owner_id/investor_id for regular users
        owner_id: newUser.role === 'user' && newUser.linkType === 'owner' && newUser.owner_id ? newUser.owner_id : null,
        investor_id: newUser.role === 'user' && newUser.linkType === 'investor' && newUser.investor_id ? newUser.investor_id : null
      };
      
      const response = await api.post('/admin/users', userData);
      setUsers([...users, response.data]);
      setNewUser({
        username: '',
        password: '',
        role: 'user',
        owner_id: '',
        investor_id: '',
        linkType: 'owner'
      });
      setShowAddModal(false);
      toast.success('User created successfully!');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    
    // Validate that regular users have either owner or investor selected
    if (editingUser.role === 'user') {
      if (editingUser.linkType === 'owner' && !editingUser.owner_id) {
        toast.error('Please select an owner for the user');
        return;
      }
      if (editingUser.linkType === 'investor' && !editingUser.investor_id) {
        toast.error('Please select an investor for the user');
        return;
      }
    }
    
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        role: editingUser.role,
        // Only include owner_id/investor_id for regular users
        owner_id: editingUser.role === 'user' && editingUser.linkType === 'owner' ? editingUser.owner_id : null,
        investor_id: editingUser.role === 'user' && editingUser.linkType === 'investor' ? editingUser.investor_id : null,
        ...(editingUser.password && { password: editingUser.password })
      });
      setEditingUser(null);
      toast.success('User updated successfully!');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      toast.success('User deleted successfully!');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-red-600" />;
      case 'auditor': return <UserCheck className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-slate-600" />;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      auditor: 'bg-blue-100 text-blue-800 border-blue-200',
      user: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[role] || colors.user}`}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </span>
    );
  };

  const getUserRoleDescription = (role) => {
    switch (role) {
      case 'admin': return 'System Administrator';
      case 'auditor': return 'System Auditor';
      case 'user': return 'Regular User';
      default: return 'System User';
    }
  };

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-600 mt-1">Manage system users and their permissions</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{users.length}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Administrators</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{users.filter(u => u.role === 'admin').length}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Regular Users</p>
                  <p className="text-3xl font-bold text-slate-600 mt-2">{users.filter(u => u.role === 'user').length}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users by username, name, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Users ({filteredUsers.length})</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">
                              {userData.linked_owner_name || userData.linked_investor_name || userData.username}
                            </div>
                            <div className="text-sm text-slate-500">
                              {userData.linked_owner_name && 'Linked to Owner'}
                              {userData.linked_investor_name && 'Linked to Investor'}
                              {!userData.linked_owner_name && !userData.linked_investor_name && getUserRoleDescription(userData.role)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{userData.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(userData.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingUser(userData)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(userData);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300">
            <form onSubmit={handleAddUser}>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Add New User</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Enter password"
                  />
                </div>
                {newUser.role === 'user' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Link To</label>
                      <select
                        value={newUser.linkType}
                        onChange={(e) => {
                          setNewUser({ 
                            ...newUser, 
                            linkType: e.target.value,
                            owner_id: '',
                            investor_id: ''
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="owner">Owner</option>
                        <option value="investor">Investor</option>
                      </select>
                    </div>
                    
                    {newUser.linkType === 'owner' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Starred Owner *</label>
                        <select
                          required
                          value={newUser.owner_id}
                          onChange={(e) => setNewUser({ ...newUser, owner_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                        >
                          <option value="" className="text-slate-500">Select an owner...</option>
                          {starredOwners.map((owner) => (
                            <option key={owner.id} value={owner.id} className="text-slate-900">
                              {owner.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {newUser.linkType === 'investor' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Starred Investor *</label>
                        <select
                          required
                          value={newUser.investor_id}
                          onChange={(e) => setNewUser({ ...newUser, investor_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                        >
                          <option value="" className="text-slate-500">Select an investor...</option>
                          {starredInvestors.map((investor) => (
                            <option key={investor.id} value={investor.id} className="text-slate-900">
                              {investor.investor_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setNewUser({ 
                        ...newUser, 
                        role: newRole,
                        // Clear owner/investor links when changing to admin/auditor
                        owner_id: newRole === 'user' ? newUser.owner_id : '',
                        investor_id: newRole === 'user' ? newUser.investor_id : '',
                        linkType: newRole === 'user' ? newUser.linkType : 'owner'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="user">User</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300">
            <form onSubmit={handleEditUser}>
              <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                {editingUser.role === 'user' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Link To</label>
                      <select
                        value={editingUser.linkType || (editingUser.owner_id ? 'owner' : 'investor')}
                        onChange={(e) => {
                          setEditingUser({ 
                            ...editingUser, 
                            linkType: e.target.value,
                            owner_id: e.target.value === 'owner' ? editingUser.owner_id : '',
                            investor_id: e.target.value === 'investor' ? editingUser.investor_id : ''
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="owner">Owner</option>
                        <option value="investor">Investor</option>
                      </select>
                    </div>
                    
                    {(editingUser.linkType === 'owner' || editingUser.owner_id) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Starred Owner *</label>
                        <select
                          required
                          value={editingUser.owner_id || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, owner_id: e.target.value, linkType: 'owner' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                        >
                          <option value="" className="text-slate-500">Select an owner...</option>
                          {starredOwners.map((owner) => (
                            <option key={owner.id} value={owner.id} className="text-slate-900">
                              {owner.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(editingUser.linkType === 'investor' || editingUser.investor_id) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Starred Investor *</label>
                        <select
                          required
                          value={editingUser.investor_id || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, investor_id: e.target.value, linkType: 'investor' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                        >
                          <option value="" className="text-slate-500">Select an investor...</option>
                          {starredInvestors.map((investor) => (
                            <option key={investor.id} value={investor.id} className="text-slate-900">
                              {investor.investor_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setEditingUser({ 
                        ...editingUser, 
                        role: newRole,
                        // Clear owner/investor links when changing to admin/auditor
                        owner_id: newRole === 'user' ? editingUser.owner_id : '',
                        investor_id: newRole === 'user' ? editingUser.investor_id : '',
                        linkType: newRole === 'user' ? editingUser.linkType : 'owner'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="user">User</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Delete User</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to delete the user <strong>{userToDelete.username}</strong>? 
                This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}