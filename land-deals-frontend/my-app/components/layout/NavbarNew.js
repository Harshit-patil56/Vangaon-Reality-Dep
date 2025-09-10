// components/layout/Navbar.js - Professional Navbar Component
import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white border-b border-slate-200 shadow-sm relative">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Left: Logo/App Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900">Property Hub</span>
              <p className="text-xs text-slate-600 hidden sm:block">Management System</p>
            </div>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/dashboard" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Dashboard
            </Link>
            <Link href="/deals/deals" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              All Deals
            </Link>
            <Link href="/owners" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Owners
            </Link>
            <Link href="/investors" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Investors
            </Link>
            {hasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && (
              <Link href="/payments" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Payments
              </Link>
            )}
            {hasPermission(user, PERMISSIONS.REPORTS_GENERATE) && (
              <Link href="/reports" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
                Reports
              </Link>
            )}
            {hasPermission(user, PERMISSIONS.ADMIN_ACCESS) && (
              <Link href="/admin" className="text-red-700 hover:text-red-900 font-medium transition-colors duration-200 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Right: User info and logout (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(user?.full_name || user?.name || "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900 font-semibold text-sm block">
                    {user?.full_name || user?.name || "User"}
                  </span>
                  {hasPermission(user, PERMISSIONS.ADMIN_ACCESS) && (
                    <Link href="/admin" aria-label="Open admin panel">
                      <span className="text-[11px] leading-4 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium cursor-pointer">
                        Admin
                      </span>
                    </Link>
                  )}
                </div>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role || "Member"}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 font-medium text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-slate-700" />
            ) : (
              <Menu className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg z-50 md:hidden">
          <div className="px-6 py-4 space-y-4">
            
            {/* User info section for mobile */}
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(user?.full_name || user?.name || "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900 font-semibold text-base block">
                    {user?.full_name || user?.name || "User"}
                  </span>
                  {hasPermission(user, PERMISSIONS.ADMIN_ACCESS) && (
                    <Link href="/admin" aria-label="Open admin panel">
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium cursor-pointer">
                        Admin
                      </span>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-slate-600 capitalize">
                  {user?.role || "Member"}
                </p>
              </div>
            </div>

            {/* Navigation links for mobile */}
            <div className="space-y-2">
              <Link 
                href="/dashboard" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5h8" />
                </svg>
                Dashboard
              </Link>
              
              <Link 
                href="/deals/deals" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                All Deals
              </Link>
              
              <Link 
                href="/owners" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Owners
              </Link>
              
              <Link 
                href="/investors" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Payments
                </Link>
              )}
              
              {hasPermission(user, PERMISSIONS.REPORTS_GENERATE) && (
                <Link 
                  href="/reports" 
                  className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Reports
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

            {/* Logout button for mobile */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center w-full px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
              >
                <LogOut className="w-5 h-5 mr-3 text-slate-500" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
