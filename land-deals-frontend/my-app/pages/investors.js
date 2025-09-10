import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../lib/auth';
import Navbar from '../components/layout/Navbar';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, CreditCard, Hash, Eye } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { GeneralDeleteModal } from '../components/common/ConfirmModal';

export default function Investors() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('investor_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [investorToDelete, setInvestorToDelete] = useState(null);
  
  // Star functionality state
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredInvestors, setStarredInvestors] = useState([]);
  
  const [newInvestor, setNewInvestor] = useState({
    investor_name: '',
    investment_amount: '',
    investment_percentage: '',
    mobile: '',
    email: '',
    aadhar_card: '',
    pan_card: '',
    address: ''
  });

  useEffect(() => {
    // Check authentication and get user
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const userData = getUser();
    setUser(userData);
    setAuthChecked(true);
    fetchInvestors();
    fetchStarredInvestors();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/investors');
      setInvestors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStarredInvestors = async () => {
    try {
      const response = await api.get('/investors/starred');
      const starredData = response.data || [];
      setStarredInvestors(starredData);
      // Only update the main investors list if we're in starred view mode
      if (showStarredOnly) {
        setInvestors(starredData);
      }
    } catch (error) {
      console.error('Error fetching starred investors:', error);
      setStarredInvestors([]);
      if (showStarredOnly) {
        setInvestors([]);
      }
    }
  };

  const toggleInvestorStar = async (investorId) => {
    try {
      const investor = investors.find(i => i.id === investorId);
      const newStarredState = !investor.is_starred;
      
      // Optimistically update UI
      setInvestors(prev => prev.map(i => 
        i.id === investorId ? { ...i, is_starred: newStarredState } : i
      ));
      
      // Make API call
      await api.post(`/investors/${investorId}/star`, {
        starred: newStarredState
      });
      
      // Refresh data based on current view
      if (showStarredOnly) {
        await fetchStarredInvestors(); // This will update the main investors list with only starred ones
      } else {
        // Update starred investors list for statistics
        await fetchStarredInvestors();
      }
    } catch (error) {
      console.error('Error toggling investor star:', error);
      // Revert optimistic update on error and refresh data
      if (showStarredOnly) {
        await fetchStarredInvestors();
      } else {
        await fetchInvestors();
        await fetchStarredInvestors();
      }
    }
  };

  const toggleStarredView = async () => {
    const newShowStarredOnly = !showStarredOnly;
    setShowStarredOnly(newShowStarredOnly);
    
    try {
      setLoading(true);
      // Fetch data based on the new state
      if (newShowStarredOnly) {
        await fetchStarredInvestors();
      } else {
        await fetchInvestors();
      }
    } catch (error) {
      console.error('Error toggling starred view:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStarredCount = () => {
    return investors.filter(investor => investor.is_starred).length;
  };

  const handleAddInvestor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/investors', newInvestor);
      setInvestors([...investors, response.data]);
      setNewInvestor({
        investor_name: '',
        investment_amount: '',
        investment_percentage: '',
        mobile: '',
        email: '',
        aadhar_card: '',
        pan_card: '',
        address: ''
      });
      setShowAddModal(false);
      toast.success('Investor added successfully!');
    } catch (error) {
      console.error('Failed to add investor:', error);
      toast.error('Failed to add investor: ' + (error.response?.data?.error || 'Unknown error'));
    }
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

  const filteredInvestors = investors
    .filter(investor => {
      // Apply search filter only (starred filtering is handled by server-side fetch)
      return investor.investor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             investor.mobile?.includes(searchTerm) ||
             investor.email?.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const sortedInvestors = [...filteredInvestors].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    
    if (sortBy === 'investment_amount' || sortBy === 'investment_percentage') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

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
              <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Investors Management</h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span>{investors.length} investor{investors.length !== 1 ? 's' : ''} registered</span>
                  <span>•</span>
                  <span>Track and manage all investor details</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="relative group">
                <button className="flex items-center rounded bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Deal
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <Link href="/deals/new">
                      <span className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                        New Land Deal
                      </span>
                    </Link>
                    <Link href="/deals/new?type=investment">
                      <span className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                        Investment Deal
                      </span>
                    </Link>
                    <Link href="/deals/new?type=partnership">
                      <span className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                        Partnership Deal
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
              <Link href="/investors/new">
                <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer ">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Investor
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
          {/* Total Investors */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Investors</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{investors.length}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <span className="text-xs font-semibold text-slate-600">TOTAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Starred Investors */}
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
                    {showStarredOnly ? 'Starred Investors (Active)' : 'Starred Investors'}
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

          {/* Total Investment */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Investment</p>
                  <p className="text-3xl font-bold text-green-700 mt-2">
                    ₹{investors.reduce((sum, inv) => sum + (parseFloat(inv.investment_amount) || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Average Investment */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Average Investment</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">
                    ₹{investors.length > 0 ? Math.round(investors.reduce((sum, inv) => sum + (parseFloat(inv.investment_amount) || 0), 0) / investors.length).toLocaleString('en-IN') : '0'}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <Hash className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Search and Filters Section */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
          <div className="p-6">
            {/* Header with count and starred toggle */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {showStarredOnly ? 'Starred Investors' : 'All Investors'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {sortedInvestors.length} investor{sortedInvestors.length !== 1 ? 's' : ''} found
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
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search investors by name, mobile, or email..."
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
                    <option value="investor_name">Sort by Name</option>
                    <option value="investment_amount">Sort by Amount</option>
                    <option value="investment_percentage">Sort by Share %</option>
                    <option value="mobile">Sort by Mobile</option>
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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
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
          ) : sortedInvestors.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investor Information</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investment Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedInvestors.map((investor) => (
                    <tr key={investor.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 mb-1">{investor.investor_name}</div>
                        <div className="text-sm text-slate-600">
                          <div>Mobile: {investor.mobile || 'N/A'}</div>
                          <div>Email: {investor.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          <div>Amount: {investor.investment_amount ? `₹${Number(investor.investment_amount).toLocaleString()}` : 'N/A'}</div>
                          <div>Share: {investor.investment_percentage ? `${investor.investment_percentage}%` : 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500">
                          ID: {investor.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => toggleInvestorStar(investor.id)}
                            className={`p-2 rounded border transition-colors ${
                              investor.is_starred 
                                ? 'text-yellow-500 hover:bg-yellow-50 border-yellow-200 hover:border-yellow-300' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200 hover:border-yellow-300'
                            }`}
                            title={investor.is_starred ? "Remove star" : "Add star"}
                          >
                            <svg className="w-5 h-5" fill={investor.is_starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <Link href={`/investors/${investor.id}`}>
                            <span className="p-2 text-slate-600 hover:bg-slate-200 rounded cursor-pointer flex items-center justify-center">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                          </Link>
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
                          <Link href={`/investors/${investor.id}`}>
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

      {/* Add Investor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-slate-900">Add New Investor</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded  duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleAddInvestor} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investor Name *</label>
                  <input
                    type="text"
                    required
                    value={newInvestor.investor_name}
                    onChange={(e) => setNewInvestor({...newInvestor, investor_name: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestor.investment_amount}
                    onChange={(e) => setNewInvestor({...newInvestor, investment_amount: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investment Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestor.investment_percentage}
                    onChange={(e) => setNewInvestor({...newInvestor, investment_percentage: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={newInvestor.mobile}
                    onChange={(e) => setNewInvestor({...newInvestor, mobile: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newInvestor.email}
                    onChange={(e) => setNewInvestor({...newInvestor, email: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Aadhaar Card</label>
                  <input
                    type="text"
                    value={newInvestor.aadhar_card}
                    onChange={(e) => setNewInvestor({...newInvestor, aadhar_card: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">PAN Card</label>
                  <input
                    type="text"
                    value={newInvestor.pan_card}
                    onChange={(e) => setNewInvestor({...newInvestor, pan_card: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    value={newInvestor.address}
                    onChange={(e) => setNewInvestor({...newInvestor, address: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900  ring-1 ring-inset ring-slate-300 hover:bg-slate-50 "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 "
                  >
                    Add Investor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
