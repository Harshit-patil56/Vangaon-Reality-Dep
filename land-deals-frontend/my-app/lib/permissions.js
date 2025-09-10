// lib/permissions.js - Role-based permissions system

export const ROLES = {
  ADMIN: 'admin',
  AUDITOR: 'auditor', 
  USER: 'user'
}

export const PERMISSIONS = {
  // Deal permissions
  DEALS_VIEW: 'deals:view',
  DEALS_CREATE: 'deals:create',
  DEALS_EDIT: 'deals:edit', 
  DEALS_DELETE: 'deals:delete',
  
  // User management permissions
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  // Payment permissions
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_EDIT: 'payments:edit',
  PAYMENTS_DELETE: 'payments:delete',
  
  // Document permissions
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_DELETE: 'documents:delete',
  
  // Financial data permissions
  FINANCIALS_VIEW: 'financials:view',
  FINANCIALS_EDIT: 'financials:edit',
  
  // System administration
  SYSTEM_ADMIN: 'system:admin',
  REPORTS_GENERATE: 'reports:generate',
  
  // Admin panel access
  ADMIN_ACCESS: 'admin:access'
}

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Admins can do everything
    PERMISSIONS.DEALS_VIEW,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_EDIT,
    PERMISSIONS.DEALS_DELETE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
    PERMISSIONS.PAYMENTS_DELETE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.FINANCIALS_VIEW,
    PERMISSIONS.FINANCIALS_EDIT,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.ADMIN_ACCESS
  ],
  
  [ROLES.AUDITOR]: [
    // Auditors can view, create, and edit but not delete
    PERMISSIONS.DEALS_VIEW,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_EDIT,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.FINANCIALS_VIEW,
    PERMISSIONS.FINANCIALS_EDIT,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.ADMIN_ACCESS
  ],
  
  [ROLES.USER]: [
    // Users can only view
    PERMISSIONS.DEALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.FINANCIALS_VIEW
  ]
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with role property
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false
  }
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || []
  return userPermissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 * @param {Object} user - User object with role property
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if a user has all specified permissions
 * @param {Object} user - User object with role property
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Get all permissions for a user role
 * @param {string} role - User role
 * @returns {string[]} - Array of permissions
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if user can perform action on resource
 * @param {Object} user - User object
 * @param {string} action - Action (view, create, edit, delete)
 * @param {string} resource - Resource (deals, payments, users, etc.)
 * @returns {boolean} - True if action is allowed
 */
export function canPerformAction(user, action, resource) {
  const permission = `${resource}:${action}`
  return hasPermission(user, permission)
}

/**
 * Higher-order component to protect routes based on permissions
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {React.Component} FallbackComponent - Component to show if no permission
 */
export function withPermission(WrappedComponent, requiredPermissions, FallbackComponent = null) {
  return function PermissionWrappedComponent(props) {
    const { user, ...otherProps } = props
    
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
    const hasAccess = hasAnyPermission(user, permissions)
    
    if (!hasAccess) {
      if (FallbackComponent) {
        return <FallbackComponent {...otherProps} />
      }
      return (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h3>
            <p className="text-slate-600">You don&apos;t have permission to access this feature.</p>
          </div>
        </div>
      )
    }
    
    return <WrappedComponent user={user} {...otherProps} />
  }
}

/**
 * React hook to check permissions
 * @param {Object} user - User object
 * @param {string|string[]} permissions - Permission(s) to check
 * @returns {boolean} - True if user has permission(s)
 */
export function usePermissions(user, permissions) {
  if (Array.isArray(permissions)) {
    return hasAnyPermission(user, permissions)
  }
  return hasPermission(user, permissions)
}

/**
 * Utility to get user-friendly role names
 * @param {string} role - Role key
 * @returns {string} - User-friendly role name
 */
export function getRoleName(role) {
  const roleNames = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.AUDITOR]: 'Auditor',
    [ROLES.USER]: 'User'
  }
  return roleNames[role] || 'Unknown'
}

/**
 * Utility to get role descriptions
 * @param {string} role - Role key
 * @returns {string} - Role description
 */
export function getRoleDescription(role) {
  const roleDescriptions = {
    [ROLES.ADMIN]: 'Full system access - can create, edit, and delete all content',
    [ROLES.AUDITOR]: 'Can create and edit deals and payments, but cannot delete anything',
    [ROLES.USER]: 'Read-only access - can view deals, payments, and reports'
  }
  return roleDescriptions[role] || 'No description available'
}

const permissionsExport = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  canPerformAction,
  withPermission,
  usePermissions,
  getRoleName,
  getRoleDescription
}

export default permissionsExport
