import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../lib/auth';
import { hasPermission, PERMISSIONS } from '../lib/permissions';
import Navbar from '../components/layout/Navbar';
import { Search } from 'lucide-react';
import api, { investorsAPI } from '../lib/api';
import { toast } from 'react-hot-toast';
import { GeneralDeleteModal } from '../components/common/ConfirmModal';

export default function Investors() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('investor_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingInvestor, setEditingInvestor] = useState(null);
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [investorToDelete, setInvestorToDelete] = useState(null);
  
  // Star functionality state
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredInvestors, setStarredInvestors] = useState([]);
  const [starringInvestors, setStarringInvestors] = useState(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvestors = useCallback(async (page = null, isInitialLoad = false, overrideStarredOnly = null) => {
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
      
      const response = await api.get(`/investors?${params.toString()}`);
      
      // Update state with paginated data
      setInvestors(response.data.data || []);
      
      // Update pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.total_pages);
        setTotalCount(response.data.pagination.total);
      }
      
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
      setInvestors([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder, showStarredOnly, searchTerm]);

  useEffect(() => {
    // Check authentication and get user
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const userData = getUser();
    
    // Check if user has permission to view investors
    if (!hasPermission(userData, PERMISSIONS.INVESTORS_VIEW)) {
      toast.error('Access denied: insufficient permissions');
      router.push('/dashboard');
      return;
    }
    
    setUser(userData);
    setAuthChecked(true);
    fetchInvestors(1, true); // Load first page initially
  }, [router, fetchInvestors]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleStarredView = async () => {
    const newShowStarredOnly = !showStarredOnly;
    setShowStarredOnly(newShowStarredOnly);
    setCurrentPage(1); // Reset to first page when switching views
    
    // Set table loading state for visual feedback
    setTableLoading(true);
    
    try {
      // Pass the new starred state explicitly to fetchInvestors to avoid async state issues
      await fetchInvestors(1, false, newShowStarredOnly);
    } catch (error) {
      console.error('Error toggling starred view:', error);
      // Revert the state if there's an error
      setShowStarredOnly(!newShowStarredOnly);
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchInvestors(newPage, false);
    }
  };

  const fetchStarredInvestors = async (shouldUpdateMainList = false) => {
    try {
      const response = await investorsAPI.getStarred();
      const starredData = response.data || [];
      setStarredInvestors(starredData);
      // Update the main investors list if explicitly requested or if we're in starred view mode
      if (shouldUpdateMainList || showStarredOnly) {
        setInvestors(starredData);
      }
    } catch (error) {
      console.error('Error fetching starred investors:', error);
      setStarredInvestors([]);
      if (shouldUpdateMainList || showStarredOnly) {
        setInvestors([]);
      }
    }
  };

  const toggleInvestorStar = async (investorId) => {
    // Prevent rapid clicking
    if (starringInvestors.has(investorId)) return;
    
    try {
      const investor = investors.find(i => i.id === investorId);
      if (!investor) return;
      
      const newStarredState = !investor.is_starred;
      
      // Mark as processing
      setStarringInvestors(prev => new Set([...prev, investorId]));
      
      // Make API call first
      await investorsAPI.star(investorId, newStarredState);
      
      // Update local state immediately to provide instant feedback
      if (showStarredOnly && !newStarredState) {
        // If unstarring in starred view, remove from list immediately
        setInvestors(prev => prev.filter(i => i.id !== investorId));
        setStarredInvestors(prev => prev.filter(i => i.id !== investorId));
      } else if (showStarredOnly && newStarredState) {
        // If starring in starred view, refresh to get the latest data
        await fetchStarredInvestors(true);
      } else {
        // In all investors view, update the starred state locally
        setInvestors(prev => prev.map(i => 
          i.id === investorId ? { ...i, is_starred: newStarredState } : i
        ));
        // Update the starred list without refetching all data
        if (newStarredState) {
          setStarredInvestors(prev => [...prev, { ...investor, is_starred: true }]);
        } else {
          setStarredInvestors(prev => prev.filter(i => i.id !== investorId));
        }
      }
    } catch (error) {
      console.error('Error toggling investor star:', error);
      // Refresh data on error to ensure consistency
      if (showStarredOnly) {
        await fetchStarredInvestors(true);
      } else {
        await fetchInvestors();
        await fetchStarredInvestors();
      }
    } finally {
      // Remove from processing set
      setStarringInvestors(prev => {
        const newSet = new Set(prev);
        newSet.delete(investorId);
        return newSet;
      });
    }
  };

  const getStarredCount = () => {
    return investors.filter(investor => investor.is_starred).length;
  };

  const handleEditInvestor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/investors/${editingInvestor.id}`, editingInvestor);
      setInvestors(investors.map(inv => inv.id === editingInvestor.id ? response.data : inv));
      setEditingInvestor(null);
      toast.success('Investor updated successfully!');
    } catch (error) {
      console.error('Failed to update investor:', error);
      toast.error('Failed to update investor: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDeleteClick = (investor) => {
    setInvestorToDelete(investor);
    setShowDeleteModal(true);
  };

  const handleDeleteInvestor = async () => {
    if (!investorToDelete) return;
    
    try {
      await api.delete(`/investors/${investorToDelete.id}`);
      setInvestors(investors.filter(inv => inv.id !== investorToDelete.id));
      toast.success('Investor deleted successfully!');
    } catch (error) {
      console.error('Failed to delete investor:', error);
      toast.error('Failed to delete investor: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setShowDeleteModal(false);
      setInvestorToDelete(null);
    }
  };

  // Server-side filtering and sorting - investors array is already filtered and sorted
  const paginatedInvestors = investors;

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
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
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Investors Management</h1>
              </div>
            </div>

            {user?.role === 'user' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-700 font-medium">Read-Only Access</p>
                <p className="text-xs text-blue-600">You can view your investor information but cannot make changes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Search and Filters Section */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
          <div className="p-6">
            {/* Header with count and starred toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                    {showStarredOnly ? 'Starred Investors' : 'All Investors'}
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Total: {totalCount}
                    </span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} investor{totalCount !== 1 ? 's' : ''}
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search Bar */}
              <div className="w-full lg:w-80">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search investors by name, mobile, PAN, Aadhaar, or ID..."
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
                          
                          const response = await api.get(`/investors?${params.toString()}`);
                          
                          setInvestors(response.data.data || []);
                          setCurrentPage(1);
                          
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
                        fetchInvestors(1, false);
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
              <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto">
                {/* Sort By Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="investor_name">Sort by Name</option>
                    <option value="mobile">Sort by Mobile</option>
                    <option value="pan_card">Sort by PAN Card</option>
                    <option value="aadhar_card">Sort by Aadhaar Card</option>
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

                {/* Add New Investor Button */}
                <Link href="/investors/new">
                  <span className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Investor
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Investors List */}
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
          
          {loading ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200">
                  <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Investors</h3>
              <p className="text-slate-600">Please wait while we fetch investor data</p>
            </div>
          ) : paginatedInvestors.length === 0 && !tableLoading ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {showStarredOnly ? 'No starred investors found' : 'No investors found'}
              </h3>
              <p className="text-slate-600">
                {showStarredOnly 
                  ? 'Start starring investors to see them here.' 
                  : 'Get started by adding your first investor.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PAN Card</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aadhaar Card</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor ID</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {user?.role === 'user' ? 'View' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedInvestors.map((investor) => (
                    <tr key={investor.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{investor.investor_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {investor.mobile || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {investor.pan_card || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {investor.aadhar_card || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500">
                          {investor.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          {/* View button - always available */}
                          <Link href={`/investors/${investor.id}`}>
                            <span className="p-2 text-slate-600 hover:bg-slate-200 rounded cursor-pointer flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                          </Link>
                          
                          {/* Admin/Auditor only actions */}
                          {user?.role !== 'user' && (
                            <>
                              <button
                                onClick={() => toggleInvestorStar(investor.id)}
                                disabled={starringInvestors.has(investor.id)}
                                className={`p-2 rounded border transition-colors ${
                                  starringInvestors.has(investor.id)
                                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                    : investor.is_starred 
                                      ? 'text-yellow-500 hover:bg-yellow-50 border-yellow-200 hover:border-yellow-300' 
                                      : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200 hover:border-yellow-300'
                                }`}
                                title={
                                  starringInvestors.has(investor.id) 
                                    ? "Processing..." 
                                    : investor.is_starred 
                                      ? "Remove star" 
                                      : "Add star"
                                }
                              >
                                {starringInvestors.has(investor.id) ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill={investor.is_starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => setEditingInvestor(investor)}
                                className="p-2 text-slate-600 hover:bg-slate-200 rounded"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(investor)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200 hover:border-red-300"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Empty demo rows to always show 5 rows total */}
                  {Array.from({ length: Math.max(0, 5 - paginatedInvestors.length) }).map((_, index) => (
                    <tr key={`empty-${index}`} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-transparent">&nbsp;</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-transparent">&nbsp;</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-transparent">&nbsp;</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-transparent">&nbsp;</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-transparent">&nbsp;</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="p-2 text-transparent rounded border border-transparent">
                            <svg className="w-5 h-5" fill="none" stroke="transparent" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          {user?.role !== 'user' && (
                            <>
                              <div className="p-2 text-transparent rounded border border-transparent">
                                <svg className="w-5 h-5" fill="none" stroke="transparent" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </div>
                              <div className="p-2 text-transparent rounded border border-transparent">
                                <svg className="w-5 h-5" fill="none" stroke="transparent" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </div>
                              <div className="p-2 text-transparent rounded border border-transparent">
                                <svg className="w-5 h-5" fill="none" stroke="transparent" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-4">
          {/* Pagination Buttons - Centered */}
          <div className="flex items-center justify-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.max(1, totalPages) || loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>



      {/* Edit Investor Modal */}
      {editingInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-medium text-gray-900">Edit Investor</h2>
            </div>
            <form onSubmit={handleEditInvestor} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investor Name *</label>
                  <input
                    type="text"
                    required
                    value={editingInvestor.investor_name}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investor_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Amount</label>
                  <input
                    type="number"
                    value={editingInvestor.investment_amount}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investment_amount: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Percentage</label>
                  <input
                    type="number"
                    value={editingInvestor.investment_percentage}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investment_percentage: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={editingInvestor.mobile}
                    onChange={(e) => setEditingInvestor({...editingInvestor, mobile: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingInvestor.email}
                    onChange={(e) => setEditingInvestor({...editingInvestor, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card</label>
                  <input
                    type="text"
                    value={editingInvestor.aadhar_card}
                    onChange={(e) => setEditingInvestor({...editingInvestor, aadhar_card: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card</label>
                  <input
                    type="text"
                    value={editingInvestor.pan_card}
                    onChange={(e) => setEditingInvestor({...editingInvestor, pan_card: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={editingInvestor.address}
                    onChange={(e) => setEditingInvestor({...editingInvestor, address: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingInvestor(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update Investor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <GeneralDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteInvestor}
        title="Delete Investor"
        message={`Are you sure you want to delete investor "${investorToDelete?.investor_name}"? This action cannot be undone.`}
        itemType="investor"
      />
    </div>
  );
}
