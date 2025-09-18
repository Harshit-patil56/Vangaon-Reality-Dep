import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../../lib/auth';
import { hasPermission, PERMISSIONS } from '../../lib/permissions';
import Navbar from '../../components/layout/Navbar';
import { 
  Users,
  Shield
} from 'lucide-react';export default function AdminDashboard() {
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
    if (!hasPermission(userData, PERMISSIONS.SYSTEM_ADMIN)) {
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
          <div className="flex items-center justify-between mobile-header-stack">
            <div className="flex items-center mobile-header-content">
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
      <div className="w-full px-6 py-8 space-y-8 mobile-content-padding">
        
        {/* Admin Modules */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Administrative Modules</h3>
            <p className="text-sm text-slate-600 mt-1">Access system management features</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mobile-admin-grid">
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

      {/* Mobile Responsive CSS */}
      <style jsx>{`
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
          
          .mobile-content-padding {
            padding: 1rem;
          }
          
          .mobile-admin-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem;
          }
          
          /* Responsive text sizes */
          h1 {
            font-size: 1.5rem !important;
          }
          
          h3 {
            font-size: 1.125rem !important;
          }
          
          h4 {
            font-size: 1rem !important;
          }
          
          /* Make cards more mobile-friendly */
          .block.p-6 {
            padding: 1rem !important;
          }
          
          /* Improve icon spacing on mobile */
          .w-12.h-12 {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}