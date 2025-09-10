// components/common/PermissionButton.js - Permission-aware button component

import { hasPermission } from '../../lib/permissions'

export default function PermissionButton({ 
  user, 
  permission, 
  children, 
  className = '', 
  disabled = false,
  fallback = null,
  ...props 
}) {
  const hasAccess = hasPermission(user, permission)
  
  if (!hasAccess) {
    return fallback
  }
  
  return (
    <button 
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

// Specialized permission buttons for common actions
export function CreateButton({ user, resource, children, ...props }) {
  return (
    <PermissionButton
      user={user}
      permission={`${resource}:create`}
      className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
      {...props}
    >
      {children}
    </PermissionButton>
  )
}

export function EditButton({ user, resource, children, ...props }) {
  return (
    <PermissionButton
      user={user}
      permission={`${resource}:edit`}
      className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
      {...props}
    >
      {children}
    </PermissionButton>
  )
}

export function DeleteButton({ user, resource, children, ...props }) {
  return (
    <PermissionButton
      user={user}
      permission={`${resource}:delete`}
      className="inline-flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
      {...props}
    >
      {children}
    </PermissionButton>
  )
}
