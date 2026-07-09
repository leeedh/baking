'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LogIn, LogOut, Menu, ShieldAlert, User, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, signOut } = useAuth();
  const userEmail = user?.email ?? '';

  const isActive = (path: string) => pathname === path;
  const isMyClassesActive = pathname === '/my-classes' || pathname.startsWith('/learn');

  const goto = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  const switchLocale = (nextLocale: 'ko' | 'en') => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header
      id="platform-header"
      className="sticky top-0 z-40 bg-[#FAF4EA]/95 backdrop-blur-md border-b border-[#EFE8DC] py-2.5 sm:py-4 px-3 sm:px-8 shadow-sm"
    >
      <div
        id="header-container"
        className="max-w-7xl mx-auto flex items-center justify-between gap-2.5"
      >
        {/* Brand Logo in Editorial Serif */}
        <div
          id="brand-logo-area"
          onClick={() => goto('/')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#B65538] flex items-center justify-center text-[#FAF4EA] font-serif font-bold text-xl shadow-md transform group-hover:rotate-12 transition-transform duration-300">
            A
          </div>
          <div>
            <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-[#2A211B] whitespace-nowrap">
              Atelier Crème
            </span>
            <p className="hidden sm:block text-[10px] tracking-wide text-[#5F4E43] uppercase font-sans">
              Premium French Baking Atelier
            </p>
          </div>
        </div>

        {/* Desktop Navigation Items (Hidden on Mobile) */}
        <nav
          id="header-nav-desktop"
          className="hidden md:flex items-center gap-2 lg:gap-6 font-sans text-xs sm:text-sm font-medium"
        >
          <button
            id="nav-books"
            onClick={() => goto('/books')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/books')
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold shadow-sm'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/3'
            }`}
          >
            {t('nav.books')}
          </button>

          <button
            id="nav-instructor"
            onClick={() => goto('/instructor')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/instructor')
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold shadow-sm'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/3'
            }`}
          >
            {t('nav.instructor')}
          </button>

          <button
            id="nav-myclasses"
            onClick={() => goto(isLoggedIn ? '/my-classes' : '/login')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isMyClassesActive
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold shadow-sm'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/3'
            }`}
          >
            {t('nav.myclasses')}
          </button>

          <button
            id="nav-dashboard"
            onClick={() => goto('/admin')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/admin')
                ? 'text-[#B0863C] bg-[#B0863C]/5 font-bold border-b-2 border-[#B0863C]'
                : 'text-[#5F4E43] hover:text-[#B0863C] hover:bg-[#B0863C]/3'
            } flex items-center gap-1`}
          >
            <ShieldAlert size={14} className="text-[#B0863C] shrink-0" />
            {t('nav.dashboard')}
          </button>
        </nav>

        {/* User Auth Info, Language Switcher & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Elegant Language Switcher Button Group (Premium Segmented Style) */}
          <div className="flex items-center bg-[#2A211B]/5 rounded-lg p-0.5 border border-[#EFE8DC] shrink-0">
            <button
              onClick={() => switchLocale('ko')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                locale === 'ko'
                  ? 'bg-[#2A211B] text-[#FAF4EA] shadow-sm'
                  : 'text-[#5F4E43] hover:text-[#2A211B]'
              }`}
            >
              KO
            </button>
            <button
              onClick={() => switchLocale('en')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-[#2A211B] text-[#FAF4EA] shadow-sm'
                  : 'text-[#5F4E43] hover:text-[#2A211B]'
              }`}
            >
              EN
            </button>
          </div>

          {/* Desktop Auth Controls */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#5F4E43]">{t('nav.student')}</span>
                <span className="text-xs font-semibold text-[#2A211B]">{userEmail}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#B0863C]/10 border border-[#B0863C]/30 flex items-center justify-center text-[#B0863C]">
                <User size={16} />
              </div>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="p-2 text-[#5F4E43] hover:text-[#B65538] transition-colors duration-150 tooltip cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              id="nav-login-cta"
              onClick={() => goto('/login')}
              className="hidden md:flex px-4 py-2 bg-[#2A211B] text-[#FAF4EA] text-xs font-medium rounded-lg hover:bg-[#B65538] transition-all cursor-pointer items-center gap-1.5"
            >
              <LogIn size={14} />
              {t('nav.login')}
            </button>
          )}

          {/* Mobile Profile Trigger (User is logged in) */}
          {isLoggedIn && (
            <button
              onClick={() => goto('/my-classes')}
              className="md:hidden w-8 h-8 rounded-full bg-[#B0863C]/10 border border-[#B0863C]/30 flex items-center justify-center text-[#B0863C]"
            >
              <User size={14} />
            </button>
          )}

          {/* Hamburger Menu Toggle Icon */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 text-[#2A211B] border border-[#EFE8DC] rounded-lg hover:bg-[#EFE8DC]/40 transition-colors cursor-pointer"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isOpen && (
        <div
          id="mobile-nav-panel"
          className="md:hidden mt-3 pt-3 pb-2 border-t border-[#EFE8DC] flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <button
            id="nav-books-mobile"
            onClick={() => goto('/books')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive('/books')
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/5'
            }`}
          >
            {t('nav.books')}
          </button>

          <button
            id="nav-instructor-mobile"
            onClick={() => goto('/instructor')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive('/instructor')
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/5'
            }`}
          >
            {t('nav.instructor')}
          </button>

          <button
            id="nav-myclasses-mobile"
            onClick={() => goto(isLoggedIn ? '/my-classes' : '/login')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isMyClassesActive
                ? 'text-[#B65538] bg-[#B65538]/5 font-bold'
                : 'text-[#5F4E43] hover:text-[#B65538] hover:bg-[#B65538]/5'
            }`}
          >
            {t('nav.myclasses')}
          </button>

          <button
            id="nav-dashboard-mobile"
            onClick={() => goto('/admin')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive('/admin')
                ? 'text-[#B0863C] bg-[#B0863C]/5 font-bold border-l-4 border-[#B0863C]'
                : 'text-[#5F4E43] hover:text-[#B0863C] hover:bg-[#B0863C]/5'
            }`}
          >
            <ShieldAlert size={14} className="text-[#B0863C]" />
            {t('nav.dashboard')}
          </button>

          <div className="my-2 border-t border-[#EFE8DC]/60" />

          {/* User Sign In or Sign Out Information on Mobile */}
          {isLoggedIn ? (
            <div className="px-4 py-2 flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-[#5F4E43]">{t('nav.student')} 로그인 계정</span>
                <span className="text-xs font-semibold text-[#2A211B] truncate">{userEmail}</span>
              </div>
              <button
                id="btn-logout-mobile"
                onClick={handleLogout}
                className="w-full mt-1 px-3 py-2 border border-[#B65538]/30 text-[#B65538] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#B65538]/5 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="px-3 pt-1">
              <button
                id="nav-login-cta-mobile"
                onClick={() => goto('/login')}
                className="w-full py-2.5 bg-[#2A211B] text-[#FAF4EA] text-xs font-bold rounded-lg hover:bg-[#B65538] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn size={13} />
                {t('nav.login')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
