// components/StructuredDocumentViewer.js
import React, { useState, useEffect, useCallback } from 'react';
import { dealAPI } from '../lib/api';
import toast from 'react-hot-toast';

const StructuredDocumentViewer = ({ dealId, refreshTrigger }) => {
  const [documentStructure, setDocumentStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  const fetchDocumentStructure = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dealAPI.getDocumentStructure(dealId);
      setDocumentStructure(response.data);
    } catch (error) {
      console.error('Error fetching document structure:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDocumentStructure();
  }, [dealId, refreshTrigger, fetchDocumentStructure]);

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleViewDocument = (filePath) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const documentUrl = `${baseUrl}/uploads/${filePath}`;
    window.open(documentUrl, '_blank');
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v1h1.5v1.5H17.5V7h3v1.5zM9 10.5h1V8.5H9v2z"/>
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'land':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        );
      case 'owner':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'investor':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatDocumentType = (type) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const formatFileSize = (size) => {
    if (!size) return 'Unknown size';
    const mb = (size / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!documentStructure) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-600">No documents found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center">
          <svg className="w-6 h-6 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Document Library
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Organized documents by category and type
        </p>
      </div>

      <div className="p-6 space-y-6">
        {Object.entries(documentStructure).map(([category, categoryData]) => {
          const sectionKey = category;
          const isExpanded = expandedSections[sectionKey] !== false; // Default to expanded

          return (
            <div key={category} className="border border-slate-200 rounded-lg">
              <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors duration-200 flex items-center justify-between text-left rounded-t-lg"
              >
                <div className="flex items-center">
                  {getCategoryIcon(category)}
                  <span className="ml-3 font-semibold text-slate-900 capitalize">
                    {category} Documents
                  </span>
                  <span className="ml-2 text-sm text-slate-500">
                    ({categoryData.total_documents} documents)
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  {Object.entries(categoryData.by_type || {}).map(([documentType, documents]) => (
                    <div key={documentType} className="border-l-4 border-slate-300 pl-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        {formatDocumentType(documentType)} ({documents.length})
                      </h4>
                      <div className="space-y-2">
                        {documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors duration-200"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {getFileIcon(doc.file_name)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {doc.file_name}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-slate-500">
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  <span>
                                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                  </span>
                                  {doc.entity_name && (
                                    <span>• {doc.entity_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewDocument(doc.structured_path)}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {(!categoryData.by_type || Object.keys(categoryData.by_type).length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">No {category} documents uploaded yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(documentStructure).length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm">Upload documents using the upload sections above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StructuredDocumentViewer;
