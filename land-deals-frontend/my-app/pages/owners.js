import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../lib/auth';
import { hasPermission, PERMISSIONS } from '../lib/permissions';
import Navbar from '../components/layout/Navbar';
import { Plus, Edit, Trash2, Star, Eye, Loader2 } from 'lucide-react';
import api, { ownersAPI } from '../lib/api';
import { toast } from 'react-hot-toast';

import EditOwnerModal from '../components/owners/EditOwnerModal';

export default function Owners() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  
  // Star functionality state
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starringOwners, setStarringOwners] = useState(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Check if current user can perform admin actions
  const canPerformActions = () => {
    return user?.role === 'admin' || user?.role === 'auditor';
  };

  const fetchOwners = async (page = null, isInitialLoad = false, overrideStarredOnly = null) => {
    try {
      // Use current page if none specified
      const targetPage = page || currentPage;
      
      // Only show full loading on initial load, use tableLoading for pagination
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      
      // Use override value if provided, otherwise use current state
      const starredOnlyValue = overrideStarredOnly !== null ? overrideStarredOnly : showStarredOnly;
      
      // Build query parameters
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: itemsPerPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        starred_only: starredOnlyValue.toString()
      });
      
      // Add search parameter if there's a search term
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await api.get(`/owners?${params.toString()}`);
      
      // Update state with paginated data
      setOwners(response.data.data || []);
      
      // Update pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages);
        setTotalCount(response.data.pagination.total);
      }
      
    } catch (error) {
      console.error('Failed to fetch owners:', error);
      toast.error('Failed to load owners');
      setOwners([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };



  const toggleStarredView = async () => {
    const newShowStarredOnly = !showStarredOnly;
    setShowStarredOnly(newShowStarredOnly);
    setCurrentPage(1); // Reset to first page when switching views
    
    // Pass the new starred state explicitly to fetchOwners to avoid async state issues
    await fetchOwners(1, false, newShowStarredOnly);
  };

  const toggleOwnerStar = async (ownerId) => {
    // Prevent rapid clicking
    if (starringOwners.has(ownerId)) return;
    
    try {
      const owner = owners.find(o => o.id === ownerId);
      if (!owner) return;
      
      const newStarredState = !owner.is_starred;
      
      // Mark as processing
      setStarringOwners(prev => new Set([...prev, ownerId]));
      
      // Make API call first
      await ownersAPI.star(ownerId, newStarredState);
      
      // Update local state immediately to provide instant feedback
      if (showStarredOnly && !newStarredState) {
        // If unstarring in starred view, remove from list immediately
        setOwners(prev => prev.filter(o => o.id !== ownerId));
      } else if (showStarredOnly && newStarredState) {
        // If starring in starred view, refresh to get the latest data
        await fetchOwners(currentPage, false, true);
      } else {
        // In all owners view, update the starred state locally
        setOwners(prev => prev.map(o => 
          o.id === ownerId ? { ...o, is_starred: newStarredState } : o
        ));
      }
    } catch (error) {
      console.error('Error toggling owner star:', error);
      toast.error('Failed to update star status');
      // Refresh data on error to ensure consistency
      await fetchOwners(currentPage, false);
    } finally {
      // Remove from processing set
      setStarringOwners(prev => {
        const newSet = new Set(prev);
        newSet.delete(ownerId);
        return newSet;
      });
    }
  };

  const handleEdit = (owner) => {
    setSelectedOwner(owner);
    setShowEditModal(true);
  };

  const handleAdd = () => {
    router.push('/owners/new');
  };

  const handleDelete = async (ownerId) => {
    if (!window.confirm('Are you sure you want to delete this owner?')) return;
    
    try {
      await ownersAPI.delete(ownerId);
      toast.success('Owner deleted successfully');
      
      // Remove from local state
      setOwners(prev => prev.filter(o => o.id !== ownerId));
    } catch (error) {
      console.error('Error deleting owner:', error);
      toast.error('Failed to delete owner');
    }
  };

  // Server-side filtering and sorting - owners array is already filtered and sorted

  // For server-side pagination, owners array is already paginated
  const paginatedOwners = owners;

  const getStarredCount = () => {
    return owners.filter(owner => owner.is_starred).length;
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }
      
      const userData = getUser();
      
      // Check if user has permission to view owners
      if (!hasPermission(userData, PERMISSIONS.OWNERS_VIEW)) {
        toast.error('Access denied: insufficient permissions');
        router.push('/dashboard');
        return;
      }
      
      setUser(userData);
      
      // Load initial data
      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          page: '1',
          limit: '5',
          sort_by: 'name',
          sort_order: 'asc',
          starred_only: 'false'
        });
        
        const response = await api.get(`/owners?${params.toString()}`);
        
        setOwners(response.data.data || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages);
          setTotalCount(response.data.pagination.total);
        }
        
      } catch (error) {
        console.error('Failed to fetch owners:', error);
        toast.error('Failed to load owners');
        setOwners([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    if (router.isReady) {
      initializeData();
    }
  }, [router.isReady, router]);





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
            {user?.role === 'user' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-700 font-medium">Read-Only Access</p>
                <p className="text-xs text-blue-600">You can view your owner information but cannot make changes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Search and Filter Controls */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
          <div className="p-6">
            {/* Header with count and starred toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                    {showStarredOnly ? 'Starred Owners' : 'All Owners'}
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Total: {totalCount}
                    </span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} owner{totalCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Starred Count */}
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Starred: {getStarredCount()}
                </span>
                
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
                    placeholder="Search by name, mobile, Aadhar, or PAN card..."
                    value={searchTerm}
                    onChange={(e) => {
                      const newSearchTerm = e.target.value;
                      setSearchTerm(newSearchTerm);
                      setCurrentPage(1);
                      
                      // Debounced search
                      clearTimeout(window.searchTimeout);
                      window.searchTimeout = setTimeout(async () => {
                        setTableLoading(true);
                        
                        try {
                          const params = new URLSearchParams({
                            page: '1',
                            limit: itemsPerPage.toString(),
                            sort_by: sortBy,
                            sort_order: sortOrder,
                            starred_only: showStarredOnly.toString()
                          });
                          
                          if (newSearchTerm.trim()) {
                            params.append('search', newSearchTerm.trim());
                          }
                          
                          const response = await api.get(`/owners?${params.toString()}`);
                          
                          setOwners(response.data.data || []);
                          
                          if (response.data.pagination) {
                            setTotalPages(response.data.pagination.pages);
                            setTotalCount(response.data.pagination.total);
                          }
                        } catch (error) {
                          console.error('Error searching:', error);
                          toast.error('Search failed');
                        } finally {
                          setTableLoading(false);
                        }
                      }, 500);
                    }}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                        fetchOwners(1, false);
                      }}
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
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                      fetchOwners(1, false);
                    }}
                    className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="mobile">Sort by Mobile</option>
                    <option value="aadhar_card">Sort by Aadhar Card</option>
                    <option value="pan_card">Sort by PAN Card</option>
                    <option value="id">Sort by Owner ID</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                </div>

                {/* Sort Order Button */}
                <button
                  onClick={() => {
                    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    setSortOrder(newSortOrder);
                    setCurrentPage(1);
                    fetchOwners(1, false);
                  }}
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

                {/* Add New Owner Button - Admin/Auditor only */}
                {canPerformActions() && (
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Owner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Owners List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 relative">
          {/* Table Loading Overlay */}
          {tableLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                <span className="text-sm text-slate-600">Loading...</span>
              </div>
            </div>
          )}
          
          {paginatedOwners.length === 0 && !tableLoading ? (
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
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-48" /> {/* Owner Information */}
                  <col className="w-32" /> {/* Mobile Number */}
                  <col className="w-40" /> {/* Aadhar Card */}
                  <col className="w-32" /> {/* PAN Card */}
                  <col className="w-24" /> {/* Owner ID */}
                  <col className="w-44" /> {/* Actions */}
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Owner Information</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Aadhar Card</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider truncate">PAN Card</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Owner ID</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedOwners.map((owner) => (
                    <tr key={owner.id} className="hover:bg-slate-50 h-[73px]">
                      <td className="px-6 py-4 w-48">
                        <div className="font-medium text-slate-900 truncate" title={owner.name}>
                          {owner.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-32">
                        <div className="text-sm text-slate-600 truncate" title={owner.mobile || 'N/A'}>
                          {owner.mobile || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-40">
                        <div className="text-sm text-slate-600 truncate" title={owner.aadhar_card || 'N/A'}>
                          {owner.aadhar_card || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-32">
                        <div className="text-sm text-slate-600 truncate" title={owner.pan_card || 'N/A'}>
                          {owner.pan_card || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-24">
                        <div className="text-sm text-slate-500 truncate" title={owner.id}>
                          {owner.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-44">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Star Button */}
                          <button
                            onClick={() => toggleOwnerStar(owner.id)}
                            disabled={starringOwners.has(owner.id)}
                            className={`relative p-2 rounded-lg transition-all duration-200 group flex-shrink-0 ${
                              owner.is_starred 
                                ? 'text-yellow-500 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300' 
                                : 'text-slate-400 bg-white border border-slate-200 hover:text-yellow-500 hover:bg-yellow-50 hover:border-yellow-300'
                            } ${starringOwners.has(owner.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={owner.is_starred ? "Remove from starred" : "Add to starred"}
                          >
                            {starringOwners.has(owner.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Star 
                                className="w-4 h-4" 
                                fill={owner.is_starred ? "currentColor" : "none"}
                              />
                            )}
                          </button>

                          {/* View Button */}
                          <Link href={`/owners/${owner.id}`}>
                            <button className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group flex-shrink-0">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>

                          {/* Edit Button - Only for admin/auditor */}
                          {canPerformActions() && (
                            <button
                              onClick={() => handleEdit(owner)}
                              className="p-2 text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group flex-shrink-0"
                              title="Edit owner"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button - Only for admin/auditor */}
                          {canPerformActions() && (
                            <button
                              onClick={() => handleDelete(owner.id)}
                              className="p-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all duration-200 group flex-shrink-0"
                              title="Delete owner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Fill empty rows to maintain consistent table height */}
                  {Array.from({ length: itemsPerPage - paginatedOwners.length }, (_, index) => (
                    <tr key={`empty-${index}`} className="h-[73px]">
                      <td className="px-6 py-4 w-48">&nbsp;</td>
                      <td className="px-6 py-4 w-32">&nbsp;</td>
                      <td className="px-6 py-4 w-40">&nbsp;</td>
                      <td className="px-6 py-4 w-32">&nbsp;</td>
                      <td className="px-6 py-4 w-24">&nbsp;</td>
                      <td className="px-6 py-4 w-44">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-4">
            {/* Pagination Buttons - Centered */}
            <div className="flex items-center justify-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={async () => {
                  if (tableLoading || currentPage === 1) return;
                  
                  const newPage = currentPage - 1;
                  setTableLoading(true);
                  
                  try {
                    const params = new URLSearchParams({
                      page: newPage.toString(),
                      limit: itemsPerPage.toString(),
                      sort_by: sortBy,
                      sort_order: sortOrder,
                      starred_only: showStarredOnly.toString()
                    });
                    
                    if (searchTerm.trim()) {
                      params.append('search', searchTerm.trim());
                    }
                    
                    const response = await api.get(`/owners?${params.toString()}`);
                    
                    setOwners(response.data.data || []);
                    setCurrentPage(newPage);
                    
                    if (response.data.pagination) {
                      setTotalPages(response.data.pagination.pages);
                      setTotalCount(response.data.pagination.total);
                    }
                  } catch (error) {
                    console.error('Error fetching page:', error);
                    toast.error('Failed to load page');
                  } finally {
                    setTableLoading(false);
                  }
                }}
                disabled={currentPage === 1 || tableLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={async () => {
                      if (tableLoading || pageNum === currentPage) return;
                      
                      setTableLoading(true);
                      
                      try {
                        const params = new URLSearchParams({
                          page: pageNum.toString(),
                          limit: itemsPerPage.toString(),
                          sort_by: sortBy,
                          sort_order: sortOrder,
                          starred_only: showStarredOnly.toString()
                        });
                        
                        if (searchTerm.trim()) {
                          params.append('search', searchTerm.trim());
                        }
                        
                        const response = await api.get(`/owners?${params.toString()}`);
                        
                        setOwners(response.data.data || []);
                        setCurrentPage(pageNum);
                        
                        if (response.data.pagination) {
                          setTotalPages(response.data.pagination.pages);
                          setTotalCount(response.data.pagination.total);
                        }
                      } catch (error) {
                        console.error('Error fetching page:', error);
                        toast.error('Failed to load page');
                      } finally {
                        setTableLoading(false);
                      }
                    }}
                    disabled={tableLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 min-w-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={async () => {
                  if (tableLoading || currentPage === totalPages) return;
                  
                  const newPage = currentPage + 1;
                  setTableLoading(true);
                  
                  try {
                    const params = new URLSearchParams({
                      page: newPage.toString(),
                      limit: itemsPerPage.toString(),
                      sort_by: sortBy,
                      sort_order: sortOrder,
                      starred_only: showStarredOnly.toString()
                    });
                    
                    if (searchTerm.trim()) {
                      params.append('search', searchTerm.trim());
                    }
                    
                    const response = await api.get(`/owners?${params.toString()}`);
                    
                    setOwners(response.data.data || []);
                    setCurrentPage(newPage);
                    
                    if (response.data.pagination) {
                      setTotalPages(response.data.pagination.pages);
                      setTotalCount(response.data.pagination.total);
                    }
                  } catch (error) {
                    console.error('Error fetching page:', error);
                    toast.error('Failed to load page');
                  } finally {
                    setTableLoading(false);
                  }
                }}
                disabled={currentPage === totalPages || tableLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Owner Modal */}
      <EditOwnerModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOwner(null);
        }}
        owner={selectedOwner}
        onSubmit={async (ownerData) => {
          try {
            const updatedOwner = await ownersAPI.update(selectedOwner.id, ownerData);
            setOwners(prev => prev.map(o => o.id === selectedOwner.id ? updatedOwner : o));
            setShowEditModal(false);
            setSelectedOwner(null);
            toast.success('Owner updated successfully');
          } catch (error) {
            console.error('Error updating owner:', error);
            toast.error('Failed to update owner');
          }
        }}
      />
    </div>
  );
}
