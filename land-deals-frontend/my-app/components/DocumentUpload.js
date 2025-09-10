// components/DocumentUpload.js
import React, { useState, useEffect, useCallback } from 'react';
import { dealAPI } from '../lib/api';
import toast from 'react-hot-toast';

const DocumentUpload = ({ dealId, category, entityId = null, entityType = null, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');

  const fetchDocumentTypes = useCallback(async () => {
    try {
      const response = await dealAPI.getDocumentTypes();
      const types = response.data.document_types || {};
      setDocumentTypes(types[category] || []);
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  }, [category]);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toast.error('Please select files to upload');
      return;
    }

    if (!selectedDocumentType) {
      toast.error('Please select a document type');
      return;
    }

    setUploading(true);

    try {
      let uploaded = 0;
      const errors = [];

      // Upload files one-by-one using 'file' field which backend structured endpoints expect
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', selectedDocumentType);

        try {
          if (category === 'land') {
            await dealAPI.uploadLandDocuments(dealId, formData);
          } else if (category === 'owner' && entityId) {
            await dealAPI.uploadOwnerDocuments(dealId, entityId, formData);
          } else if (category === 'investor' && entityId) {
            await dealAPI.uploadInvestorDocuments(dealId, entityId, formData);
          } else {
            throw new Error('Invalid upload configuration');
          }

          uploaded += 1;
        } catch (err) {
          console.error('Upload error for file', file.name, err);
          errors.push({ file: file.name, error: err.response?.data?.error || err.message || 'Upload failed' });
        }
      }

      if (uploaded > 0) {
        toast.success(`Successfully uploaded ${uploaded} document${uploaded !== 1 ? 's' : ''}`);
      }

      if (errors.length > 0) {
        const msg = errors.map(e => `${e.file}: ${e.error}`).join('; ');
        toast.error(`Some files failed: ${msg}`);
      }

      // Reset form
      setSelectedFiles([]);
      setSelectedDocumentType('');

      // Clear file input
      const fileInput = document.getElementById(`file-input-${category}-${entityId || 'default'}`);
      if (fileInput) {
        fileInput.value = '';
      }

      // Callback to parent component
      if (onUploadSuccess) {
        onUploadSuccess({ uploaded, errors });
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload documents';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'land': return 'Land Documents';
      case 'owner': return `Owner Documents${entityType ? ` (${entityType})` : ''}`;
      case 'investor': return `Investor Documents${entityType ? ` (${entityType})` : ''}`;
      default: return 'Documents';
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <svg className="w-5 h-5 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload {getCategoryLabel()}
      </h3>

      <div className="space-y-4">
        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Document Type
          </label>
          <select
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select document type</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Files
          </label>
          <input
            id={`file-input-${category}-${entityId || 'default'}`}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
            onChange={handleFileSelection}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">
            Supported formats: PDF, JPG, PNG, GIF, DOC, DOCX (Max 10MB each)
          </p>
        </div>

        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Selected Files ({selectedFiles.length})
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-md">
                  {getFileIcon(file.name)}
                  <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length || !selectedDocumentType}
          className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-200 ${
            uploading || !selectedFiles.length || !selectedDocumentType
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </div>
          ) : (
            `Upload ${selectedFiles.length} Document${selectedFiles.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;
