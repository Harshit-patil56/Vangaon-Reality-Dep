import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function NewOwner() {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    aadhar_card: '',
    pan_card: '',
    address: '',
    deal_id: ''
  });
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    // inline fetchDeals to avoid missing dependency warnings
    const fetchDealsInner = async () => {
      try {
        const response = await api.get('/deals');
        setDeals(response.data);
      } catch (error) {
        console.error('Error fetching deals:', error);
        toast.error('Failed to fetch deals');
      }
    };

    fetchDealsInner();
  }, [router]);

  // fetchDeals was inlined into useEffect to avoid dependency warnings

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!form.deal_id) {
      newErrors.deal_id = 'Please select a project';
    }
    
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }
    
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (form.aadhar_card && !/^\d{12}$/.test(form.aadhar_card)) {
      newErrors.aadhar_card = 'Aadhar card must be 12 digits';
    }
    
    if (form.pan_card && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_card)) {
      newErrors.pan_card = 'PAN card format is invalid (e.g., ABCDE1234F)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/owners', form);
      toast.success('Owner created successfully');
      router.push('/owners');
    } catch (error) {
      console.error('Error creating owner:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
        setErrors({ submit: error.response.data.error });
      } else {
        toast.error('Failed to create owner');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="bg-white border-b border-slate-200 w-full">
        <div className="px-6 py-8">
          <div className="flex items-center">
            <Link href="/owners">
              <span className="mr-4 p-2 hover:bg-slate-200 rounded  duration-200 cursor-pointer">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </span>
            </Link>
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Add New Property Owner</h1>
              <p className="text-slate-600 mt-1">Create a comprehensive owner profile with all necessary details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Grid Layout */}
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Help & Guidelines */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Form Guidelines */}
            <div className="bg-white rounded  border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Form Guidelines
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-xs">*</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Required Fields</p>
                    <p className="text-xs text-slate-600 mt-1">Name and Project selection are mandatory</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Mobile Format</p>
                    <p className="text-xs text-slate-600 mt-1">Enter 10-digit mobile number without country code</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Document Format</p>
                    <p className="text-xs text-slate-600 mt-1">Aadhar: 12 digits, PAN: ABCDE1234F format</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Projects */}
            <div className="bg-white rounded  border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Available Projects
                </h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-slate-900">{deals.length}</p>
                  <p className="text-sm text-slate-600">Projects Available</p>
                </div>
                {deals.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {deals.slice(0, 5).map((deal) => (
                      <div key={deal.id} className="p-2 bg-slate-50 rounded text-xs">
                        <p className="font-medium text-slate-900 truncate">{deal.project_name}</p>
                        <p className="text-slate-600">{deal.district}, {deal.state}</p>
                      </div>
                    ))}
                    {deals.length > 5 && (
                      <p className="text-xs text-slate-500 text-center pt-2">
                        +{deals.length - 5} more projects
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center">No projects available</p>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="bg-white rounded  border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900">Form Progress</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${form.name ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Basic Information</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${form.mobile || form.email ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Contact Details</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${form.aadhar_card || form.pan_card ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Document Information</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${form.address ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Address Details</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form Content - Takes 3/4 of the width */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded  border border-slate-200">
              
              {/* Form Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <div>
                      <h2 className="text-xl font-medium text-slate-900">Owner Registration Form</h2>
                      <p className="text-sm text-slate-600 mt-1">Complete all sections to register a new property owner</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Form takes ~3 minutes</span>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                {/* Error Alert */}
                {errors.submit && (
                  <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700 text-sm font-medium">{errors.submit}</p>
                  </div>
                )}
                
                <div className="space-y-10">
                  
                  {/* Section 1: Basic Information */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center mr-4">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-900">Basic Information</h3>
                        <p className="text-sm text-slate-600 mt-1">Essential details about the property owner</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pl-14">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className={`w-full px-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  text-lg ${
                            errors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'
                          }`}
                          placeholder="Enter owner's full legal name"
                          required
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.name}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Select Associated Project <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="deal_id"
                          value={form.deal_id}
                          onChange={handleChange}
                          className={`w-full px-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white  text-lg ${
                            errors.deal_id ? 'border-red-300 bg-red-50' : 'border-slate-300'
                          }`}
                          required
                        >
                          <option value="">Choose a project/deal to associate</option>
                          {deals.map((deal) => (
                            <option key={deal.id} value={deal.id}>
                              {deal.project_name} - {deal.state}, {deal.district}
                            </option>
                          ))}
                        </select>
                        {errors.deal_id && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.deal_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Information */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center mr-4">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-900">Contact Information</h3>
                        <p className="text-sm text-slate-600 mt-1">Communication details for the owner</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pl-14">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Mobile Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="mobile"
                            value={form.mobile}
                            onChange={handleChange}
                            className={`w-full pl-12 pr-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  text-lg ${
                              errors.mobile ? 'border-red-300 bg-red-50' : 'border-slate-300'
                            }`}
                            placeholder="10-digit mobile number"
                            maxLength="10"
                          />
                        </div>
                        {errors.mobile && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.mobile}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className={`w-full pl-12 pr-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  text-lg ${
                              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                            }`}
                            placeholder="Enter email address"
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Document Information */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center mr-4">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-900">Document Information</h3>
                        <p className="text-sm text-slate-600 mt-1">Government identification documents</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pl-14">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Aadhar Card Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="aadhar_card"
                            value={form.aadhar_card}
                            onChange={handleChange}
                            className={`w-full pl-12 pr-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  text-lg ${
                              errors.aadhar_card ? 'border-red-300 bg-red-50' : 'border-slate-300'
                            }`}
                            placeholder="12-digit Aadhar number"
                            maxLength="12"
                          />
                        </div>
                        {errors.aadhar_card && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.aadhar_card}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          PAN Card Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="pan_card"
                            value={form.pan_card}
                            onChange={handleChange}
                            className={`w-full pl-12 pr-4 py-4 border rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  text-lg uppercase ${
                              errors.pan_card ? 'border-red-300 bg-red-50' : 'border-slate-300'
                            }`}
                            placeholder="PAN card number (e.g., ABCDE1234F)"
                            maxLength="10"
                          />
                        </div>
                        {errors.pan_card && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.pan_card}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Address Information */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center mr-4">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-900">Address Information</h3>
                        <p className="text-sm text-slate-600 mt-1">Complete residential address details</p>
                      </div>
                    </div>
                    <div className="pl-14">
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Complete Address
                      </label>
                      <div className="relative">
                        <div className="absolute top-4 left-4 pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <textarea
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          rows="5"
                          className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500  resize-none text-lg"
                          placeholder="Enter complete address including:&#10;House/Flat number, Street/Road name&#10;Area/Locality, City&#10;State, PIN code"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-10 mt-10 border-t border-slate-200">
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>All data is securely encrypted and stored</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Link href="/owners">
                      <span className="flex items-center px-6 py-3 border border-slate-300 text-slate-700 rounded hover:bg-slate-50  font-medium cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </span>
                    </Link>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded font-medium   text-lg"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                          Creating Owner...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Create Owner Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
