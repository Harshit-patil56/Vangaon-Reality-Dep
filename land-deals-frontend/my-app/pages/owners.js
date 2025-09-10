import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout } from '../lib/auth';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import { GeneralDeleteModal } from '../components/common/ConfirmModal';

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [user, setUser] = useState(null);
  const router = useRouter();
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState(null);
  
  // Star functionality state
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredOwners, setStarredOwners] = useState([]);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(userData);
    fetchOwners();
    fetchStarredOwners();
  }, [router]);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owners');
      setOwners(response.data || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStarredOwners = async () => {
    try {
      const response = await api.get('/owners/starred');
      setStarredOwners(response.data || []);
    } catch (error) {
      console.error('Error fetching starred owners:', error);
      setStarredOwners([]);
    }
  };

  const toggleOwnerStar = async (ownerId) => {
    try {
      const owner = owners.find(o => o.id === ownerId);
      const newStarredState = !owner.is_starred;
      
      // Optimistically update UI
      setOwners(prev => prev.map(o => 
        o.id === ownerId ? { ...o, is_starred: newStarredState } : o
      ));
      
      if (newStarredState) {
        setStarredOwners(prev => [...prev, { ...owner, is_starred: true }]);
      } else {
        setStarredOwners(prev => prev.filter(o => o.id !== ownerId));
      }
      
      // Make API call
      await api.post(`/owners/${ownerId}/star`, {
        starred: newStarredState
      });
    } catch (error) {
      console.error('Error toggling owner star:', error);
      // Revert optimistic update on error
      setOwners(prev => prev.map(o => 
        o.id === ownerId ? { ...o, is_starred: !o.is_starred } : o
      ));
      fetchStarredOwners(); // Refresh starred owners
    }
  };

  const toggleStarredView = () => {
    setShowStarredOnly(!showStarredOnly);
  };

  const handleDeleteClick = (owner) => {
    setOwnerToDelete(owner);
    setShowDeleteModal(true);
  };

  const deleteOwner = async () => {
    if (!ownerToDelete) return;

    try {
      await api.delete(`/owners/${ownerToDelete.id}`);
      setOwners(owners.filter(owner => owner.id !== ownerToDelete.id));
      setStarredOwners(starredOwners.filter(owner => owner.id !== ownerToDelete.id));
      setShowDeleteModal(false);
      setOwnerToDelete(null);
    } catch (error) {
      console.error('Error deleting owner:', error);
      alert('Failed to delete owner. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filter and sort owners
  const filteredOwners = (showStarredOnly ? starredOwners : owners).filter(owner =>
    owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.mobile?.includes(searchTerm) ||
    owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedOwners = [...filteredOwners].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    const comparison = aVal.localeCompare(bVal);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStarredCount = () => {
    return owners.filter(owner => owner.is_starred).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Owners</h3>
          <p className="text-slate-600">Please wait while we prepare your data</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={() => {
          logout();
          router.push('/login');
        }} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Land Owners Management
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/owners/add">
                <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer">
                  + Add New Owner
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Owners */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Owners</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{owners.length}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <span className="text-xs font-semibold text-slate-600">TOTAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Starred Owners */}
          <div 
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-300 ${
              showStarredOnly ? 'border-yellow-400 shadow-md' : 'border-slate-200'
            }`}
            onClick={toggleStarredView}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                    {showStarredOnly ? 'Starred Owners (Active)' : 'Starred Owners'}
                  </p>
                  <p className="text-3xl font-bold text-yellow-700 mt-2">{getStarredCount()}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                  <svg 
                    className={`h-6 w-6 text-yellow-600`} 
                    fill={showStarredOnly ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
          <div className="p-6">
            {/* Header with count and starred toggle */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {showStarredOnly ? 'Starred Owners' : 'All Owners'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {sortedOwners.length} owner{sortedOwners.length !== 1 ? 's' : ''} found
                </p>
              </div>
              
              {/* Starred Toggle Button */}
              <button
                onClick={toggleStarredView}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  showStarredOnly
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill={showStarredOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {showStarredOnly ? 'Show All' : 'Show Starred'}
              </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search owners by name, mobile, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Sort By Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="mobile">Sort by Mobile</option>
                    <option value="email">Sort by Email</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                </div>

                {/* Sort Order Button */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center justify-center px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortOrder === 'asc' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    )}
                  </svg>
                </button>

                {/* Add New Owner Button */}
                <Link href="/owners/new">
                  <span className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Owner
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Owners List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {sortedOwners.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {showStarredOnly ? 'No starred owners found' : 'No owners found'}
              </h3>
              <p className="text-slate-600">
                {showStarredOnly 
                  ? 'Start starring owners to see them here.' 
                  : 'Get started by adding your first owner.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Owner Information</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedOwners.map((owner) => (
                    <tr key={owner.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{owner.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          <div>Mobile: {owner.mobile || 'N/A'}</div>
                          <div>Email: {owner.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          <div>Address: {owner.address || 'N/A'}</div>
                          <div className="text-sm text-slate-500">ID: {owner.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => toggleOwnerStar(owner.id)}
                            className={`p-2 rounded border transition-colors ${
                              owner.is_starred 
                                ? 'text-yellow-500 hover:bg-yellow-50 border-yellow-200 hover:border-yellow-300' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200 hover:border-yellow-300'
                            }`}
                            title={owner.is_starred ? "Remove star" : "Add star"}
                          >
                            <svg className="w-5 h-5" fill={owner.is_starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <Link href={`/owners/${owner.id}`}>
                            <span className="p-2 text-slate-600 hover:bg-slate-200 rounded cursor-pointer flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(owner)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200 hover:border-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <Link href={`/owners/${owner.id}`}>
                            <span className="p-2 text-slate-600 hover:bg-slate-200 rounded cursor-pointer flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </Link>
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

      {/* Delete Confirmation Modal */}
      <GeneralDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteOwner}
        title="Delete Owner"
        message={`Are you sure you want to delete owner "${ownerToDelete?.name}"? This action cannot be undone.`}
        itemType="owner"
      />
    </div>
  );
}
