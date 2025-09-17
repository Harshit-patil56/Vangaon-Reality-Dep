import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, User, LogOut } from "lucide-react";
import { hasPer              {hasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && user?.role !== 'user' && (
                <Link 
                  href="/payments" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payments
                </Link>
              )}

              {hasPermission(user, PERMISSIONS.OWNERS_VIEW) && user?.role !== 'user' && (
                <Link 
                  href="/owners" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 715.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Owners
                </Link>
              )}n, PERMISSIONS } from "../../lib/permissions";

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white border-b border-slate-200 shadow-sm relative">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 flex items-center justify-center">
              <Image 
                src="/vangaon-logo.svg" 
                alt="Vangaon Reality Logo" 
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900">Vangaon Reality</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-8">
            {/* Dashboard - only show for admin/auditor */}
            {user?.role !== 'user' && (
              <Link href="/dashboard" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Dashboard
              </Link>
            )}
            {/* Owners - only show for admin/auditor */}
            {user?.role !== 'user' && (
              <Link href="/owners" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Owners
              </Link>
            )}
            {/* Investors - only show for admin/auditor */}
            {user?.role !== 'user' && (
              <Link href="/investors" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Investors
              </Link>
            )}
            {/* My Portfolio - only show for regular users */}
            {user?.role === 'user' && user?.investor_id && (
              <Link href={`/investors/${user.investor_id}`} className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                My Portfolio
              </Link>
            )}
            {hasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && user?.role !== 'user' && (
              <Link href="/payments" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Payments
              </Link>
            )}
            {hasPermission(user, PERMISSIONS.ADMIN_ACCESS) && (
              <Link href="/admin" className="text-red-700 hover:text-red-900 font-medium transition-colors duration-200">
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-3">
              <div className="w-9 h-9 bg-slate-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{user?.username || 'User'}</span>
                <span className="text-xs text-slate-500 capitalize">{user?.role || 'role'}</span>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="hidden lg:flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>

            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg z-50">
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{user?.username || 'User'}</p>
                <p className="text-sm text-slate-500 capitalize">{user?.role || 'role'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Dashboard - only show for admin/auditor */}
              {user?.role !== 'user' && (
                <Link 
                  href="/dashboard" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 5 4-4 4 4" />
                  </svg>
                  Dashboard
                </Link>
              )}

              {/* Owners - only show for admin/auditor */}
              {user?.role !== 'user' && (
                <Link 
                  href="/owners" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Owners
                </Link>
              )}

              {/* Investors - only show for admin/auditor */}
              {user?.role !== 'user' && (
                <Link 
                  href="/investors" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Investors
                </Link>
              )}

              {/* My Portfolio - only show for regular users */}
              {user?.role === 'user' && user?.investor_id && (
                <Link 
                  href={`/investors/${user.investor_id}`} 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 715 0z" />
                  </svg>
                  My Portfolio
                </Link>
              )}

              {hasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && user?.role !== 'user' && (
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Owners
              </Link>

              <Link 
                href="/investors" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Investors
              </Link>

              {hasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && (
                <Link 
                  href="/payments" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payments
                </Link>
              )}

              {hasPermission(user, PERMISSIONS.ADMIN_ACCESS) && (
                <Link 
                  href="/admin" 
                  className="flex items-center px-4 py-3 text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </Link>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center w-full px-4 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
