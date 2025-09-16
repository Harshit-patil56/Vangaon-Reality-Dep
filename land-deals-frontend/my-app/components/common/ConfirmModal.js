// components/common/ConfirmModal.js - Modern modal system inspired by GitHub/Linear
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  confirmButtonClass = "bg-slate-600 hover:bg-slate-700"
}) {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleConfirm = async () => {
    if (isLoading) return // Prevent double-clicks
    
    try {
      setIsLoading(true)
      await onConfirm()
      onClose()
    } catch (error) {
      // Error will be handled by the calling component
      console.error('Error in confirm action:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonClass = isDestructive 
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
    : confirmButtonClass + ' focus:ring-slate-500'

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${buttonClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {confirmText}...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document.body level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Specialized modals for common actions
export function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName = 'item', dealData }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Confirmation"
      message={`Are you sure you want to delete this ${itemName}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      isDestructive={true}
    />
  )
}

export function CloseConfirmModal({ isOpen, onClose, onConfirm, dealData }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Close Deal"
      message="Are you sure you want to close this deal? This will change the deal status to closed."
      confirmText="Close Deal"
      cancelText="Cancel"
      confirmButtonClass="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
    />
  )
}

// General purpose delete modal for investors, owners, payments etc.
export function GeneralDeleteModal({ isOpen, onClose, onConfirm, title, message, itemType = 'item' }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title || "Delete Confirmation"}
      message={message || `Are you sure you want to delete this ${itemType}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      isDestructive={true}
    />
  )
}

// Modal for actions that need user input (like notes)
export function InputModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  placeholder = "Enter text...",
  confirmText = "Confirm",
  cancelText = "Cancel"
}) {
  const [inputValue, setInputValue] = useState('')

  const handleConfirm = () => {
    onConfirm(inputValue)
    setInputValue('')
    onClose()
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>

        <div className="px-6 py-4">
          <p className="text-slate-600 leading-relaxed mb-4">{message}</p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm()
              }
            }}
          />
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return isOpen && typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Alert modal for notifications
export function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info' // 'info', 'success', 'warning', 'error'
}) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'warning':
        return '⚠'
      case 'error':
        return '✗'
      default:
        return 'ℹ'
    }
  }

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-orange-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center">
            <span className={`text-2xl mr-3 ${getColor()}`}>{getIcon()}</span>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return isOpen && typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}
