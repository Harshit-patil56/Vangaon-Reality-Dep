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
    aadhar_card: '',
    pan_card: '',
    deal_id: ''
  });
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { returnTo, section } = router.query;

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    // Extract deal ID from returnTo URL if coming from a deal page
    let dealIdFromUrl = null;
    if (returnTo && returnTo.includes('/deals/')) {
      const match = returnTo.match(/\/deals\/(\d+)/);
      if (match) {
        dealIdFromUrl = match[1];
      }
    }

    // inline fetchDeals to avoid missing dependency warnings
    const fetchDealsInner = async () => {
      try {
        if (dealIdFromUrl) {
          // If we have a deal ID from URL, fetch only that deal and set it automatically
          const dealResponse = await api.get(`/deals/${dealIdFromUrl}`);
          console.log('Deal response:', dealResponse.data); // Debug log
          
          // Handle different response structures
          let dealData = dealResponse.data;
          if (dealData.deal) {
            // If the response has a nested 'deal' object
            dealData = dealData.deal;
          }
          
          setCurrentDeal(dealData);
          setForm(prev => ({ ...prev, deal_id: dealIdFromUrl }));
        } else {
          // Otherwise fetch all deals for the dropdown
          const response = await api.get('/deals');
          setDeals(response.data);
        }
      } catch (error) {
        console.error('Error fetching deals:', error);
        if (dealIdFromUrl) {
          toast.error('Failed to fetch deal information');
        } else {
          toast.error('Failed to fetch deals');
        }
      }
    };

    fetchDealsInner();
  }, [router, returnTo]);

  // Debug effect to log currentDeal
  useEffect(() => {
    if (currentDeal) {
      console.log('Current deal set:', currentDeal);
      console.log('Available name fields:', {
        project_name: currentDeal.project_name,
        title: currentDeal.title,
        name: currentDeal.name
      });
    }
  }, [currentDeal]);

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
      newErrors.name = 'Owner name is required';
    }
    
    if (!form.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }
    
    if (!form.aadhar_card.trim()) {
      newErrors.aadhar_card = 'Aadhaar card is required';
    } else if (!/^\d{12}$/.test(form.aadhar_card)) {
      newErrors.aadhar_card = 'Aadhaar card must be 12 digits';
    }
    
    if (!form.pan_card.trim()) {
      newErrors.pan_card = 'PAN card is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_card.toUpperCase())) {
      newErrors.pan_card = 'PAN card format is invalid (e.g., ABCDE1234F)';
    }

    if (!form.deal_id) {
      newErrors.deal_id = 'Please select a project';
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
      const formData = {
        ...form,
        pan_card: form.pan_card.toUpperCase()
      };
      await api.post('/owners', formData);
      toast.success('Owner created successfully');
      
      // Navigate back to where user came from
      if (returnTo) {
        if (section) {
          router.push(`${returnTo}?section=${section}`);
        } else {
          router.push(returnTo);
        }
      } else {
        router.push('/owners');
      }
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
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Link 
            href={returnTo ? (section ? `${returnTo}?section=${section}` : returnTo) : "/owners"} 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {returnTo ? 'Back to Deal' : 'Back to Owners'}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentDeal ? `Add Owner to ${currentDeal.project_name || currentDeal.title || currentDeal.name || 'Selected Project'}` : 'Add New Owner'}
          </h1>
          <p className="text-gray-600 mt-2">
            {currentDeal 
              ? `Create a new owner profile for this project`
              : 'Create a new owner profile with basic information'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Owner Information</h2>
            
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Owner Name */}
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter owner name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Mobile */}
                <div>
                  <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile *
                  </label>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.mobile ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
                  )}
                </div>

                {/* Project Selection */}
                <div>
                  <label htmlFor="deal_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Project *
                  </label>
                  {currentDeal ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      <div className="text-sm font-medium text-black">
                        {currentDeal.project_name || currentDeal.title || currentDeal.name || 'Project Name'}
                      </div>
                      {currentDeal.survey_number && (
                        <div className="text-xs text-gray-500 mt-1">
                          Survey No: {currentDeal.survey_number}
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      id="deal_id"
                      name="deal_id"
                      value={form.deal_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.deal_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select project</option>
                      {deals.map((deal) => (
                        <option key={deal.id} value={deal.id}>
                          {deal.title || deal.project_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.deal_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.deal_id}</p>
                  )}
                </div>

                {/* Aadhaar Card */}
                <div>
                  <label htmlFor="aadhar_card" className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Card *
                  </label>
                  <input
                    type="text"
                    id="aadhar_card"
                    name="aadhar_card"
                    value={form.aadhar_card}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.aadhar_card ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="XXXX XXXX XXXX"
                    maxLength="12"
                  />
                  {errors.aadhar_card && (
                    <p className="mt-1 text-sm text-red-600">{errors.aadhar_card}</p>
                  )}
                </div>

                {/* PAN Card */}
                <div>
                  <label htmlFor="pan_card" className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card *
                  </label>
                  <input
                    type="text"
                    id="pan_card"
                    name="pan_card"
                    value={form.pan_card}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
                      errors.pan_card ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="ABCDE1234F"
                    maxLength="10"
                  />
                  {errors.pan_card && (
                    <p className="mt-1 text-sm text-red-600">{errors.pan_card}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Link
                  href={returnTo ? (section ? `${returnTo}?section=${section}` : returnTo) : "/owners"}
                  className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
