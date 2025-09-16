import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../../lib/auth';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import Navbar from '../../components/layout/Navbar';
import { 
  Users, 
  Settings, 
  Shield, 
  Database,
  Activity,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check authentication and admin permission
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const userData = getUser();
    if (!hasPermission(userData, PERMISSIONS.ADMIN_ACCESS)) {
      router.push('/dashboard');
      return;
    }
    
    setUser(userData);
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage system users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'System Maintenance',
      description: 'Database maintenance and system configuration',
      icon: Settings,
      href: '/admin/maintenance',
      color: 'slate',
      bgColor: 'bg-slate-50',
      iconColor: 'text-slate-600',
      borderColor: 'border-slate-200'
    }
  ];

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="bg-white border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Administration Panel</h1>
                <p className="text-slate-600 mt-1">System management and configuration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">System Status</p>
                  <p className="text-lg font-bold text-green-600 mt-2">Operational</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Database</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">Connected</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Security</p>
                  <p className="text-lg font-bold text-green-600 mt-2">Secure</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Alerts</p>
                  <p className="text-lg font-bold text-slate-600 mt-2">0</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Modules */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Administrative Modules</h3>
            <p className="text-sm text-slate-600 mt-1">Access system management features</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {adminModules.map((module, index) => {
                const IconComponent = module.icon;
                return (
                  <Link 
                    key={index}
                    href={module.href}
                    className={`block p-6 rounded-lg border ${module.borderColor} ${module.bgColor} hover:shadow-md transition-all duration-200 hover:border-${module.color}-300 group`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${module.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                        <IconComponent className={`w-6 h-6 ${module.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-slate-700">
                          {module.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}