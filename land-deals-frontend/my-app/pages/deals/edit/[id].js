import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { dealAPI } from '../../../lib/api';
import { getUser, logout } from '../../../lib/auth';
import toast from 'react-hot-toast';
import * as locationAPI from '../../../lib/locationAPI';
import Navbar from '../../../components/layout/Navbar';

export default function EditDeal() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  // const [originalDeal, setOriginalDeal] = useState(null); // Unused variable
  const [form, setForm] = useState({
    project_name: '',
    survey_number: '',
    state: '',
    district: '',
    taluka: '',
    total_area: '',
    area_unit: 'Acre',
    status: 'open',
    owners: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' }],
    investors: [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    expenses: [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
    payment_mode: '',
    buyers: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    profit_allocation: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  // Location data states
  const [locationData, setLocationData] = useState({
    states: [],
    districts: [],
    talukas: [],
    villages: []
  });
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    talukas: false,
    villages: false
  });

  // Location loading functions
  const loadStates = async () => {
    setLocationLoading(prev => ({ ...prev, states: true }));
    try {
      const states = await locationAPI.fetchStates();
      setLocationData(prev => ({ ...prev, states }));
    } catch (error) {
      console.error('Error loading states:', error);
      toast.error('Failed to load states');
    } finally {
      setLocationLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadDistricts = async (state) => {
    if (!state) return;
    setLocationLoading(prev => ({ ...prev, districts: true }));
    try {
      const districts = await locationAPI.fetchDistricts(null, state);
      setLocationData(prev => ({ ...prev, districts, talukas: [], villages: [] }));
    } catch (error) {
      console.error('Error loading districts:', error);
      toast.error('Failed to load districts');
    } finally {
      setLocationLoading(prev => ({ ...prev, districts: false }));
    }
  };

  const fetchDealData = useCallback(async () => {
    try {
      setFetchLoading(true);
      const response = await dealAPI.getById(id);
      const dealData = response.data;
      
      // setOriginalDeal(dealData); // Unused variable
      
      // Map the deal data to form structure
      setForm({
        project_name: dealData.deal?.project_name || '',
        survey_number: dealData.deal?.survey_number || '',
        state: dealData.deal?.state || '',
        district: dealData.deal?.district || '',
        taluka: dealData.deal?.taluka || '',
        village: dealData.deal?.village || '',
        total_area: dealData.deal?.total_area || '',
        area_unit: dealData.deal?.area_unit || 'Acre',
        status: dealData.deal?.status || 'open',
        owners: dealData.owners?.length > 0 ? dealData.owners.map(owner => ({
          name: owner.name || '',
          mobile: owner.mobile || '',
          email: owner.email || '',
          aadhar_card: owner.aadhar_card || '',
          pan_card: owner.pan_card || '',
          address: owner.address || ''
        })) : [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' }],
        investors: dealData.investors?.length > 0 ? dealData.investors.map(investor => ({
          investor_name: investor.investor_name || '',
          investment_amount: investor.investment_amount || '',
          investment_percentage: investor.investment_percentage || '',
          mobile: investor.mobile || '',
          email: investor.email || '',
          aadhar_card: investor.aadhar_card || '',
          pan_card: investor.pan_card || ''
        })) : [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
        expenses: dealData.expenses?.length > 0 ? dealData.expenses.map(expense => ({
          expense_type: expense.expense_type || '',
          expense_description: expense.expense_description || '',
          amount: expense.amount || '',
          paid_by: expense.paid_by || '',
          expense_date: expense.expense_date || '',
          receipt_number: expense.receipt_number || ''
        })) : [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
        payment_mode: dealData.deal?.payment_mode || '',
        buyers: dealData.buyers?.length > 0 ? dealData.buyers.map(buyer => ({
          name: buyer.name || '',
          mobile: buyer.mobile || '',
          email: buyer.email || '',
          aadhar_card: buyer.aadhar_card || '',
          pan_card: buyer.pan_card || ''
        })) : [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
        profit_allocation: dealData.deal?.profit_allocation || '',
      });

      // Load location data based on existing values
      if (dealData.deal?.state) {
        await loadDistricts(dealData.deal.state);
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal data');
      router.push('/deals');
    } finally {
      setFetchLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setAuthChecked(true);
    loadStates();
  }, [router]);

  useEffect(() => {
    if (id && authChecked) {
      fetchDealData();
    }
  }, [id, authChecked, fetchDealData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Handle location changes
    if (name === 'state') {
      loadDistricts(value);
      setForm(prev => ({ ...prev, district: '', taluka: '', village: '' }));
    } else if (name === 'district') {
      setForm(prev => ({ ...prev, taluka: '', village: '' }));
    }
  };

  const handleArrayChange = (index, field, value, arrayName) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName, template) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], template]
    }));
  };

  const removeArrayItem = (index, arrayName) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to update a deal');
      return;
    }

    setLoading(true);
    try {
      await dealAPI.update(id, form);
      toast.success('Deal updated successfully!');
      router.push(`/deals/${id}`);
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error(error.response?.data?.error || 'Failed to update deal');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!authChecked || fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Deal Data</h3>
          <p className="text-slate-600">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const ownerTemplate = { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' };
  const buyerTemplate = { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' };
  const investorTemplate = { investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' };
  const expenseTemplate = { expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white shadow-sm border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mobile-header-stack">
            <div className="flex items-center mobile-header-content">
              <Link href={`/deals/${id}`}>
                <span className="mr-4 p-2 hover:bg-slate-200 rounded-lg transition-colors duration-200 cursor-pointer">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </span>
              </Link>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Edit Deal</h1>
                <p className="text-slate-600 mt-1">Update the deal information and related data</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 mobile-button-group">
              <div className="text-sm text-slate-600">
                <span className="font-medium">Deal ID:</span>
                <span className="ml-2">#{id}</span>
              </div>
              <Link href={`/deals/${id}`}>
                <span className="inline-flex items-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 font-semibold cursor-pointer rounded-lg">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Grid Layout */}
      <div className="w-full px-6 py-8 mobile-content-padding">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mobile-layout-stack">
          
          {/* Left Sidebar - Form Guidelines & Progress */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Form Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Edit Progress
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${form.project_name ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm text-slate-600">Basic Information</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${form.owners.some(o => o.name) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm text-slate-600">Owners ({form.owners.length})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${form.buyers.some(b => b.name) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm text-slate-600">Buyers ({form.buyers.length})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${form.investors.some(i => i.investor_name) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm text-slate-600">Investors ({form.investors.length})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${form.expenses.some(e => e.expense_type) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm text-slate-600">Expenses ({form.expenses.length})</span>
                </div>
              </div>
            </div>

            {/* Form Tips */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">Form Tips</h3>
              </div>
              <div className="p-6 space-y-3 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Changes are auto-saved to your session</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Add multiple owners, buyers, investors as needed</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>All fields are optional except project name</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form Content - Takes 3/4 of the width */}
          <div className="xl:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Deal Information */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>
                      <p className="text-sm text-slate-600 mt-1">Essential details about the property deal</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mobile-form-grid">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="project_name"
                        value={form.project_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Survey Number
                      </label>
                      <input
                        type="text"
                        name="survey_number"
                        value={form.survey_number}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Location Details</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">State <span className="text-red-500">*</span></label>
                        <select
                          name="state"
                          value={form.state}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                          required
                        >
                          <option value="">Select State</option>
                          {locationData.states.map(state => (
                            <option key={state.id || state.name || state} value={state.name || state}>
                              {state.name || state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">District <span className="text-red-500">*</span></label>
                        <select
                          name="district"
                          value={form.district}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                          required
                          disabled={locationLoading.districts}
                        >
                          <option value="">Select District</option>
                          {locationData.districts.map(district => (
                            <option key={district.id || district.name || district} value={district.name || district}>
                              {district.name || district}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Taluka</label>
                        <input
                          type="text"
                          name="taluka"
                          value={form.taluka}
                          onChange={handleChange}
                          placeholder="Enter taluka name"
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Village</label>
                        <input
                          type="text"
                          name="village"
                          value={form.village}
                          onChange={handleChange}
                          placeholder="Enter village name"
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Area and Date */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Property & Purchase Details</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Total Area</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total_area"
                          value={form.total_area}
                          onChange={handleChange}
                          style={{ appearance: 'textfield' }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Area Unit</label>
                        <select
                          name="area_unit"
                          value={form.area_unit}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        >
                          <option value="Acre">Acre</option>
                          <option value="Hectare">Hectare</option>
                          <option value="Sq Ft">Sq Ft</option>
                          <option value="Sq Meter">Sq Meter</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Status and Payment Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                      >
                        <option value="open">Open</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                      <select
                        name="payment_mode"
                        value={form.payment_mode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                      >
                        <option value="">Select Payment Mode</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Profit Allocation</label>
                      <input
                        type="text"
                        name="profit_allocation"
                        value={form.profit_allocation}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                        placeholder="e.g., 50-50, 60-40, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owners Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Property Owners</h2>
                        <p className="text-sm text-slate-600 mt-1">Add all property owners with their details</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addArrayItem('owners', ownerTemplate)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Owner
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {form.owners.map((owner, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-6 space-y-4 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Owner {index + 1}</h3>
                        {form.owners.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'owners')}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-md transition-all duration-200 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={owner.name}
                          onChange={(e) => handleArrayChange(index, 'name', e.target.value, 'owners')}
                          placeholder="Full Name"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="tel"
                          value={owner.mobile}
                          onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'owners')}
                          placeholder="Mobile Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="email"
                          value={owner.email}
                          onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'owners')}
                          placeholder="Email Address"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={owner.aadhar_card}
                          onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'owners')}
                          placeholder="Aadhar Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={owner.pan_card}
                          onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'owners')}
                          placeholder="PAN Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200 uppercase"
                        />
                        <input
                          type="text"
                          value={owner.address}
                          onChange={(e) => handleArrayChange(index, 'address', e.target.value, 'owners')}
                          placeholder="Complete Address"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyers Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-emerald-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Property Buyers</h2>
                        <p className="text-sm text-slate-600 mt-1">Add potential or confirmed buyers</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addArrayItem('buyers', buyerTemplate)}
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Buyer
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {form.buyers.map((buyer, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-6 space-y-4 bg-emerald-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Buyer {index + 1}</h3>
                        {form.buyers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'buyers')}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-md transition-all duration-200 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={buyer.name}
                          onChange={(e) => handleArrayChange(index, 'name', e.target.value, 'buyers')}
                          placeholder="Full Name"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="tel"
                          value={buyer.mobile}
                          onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'buyers')}
                          placeholder="Mobile Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="email"
                          value={buyer.email}
                          onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'buyers')}
                          placeholder="Email Address"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={buyer.aadhar_card}
                          onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'buyers')}
                          placeholder="Aadhar Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={buyer.pan_card}
                          onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'buyers')}
                          placeholder="PAN Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200 uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investors Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Deal Investors</h2>
                        <p className="text-sm text-slate-600 mt-1">Add investors with their investment details</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addArrayItem('investors', investorTemplate)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Investor
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {form.investors.map((investor, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-6 space-y-4 bg-blue-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Investor {index + 1}</h3>
                        {form.investors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'investors')}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-md transition-all duration-200 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={investor.investor_name}
                          onChange={(e) => handleArrayChange(index, 'investor_name', e.target.value, 'investors')}
                          placeholder="Investor Name"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={investor.investment_amount}
                          onChange={(e) => handleArrayChange(index, 'investment_amount', e.target.value, 'investors')}
                          placeholder="Investment Amount (₹)"
                          style={{ appearance: 'textfield' }}
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={investor.investment_percentage}
                          onChange={(e) => handleArrayChange(index, 'investment_percentage', e.target.value, 'investors')}
                          placeholder="Investment Percentage (%)"
                          style={{ appearance: 'textfield' }}
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="tel"
                          value={investor.mobile}
                          onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'investors')}
                          placeholder="Mobile Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="email"
                          value={investor.email}
                          onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'investors')}
                          placeholder="Email Address"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={investor.aadhar_card}
                          onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'investors')}
                          placeholder="Aadhar Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={investor.pan_card}
                          onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'investors')}
                          placeholder="PAN Card Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200 uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses Section */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-orange-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold">5</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Deal Expenses</h2>
                        <p className="text-sm text-slate-600 mt-1">Track all expenses related to this deal</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addArrayItem('expenses', expenseTemplate)}
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Expense
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {form.expenses.map((expense, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-6 space-y-4 bg-orange-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Expense {index + 1}</h3>
                        {form.expenses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'expenses')}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-md transition-all duration-200 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={expense.expense_type}
                          onChange={(e) => handleArrayChange(index, 'expense_type', e.target.value, 'expenses')}
                          placeholder="Expense Type (e.g., Legal, Survey)"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={expense.expense_description}
                          onChange={(e) => handleArrayChange(index, 'expense_description', e.target.value, 'expenses')}
                          placeholder="Description"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={expense.amount}
                          onChange={(e) => handleArrayChange(index, 'amount', e.target.value, 'expenses')}
                          placeholder="Amount (₹)"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={expense.paid_by}
                          onChange={(e) => handleArrayChange(index, 'paid_by', e.target.value, 'expenses')}
                          placeholder="Paid By"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="date"
                          value={expense.expense_date}
                          onChange={(e) => handleArrayChange(index, 'expense_date', e.target.value, 'expenses')}
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={expense.receipt_number}
                          onChange={(e) => handleArrayChange(index, 'receipt_number', e.target.value, 'expenses')}
                          placeholder="Receipt Number"
                          className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white transition-all duration-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>All changes will be saved securely</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Link href={`/deals/${id}`}>
                        <span className="inline-flex items-center px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200 font-semibold cursor-pointer">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </span>
                      </Link>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm text-lg"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                            Updating Deal...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Update Deal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Responsive CSS */}
      <style jsx>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        @media (max-width: 767px) {
          .mobile-header-stack {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .mobile-header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .mobile-button-group {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }
          
          .mobile-button-group > * {
            width: 100%;
            justify-content: center;
          }
          
          .mobile-content-padding {
            padding: 1rem;
          }
          
          .mobile-layout-stack {
            grid-template-columns: 1fr !important;
            gap: 1rem;
          }
          
          .mobile-form-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem;
          }
          
          /* Improve form inputs for mobile */
          input, select, textarea {
            min-height: 44px;
            font-size: 16px;
          }
          
          /* Responsive text sizes */
          h1 {
            font-size: 1.5rem !important;
          }
          
          h2 {
            font-size: 1.25rem !important;
          }
          
          /* Stack form sections better */
          .space-y-6 > * {
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>
      </div>
    </>
  );
}
