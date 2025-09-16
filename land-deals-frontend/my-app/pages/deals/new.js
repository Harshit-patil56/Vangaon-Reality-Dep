// --- All imports remain untouched ---
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dealAPI, ownersAPI, investorsAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function NewDeal() {
  // --- Logic & state unchanged ---
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    project_name: '',
    survey_number: '',
    purchase_date: '',
    taluka: '',
    village: '',
    total_area: '',
    area_unit: 'Acre',
    status: 'open',
    owners: [{ name: '', mobile: '', aadhar_card: '', pan_card: '' }],
    investors: [{ investor_name: '', mobile: '', aadhar_card: '', pan_card: '' }],
  });
  const [landDocuments, setLandDocuments] = useState({
    extract: [],
    additional_docs: [
      { name: '', files: [] }
    ]
  });
  
  // Existing owners functionality
  const [existingOwners, setExistingOwners] = useState([]);
  const [ownerSelectionTypes, setOwnerSelectionTypes] = useState({}); // Track selection type for each owner index
  const [selectedExistingOwners, setSelectedExistingOwners] = useState({}); // Track selected existing owners
  
  // Existing investors functionality
  const [existingInvestors, setExistingInvestors] = useState([]);
  const [investorSelectionTypes, setInvestorSelectionTypes] = useState({}); // Track selection type for each investor index
  const [selectedExistingInvestors, setSelectedExistingInvestors] = useState({}); // Track selected existing investors
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setAuthChecked(true);
    
    // Load existing owners
    fetchExistingOwners();
    
    // Load existing investors
    fetchExistingInvestors();
  }, []);

  // Fetch existing owners (only starred owners)
  const fetchExistingOwners = async () => {
    try {
      // Get only starred owners for the dropdown
      const response = await ownersAPI.getStarred();
      setExistingOwners(response.data);
    } catch (error) {
      console.error('Failed to fetch starred owners:', error);
      console.error('Error message:', error.message);
    }
  };

  // Fetch existing investors
  const fetchExistingInvestors = async () => {
    try {
      // Create a simple API call to get starred investors using proper API method
      const response = await investorsAPI.getStarred();
      setExistingInvestors(response.data);
    } catch (error) {
      console.error('Failed to fetch starred investors:', error);
      console.error('Error message:', error.message);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading...</h3>
          <p className="text-slate-600">Please wait while we initialize the form</p>
        </div>
      </div>
    );
  }
  
  if (!user || (user.role !== 'auditor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded border border-slate-200 mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-600">Only admin or auditor can create new deals.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleArrayChange = (arr, idx, e) => {
    const updated = [...form[arr]];
    let value = e.target.value;
    
    // Format mobile number input
    if (e.target.name === 'mobile') {
      // Remove all non-digits
      value = value.replace(/\D/g, '');
      // Limit to 10 digits for Indian mobile numbers
      value = value.substring(0, 10);
    }
    
    // Format Aadhaar card input
    if (e.target.name === 'aadhar_card') {
      // Remove all non-digits
      value = value.replace(/\D/g, '');
      // Limit to 12 digits
      value = value.substring(0, 12);
      // Add spaces every 4 digits
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
    
    // Format PAN card input
    if (e.target.name === 'pan_card') {
      // Convert to uppercase and limit to 10 characters
      value = value.toUpperCase().substring(0, 10);
      // PAN format validation (5 letters, 4 digits, 1 letter)
      value = value.replace(/[^A-Z0-9]/g, '');
    }
    
    updated[idx][e.target.name] = value;
    setForm({ ...form, [arr]: updated });
  };
  
  const addArrayItem = (arr, obj) => setForm({ ...form, [arr]: [...form[arr], obj] });
  const removeArrayItem = (arr, idx) => setForm({ ...form, [arr]: form[arr].filter((_, i) => i !== idx) });
  
  // Owner selection functions
  const handleOwnerTypeChange = (ownerIndex, type) => {
    setOwnerSelectionTypes(prev => ({
      ...prev,
      [ownerIndex]: type
    }));
    
    if (type === 'new') {
      // Reset to empty form for new owner
      const updatedOwners = [...form.owners];
      updatedOwners[ownerIndex] = { name: '', mobile: '', aadhar_card: '', pan_card: '' };
      setForm({ ...form, owners: updatedOwners });
      
      // Clear existing owner selection
      setSelectedExistingOwners(prev => {
        const updated = { ...prev };
        delete updated[ownerIndex];
        return updated;
      });
    }
  };
  
  const handleExistingOwnerSelect = async (ownerIndex, existingOwnerId) => {
    setSelectedExistingOwners(prev => ({
      ...prev,
      [ownerIndex]: existingOwnerId
    }));
    
    if (existingOwnerId) {
      const existingOwner = existingOwners.find(owner => owner.id === parseInt(existingOwnerId));
      
      if (existingOwner) {
        const updatedOwners = [...form.owners];
        updatedOwners[ownerIndex] = {
          name: existingOwner.name,
          mobile: existingOwner.mobile || '',
          aadhar_card: existingOwner.aadhar_card || '',
          pan_card: existingOwner.pan_card || '',
          existing_owner_id: existingOwner.id
        };
        setForm({ ...form, owners: updatedOwners });
      }
    } else {
      // Clear any existing owner data when no owner is selected
      // (no document handling needed anymore)
    }
  };
  
  const addOwnerWithType = () => {
    const newOwnerIndex = form.owners.length;
    addArrayItem('owners', { name: '', mobile: '', aadhar_card: '', pan_card: '' });
    
    // Set default to new owner type
    setOwnerSelectionTypes(prev => ({
      ...prev,
      [newOwnerIndex]: 'new'
    }));
  };
  
  const removeOwnerWithType = (index) => {
    removeArrayItem('owners', index);
    
    // Clean up related state
    setOwnerSelectionTypes(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
    
    setSelectedExistingOwners(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
  };
  
  const handleInvestorTypeChange = (idx, type) => {
    setInvestorSelectionTypes(prev => ({
      ...prev,
      [idx]: type
    }));
    
    // Clear existing investor selection when switching to new
    if (type === 'new') {
      setSelectedExistingInvestors(prev => {
        const updated = { ...prev };
        delete updated[idx];
        return updated;
      });
      
      // Reset investor form to empty
      const updatedInvestors = [...form.investors];
      updatedInvestors[idx] = {
        investor_name: '',
        mobile: '',
        aadhar_card: '',
        pan_card: ''
      };
      setForm({ ...form, investors: updatedInvestors });
    }
  };
  
  const addInvestorWithType = () => {
    const newInvestorIndex = form.investors.length;
    addArrayItem('investors', { investor_name: '', mobile: '', aadhar_card: '', pan_card: '' });
    
    // Set default to new investor type
    setInvestorSelectionTypes(prev => ({
      ...prev,
      [newInvestorIndex]: 'new'
    }));
  };
  
  const removeInvestorWithType = (index) => {
    removeArrayItem('investors', index);
    
    // Clean up related state
    setInvestorSelectionTypes(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
    
    setSelectedExistingInvestors(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
  };
  
  const handleExistingInvestorSelect = async (investorIndex, existingInvestorId) => {
    setSelectedExistingInvestors(prev => ({
      ...prev,
      [investorIndex]: existingInvestorId
    }));
    
    if (existingInvestorId) {
      const existingInvestor = existingInvestors.find(investor => investor.id === parseInt(existingInvestorId));
      
      if (existingInvestor) {
        const updatedInvestors = [...form.investors];
        updatedInvestors[investorIndex] = {
          investor_name: existingInvestor.investor_name,
          mobile: existingInvestor.mobile || '',
          aadhar_card: existingInvestor.aadhar_card || '',
          pan_card: existingInvestor.pan_card || '',
          existing_investor_id: existingInvestor.id
        };
        setForm({ ...form, investors: updatedInvestors });
      }
    } else {
      // Clear any existing investor data when no investor is selected
      // (no document handling needed anymore)
    }
  };
  
  const handleLandDocumentChange = (docType, e) => {
    if (docType === 'additional_docs') {
      // Handle additional docs differently - this is handled by AdditionalDocsField
      return;
    }
    console.log('🟢 LAND Document Change:', { docType, fileName: e.target.files[0]?.name });
    const file = e.target.files[0]; // Only take the first file
    if (file) {
      setLandDocuments(prev => {
        const newState = {
          ...prev,
          [docType]: [file] // Replace with single file, not append
        };
        console.log('🟢 LAND State after update:', newState);
        return newState;
      });
    }
  };

  const removeLandDocument = (docType, index) => {
    if (docType === 'additional_docs') {
      // Handle additional docs differently - this is handled by AdditionalDocsField
      return;
    }
    console.log('🟢 LAND Document Remove:', { docType, index });
    setLandDocuments(prev => {
      const newState = {
        ...prev,
        [docType]: [] // Clear the array completely for single file uploads
      };
      console.log('🟢 LAND State after remove:', newState);
      return newState;
    });
  };

  // Handlers for Additional Documents
  const addAdditionalDoc = () => {
    if (landDocuments.additional_docs.length < 5) {
      setLandDocuments(prev => ({
        ...prev,
        additional_docs: [...prev.additional_docs, { name: '', files: [] }]
      }));
    }
  };

  const removeAdditionalDoc = (index) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.filter((_, i) => i !== index)
    }));
  };

  const updateAdditionalDocName = (index, name) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.map((doc, i) => 
        i === index ? { ...doc, name } : doc
      )
    }));
  };

  const updateAdditionalDocFiles = (index, files) => {
    const file = files[0]; // Only take the first file
    if (file) {
      setLandDocuments(prev => ({
        ...prev,
        additional_docs: prev.additional_docs.map((doc, i) => 
          i === index ? { ...doc, files: [file] } : doc // Single file only
        )
      }));
    }
  };

  const removeAdditionalDocFile = (docIndex, fileIndex) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.map((doc, i) => 
        i === docIndex ? {
          ...doc, 
          files: doc.files.filter((_, fi) => fi !== fileIndex)
        } : doc
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, documents: [] };
      const dealRes = await dealAPI.create(payload);
      const dealId = dealRes.data.deal_id || dealRes.data.id;
      let allUploadsSuccessful = true;
      
      // Upload land documents by type
      const landDocTypes = Object.keys(landDocuments);
      for (const docType of landDocTypes) {
        if (docType === 'additional_docs') {
          // Handle additional docs with custom names
          for (const additionalDoc of landDocuments.additional_docs) {
            if (additionalDoc.name && additionalDoc.files.length > 0) {
              for (const file of additionalDoc.files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('deal_id', dealId);
                formData.append('document_type', additionalDoc.name || 'additional_document');
                try {
                  await dealAPI.uploadDocument(formData);
                } catch (uploadErr) {
                  toast.error(`Failed to upload ${additionalDoc.name} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
                  allUploadsSuccessful = false;
                }
              }
            }
          }
        } else {
          // Handle regular document types
          const docsOfType = landDocuments[docType];
          for (const file of docsOfType) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('deal_id', dealId);
            formData.append('document_type', docType);
            try {
              await dealAPI.uploadDocument(formData);
            } catch (uploadErr) {
              toast.error(`Failed to upload ${docType} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
              allUploadsSuccessful = false;
            }
          }
        }
      }

      if (allUploadsSuccessful) {
        toast.success('Deal created successfully!');
      } else {
        toast.error('Deal created, but some documents failed to upload.');
      }
      
      // Clear loading state before navigation to prevent rendering issues
      setLoading(false);
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        router.push(`/deals/${dealId}`);
      }, 100);
    } catch (err) {
      toast.error('Failed to create deal: ' + (err?.response?.data?.error || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Navigation */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={() => router.push('/login')} />
      </div>

      {/* Page Header */}
      <div className="w-full">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Create New Deal</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  // Ensure clean navigation without loading conflicts
                  if (!loading) {
                    router.push('/dashboard');
                  }
                }}
                className="px-6 py-3 text-sm bg-white text-slate-900 border border-slate-300 hover:bg-white cursor-pointer rounded"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="w-full h-full">
          <div className="w-full px-4 py-4 bg-white">

            {/* Project & Land Details with Documents */}
            <section className="p-4">
              <h2 className="text-lg font-medium text-slate-900 mb-4 pb-2 border-b border-slate-200">
                Project & Land Details with Documents
              </h2>
              
              {/* Basic Project Information */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-slate-800 mb-3">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <Input label="Project Name" name="project_name" value={form.project_name} onChange={handleChange} required />
                  <Input label="Survey Number" name="survey_number" value={form.survey_number} onChange={handleChange} required />
                  
                  {/* Purchase Date Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Purchase Date</label>
                    <input
                      type="date"
                      name="purchase_date"
                      value={form.purchase_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>
                  
                  {/* Location free-text removed: use structured Taluka/Village fields instead */}

                  {/* Taluka Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Taluka</label>
                    <input
                      type="text"
                      name="taluka"
                      value={form.taluka}
                      onChange={handleChange}
                      placeholder="Enter taluka name"
                      className="w-full px-3 py-2 border border-slate-300 rounded  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 "
                      required
                    />
                  </div>

                  {/* Village Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Village</label>
                    <input
                      type="text"
                      name="village"
                      value={form.village}
                      onChange={handleChange}
                      placeholder="Enter village name"
                      className="w-full px-3 py-2 border border-slate-300 rounded  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 "
                      required
                    />
                  </div>
                  
                  {/* Total Area with Units */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Area</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        name="total_area" 
                        value={form.total_area} 
                        onChange={handleChange} 
                        placeholder="Enter area"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 "
                      />
                      <select 
                        name="area_unit" 
                        value={form.area_unit} 
                        onChange={handleChange} 
                        className="px-3 py-2 border border-slate-300 rounded  focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="Acre">Acre</option>
                        <option value="Guntha">Guntha</option>
                        <option value="Hectare">Hectare</option>
                        <option value="Sq Ft">Sq Ft</option>
                        <option value="Sq Meter">Sq Meter</option>
                        <option value="Bigha">Bigha</option>
                        <option value="Katha">Katha</option>
                        <option value="Cent">Cent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded  focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="commission">Commission</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Land Documents Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Land Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* 7/12 Extract */}
                  <div className="h-fit">
                    <DocumentUploadField
                      title="7/12"
                      documents={landDocuments.extract}
                      onChange={(e) => handleLandDocumentChange('extract', e)}
                      onRemove={(index) => removeLandDocument('extract', index)}
                    />
                  </div>

                  {/* Additional Documents - Side by Side */}
                  <div className="h-fit">
                    <AdditionalDocsField
                      additionalDocs={landDocuments.additional_docs}
                      onAdd={addAdditionalDoc}
                      onRemove={removeAdditionalDoc}
                      onUpdateName={updateAdditionalDocName}
                      onUpdateFiles={updateAdditionalDocFiles}
                      onRemoveFile={removeAdditionalDocFile}
                    />
                  </div>

                </div>
              </div>
            </section>

            {/* Owners & Documents */}
            <section className="p-4">
              <h2 className="text-lg font-medium text-slate-900 mb-4 pb-2 border-b border-slate-200">
                Owners & Documents
              </h2>
              
              {/* Individual Owners with their Documents */}
              <div className="space-y-4">
                {form.owners.map((owner, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded p-4">
                    {/* Owner Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-medium text-slate-800">
                        Owner {idx + 1} {owner.name && `- ${owner.name}`}
                      </h3>
                      {form.owners.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeOwnerWithType(idx)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium  px-3 py-1 rounded border border-red-300 hover:border-red-400"
                        >
                          Remove Owner
                        </button>
                      )}
                    </div>

                    {/* Owner Type Selection */}
                    <div className="mb-3 p-2 border border-slate-200 rounded">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Owner Type</span>
                      <div className="flex gap-2">
                        <div 
                          className={`p-2 border rounded cursor-pointer flex-1 ${
                            (ownerSelectionTypes[idx] || 'new') === 'new' 
                              ? 'border-slate-500 bg-white' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleOwnerTypeChange(idx, 'new')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`ownerType-${idx}`}
                              value="new"
                              checked={(ownerSelectionTypes[idx] || 'new') === 'new'}
                              onChange={() => handleOwnerTypeChange(idx, 'new')}
                              className="mr-2 w-3 h-3 text-slate-600"
                            />
                            <span className="text-xs font-medium text-slate-900">New Owner</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">Create a new owner profile</p>
                        </div>
                        
                        <div 
                          className={`p-2 border rounded cursor-pointer flex-1 ${
                            ownerSelectionTypes[idx] === 'existing' 
                              ? 'border-slate-500 bg-white' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleOwnerTypeChange(idx, 'existing')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`ownerType-${idx}`}
                              value="existing"
                              checked={ownerSelectionTypes[idx] === 'existing'}
                              onChange={() => handleOwnerTypeChange(idx, 'existing')}
                              className="mr-2 w-3 h-3 text-slate-600"
                            />
                            <span className="text-xs font-medium text-slate-900">Starred Owner</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">Select from {existingOwners.length} starred owners</p>
                        </div>
                      </div>
                      
                      {/* Starred Owner Dropdown */}
                      {ownerSelectionTypes[idx] === 'existing' && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-700 mb-1 block">Select Starred Owner</span>
                          <select
                            value={selectedExistingOwners[idx] || ''}
                            onChange={(e) => handleExistingOwnerSelect(idx, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="">Choose a starred owner</option>
                            {existingOwners.map((existingOwner) => (
                              <option key={existingOwner.id} value={existingOwner.id}>
                                {existingOwner.name} - {existingOwner.mobile || 'No mobile'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Owner Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Owner Information
                        {ownerSelectionTypes[idx] === 'existing' && (
                          <span className="ml-2 text-xs text-slate-800 bg-white px-2 py-1 rounded border">(From Starred Owner)</span>
                        )}
                      </h4>
                      
                      {ownerSelectionTypes[idx] === 'existing' ? (
                        // Read-only view for existing owners
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Owner Name</label>
                            <div className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-sm">
                              {owner.name || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
                            <div className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-sm">
                              {owner.mobile || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Aadhaar Card</label>
                            <div className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-sm">
                              {owner.aadhar_card || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">PAN Card</label>
                            <div className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-sm">
                              {owner.pan_card || 'Not provided'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Editable form for new owners
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Owner Name *</label>
                            <input
                              type="text"
                              name="name"
                              value={owner.name}
                              onChange={(e) => handleArrayChange('owners', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="Owner Name"
                              required
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                            <input
                              type="tel"
                              name="mobile"
                              value={owner.mobile}
                              onChange={(e) => handleArrayChange('owners', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="Mobile Number"
                              pattern="[0-9]{10}"
                              title="Enter 10-digit mobile number"
                              maxLength="10"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Card</label>
                            <input
                              type="text"
                              name="aadhar_card"
                              value={owner.aadhar_card}
                              onChange={(e) => handleArrayChange('owners', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="XXXX XXXX XXXX"
                              pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                              title="Enter 12-digit Aadhaar number"
                              maxLength="14"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">PAN Card</label>
                            <input
                              type="text"
                              name="pan_card"
                              value={owner.pan_card}
                              onChange={(e) => handleArrayChange('owners', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="ABCDE1234F"
                              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                              title="Enter valid PAN card number (5 letters, 4 digits, 1 letter)"
                              maxLength="10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ))}

                {/* Add Owner Button - Moved to Bottom */}
                <div className="flex justify-center pt-4">
                  <button 
                    type="button" 
                    onClick={() => addOwnerWithType()} 
                    className="flex items-center text-black hover:text-slate-800 text-sm font-medium px-4 py-2 border border-black rounded hover:border-slate-800 hover:bg-white"
                  >
                    + Add Owner
                  </button>
                </div>
              </div>
            </section>

            {/* Investors */}
            <section className="p-4">
              <h2 className="text-lg font-medium text-slate-900 mb-4 pb-2 border-b border-slate-200">
                Investors & Documents
              </h2>
              
              {/* Individual Investors with their Documents */}
              <div className="space-y-4">
                {form.investors.map((investor, investorIdx) => (
                  <div key={investorIdx} className="bg-white border border-slate-200 rounded p-4">
                    {/* Investor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-medium text-slate-800">
                        Investor {investorIdx + 1} {investor.investor_name && `- ${investor.investor_name}`}
                      </h3>
                      {form.investors.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeInvestorWithType(investorIdx)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium  px-3 py-1 rounded border border-red-300 hover:border-red-400"
                        >
                          Remove Investor
                        </button>
                      )}
                    </div>

                    {/* Investor Type Selection */}
                    <div className="mb-3 p-2 border border-gray-200 rounded">
                      <span className="text-xs font-medium text-gray-700 mb-2 block">Investor Type</span>
                      <div className="flex gap-2">
                        <div 
                          className={`p-2 border rounded cursor-pointer flex-1 ${
                            (investorSelectionTypes[investorIdx] || 'new') === 'new' 
                              ? 'border-slate-500 bg-white' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleInvestorTypeChange(investorIdx, 'new')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`investorType-${investorIdx}`}
                              value="new"
                              checked={(investorSelectionTypes[investorIdx] || 'new') === 'new'}
                              onChange={() => handleInvestorTypeChange(investorIdx, 'new')}
                              className="mr-2 w-3 h-3 text-black"
                            />
                            <span className="text-xs font-medium text-gray-900">New Investor</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Create a new investor profile</p>
                        </div>
                        
                        <div 
                          className={`p-2 border rounded cursor-pointer flex-1 ${
                            investorSelectionTypes[investorIdx] === 'existing' 
                              ? 'border-slate-500 bg-white' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleInvestorTypeChange(investorIdx, 'existing')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`investorType-${investorIdx}`}
                              value="existing"
                              checked={investorSelectionTypes[investorIdx] === 'existing'}
                              onChange={() => handleInvestorTypeChange(investorIdx, 'existing')}
                              className="mr-2 w-3 h-3 text-black"
                            />
                            <span className="text-xs font-medium text-gray-900">Starred Investor</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Select from {existingInvestors.length} starred investors</p>
                        </div>
                      </div>
                      
                      {/* Existing Investor Dropdown */}
                      {investorSelectionTypes[investorIdx] === 'existing' && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-700 mb-1 block">Select Starred Investor</span>
                          <select
                            value={selectedExistingInvestors[investorIdx] || ''}
                            onChange={(e) => handleExistingInvestorSelect(investorIdx, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="">Choose a starred investor</option>
                            {existingInvestors.map((existingInvestor) => (
                              <option key={existingInvestor.id} value={existingInvestor.id}>
                                {existingInvestor.investor_name} - {existingInvestor.mobile || 'No mobile'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Investor Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Investor Information
                        {investorSelectionTypes[investorIdx] === 'existing' && (
                          <span className="ml-2 text-xs text-slate-800 bg-white px-2 py-1 rounded border">(From Starred Investor)</span>
                        )}
                      </h4>
                      
                      {investorSelectionTypes[investorIdx] === 'existing' ? (
                        // Read-only view for existing investors
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Investor Name</label>
                            <div className="p-2 bg-white border border-slate-200 rounded text-sm text-slate-800">
                              {investor.investor_name || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mobile</label>
                            <div className="p-2 bg-white border border-slate-200 rounded text-sm text-slate-800">
                              {investor.mobile || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Aadhaar Card</label>
                            <div className="p-2 bg-white border border-slate-200 rounded text-sm text-slate-800">
                              {investor.aadhar_card || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">PAN Card</label>
                            <div className="p-2 bg-white border border-slate-200 rounded text-sm text-slate-800">
                              {investor.pan_card || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Editable form for new investors
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investor Name *</label>
                            <input
                              type="text"
                              name="investor_name"
                              value={investor.investor_name}
                              onChange={(e) => handleArrayChange('investors', investorIdx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="Enter investor name"
                              required
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
                            <input
                              type="tel"
                              name="mobile"
                              value={investor.mobile}
                              onChange={(e) => handleArrayChange('investors', investorIdx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="10-digit mobile number"
                              pattern="[0-9]{10}"
                              maxLength="10"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Card</label>
                            <input
                              type="text"
                              name="aadhar_card"
                              value={investor.aadhar_card}
                              onChange={(e) => handleArrayChange('investors', investorIdx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="XXXX XXXX XXXX"
                              pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                              maxLength="14"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">PAN Card</label>
                            <input
                              type="text"
                              name="pan_card"
                              value={investor.pan_card}
                              onChange={(e) => handleArrayChange('investors', investorIdx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="ABCDE1234F"
                              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                              maxLength="10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ))}

                {/* Add Investor Button - Moved to Bottom */}
                <div className="flex justify-center pt-4">
                  <button 
                    type="button" 
                    onClick={addInvestorWithType}
                    className="flex items-center text-black hover:text-slate-800 text-sm font-medium px-4 py-2 border border-black rounded hover:border-slate-800 hover:bg-white"
                  >
                    + Add Investor
                  </button>
                </div>
              </div>
            </section>



          </div>

          {/* Submit Button Section - Consistent with Dashboard */}
          <div className="bg-white border-t border-slate-200 px-4 py-3">
            <div className="max-w-md mx-auto flex space-x-3">
              <button 
                type="button"
                onClick={() => {
                  // Ensure clean navigation without loading conflicts
                  if (!loading) {
                    router.push('/dashboard');
                  }
                }}
                className="flex-1 bg-white text-slate-700 px-4 py-2 rounded border border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Minimal UI helper components ----
function Input({ label, pattern, title, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <input 
        {...props} 
        pattern={pattern}
        title={title}
        className="w-full px-3 py-2 border border-slate-300 rounded  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 " 
      />
    </div>
  );
}

function AdditionalDocsField({ additionalDocs, onAdd, onRemove, onUpdateName, onUpdateFiles, onRemoveFile }) {
  return (
    <div className="border border-slate-200 rounded p-4 max-h-80 overflow-y-auto bg-white">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-900">Additional Documents</span>
        {additionalDocs.length < 5 && (
          <button
            type="button"
            onClick={onAdd}
            className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 text-slate-700"
          >
            + Add Document
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {additionalDocs.map((doc, docIndex) => (
          <div key={docIndex} className="bg-slate-50 rounded p-3 border-l-4 border-slate-300">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={doc.name}
                onChange={(e) => onUpdateName(docIndex, e.target.value)}
                placeholder="Enter document name"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              {additionalDocs.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(docIndex)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove document"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                onChange={(e) => onUpdateFiles(docIndex, e.target.files)}
                className="hidden"
                id={`additional-upload-${docIndex}`}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <label
                htmlFor={`additional-upload-${docIndex}`}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Choose File
              </label>
              <span className="text-sm text-slate-500 flex-1">
                {doc.files.length > 0 ? doc.files[0].name : 'No file chosen'}
              </span>
            </div>

            {/* Uploaded File Display */}
            {doc.files.length > 0 && (
              <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">📄</span>
                    <span className="text-sm text-slate-700 truncate" title={doc.files[0].name}>
                      {doc.files[0].name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(docIndex, 0)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentUploadField({ title, documents = [], onChange, onRemove, uniqueId = '' }) {
  const inputId = `upload-${uniqueId ? uniqueId + '-' : ''}${title.replace(/\s+/g, '-').toLowerCase()}`;
  const inputRef = React.useRef(null);
  
  const handleFileChange = (e) => {
    onChange(e);
    // Clear the input after processing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }, 100);
  };

  return (
    <div className="border border-slate-200 rounded p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">{title}</span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id={inputId}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <label
            htmlFor={inputId}
            className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-700 text-xs rounded cursor-pointer hover:bg-slate-200"
          >
            Choose File
          </label>
          <span className="text-xs text-slate-500">
            {documents && documents.length > 0 ? `1 file selected` : 'No file chosen'}
          </span>
        </div>
      </div>

      {/* Uploaded File Display */}
      {documents && documents.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1">
            <span className="text-xs text-slate-700 truncate" title={documents[0].name}>
              📄 {documents[0].name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(0)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
