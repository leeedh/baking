'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
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
  const { isLoggedIn, isAdmin, user, signOut } = useAuth();
  const userEmail = user?.email ?? '';

  const isActive = (path: string) => pathname === path;
  const isMyClassesActive = pathname === '/my-classes' || pathname.startsWith('/learn');
  // DC-96 · 클래스 상세(/classes/[id])도 "온라인 클래스" 탭 활성으로 본다.
  const isClassesActive = pathname.startsWith('/classes');

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
      className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-brown-light py-2.5 sm:py-4 px-3 sm:px-8 shadow-sm"
    >
      <div
        id="header-container"
        className="max-w-7xl mx-auto flex items-center justify-between gap-2.5"
      >
        {/* Brand Logo in Editorial Serif */}
        <Link
          href="/"
          id="brand-logo-area"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center text-cream font-serif font-bold text-xl shadow-md transform group-hover:rotate-12 transition-transform duration-300">
            A
          </div>
          <div>
            <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-brown whitespace-nowrap">
              Atelier Crème
            </span>
            <p className="hidden sm:block text-[10px] tracking-wide text-brown-medium uppercase font-sans">
              Premium French Baking Atelier
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Items (Hidden on Mobile) */}
        <nav
          id="header-nav-desktop"
          className="hidden md:flex items-center gap-2 lg:gap-6 font-sans text-xs sm:text-sm font-medium"
        >
          <Link
            href="/about"
            id="nav-about"
            onClick={() => setIsOpen(false)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/about')
                ? 'text-terracotta bg-terracotta/5 font-bold shadow-sm'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/3'
            }`}
          >
            {t('nav.about')}
          </Link>

          <Link
            href="/classes"
            id="nav-classes"
            onClick={() => setIsOpen(false)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isClassesActive
                ? 'text-terracotta bg-terracotta/5 font-bold shadow-sm'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/3'
            }`}
          >
            {t('nav.classes')}
          </Link>

          <Link
            href="/books"
            id="nav-books"
            onClick={() => setIsOpen(false)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/books')
                ? 'text-terracotta bg-terracotta/5 font-bold shadow-sm'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/3'
            }`}
          >
            {t('nav.books')}
          </Link>

          <Link
            href="/inquiries"
            id="nav-inquiries"
            onClick={() => setIsOpen(false)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isActive('/inquiries')
                ? 'text-terracotta bg-terracotta/5 font-bold shadow-sm'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/3'
            }`}
          >
            {t('nav.inquiries')}
          </Link>

          <Link
            href={isLoggedIn ? '/my-classes' : '/login'}
            id="nav-myclasses"
            onClick={() => setIsOpen(false)}
            className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              isMyClassesActive
                ? 'text-terracotta bg-terracotta/5 font-bold shadow-sm'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/3'
            }`}
          >
            {t('nav.myclasses')}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              id="nav-dashboard"
              onClick={() => setIsOpen(false)}
              className={`px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive('/admin')
                  ? 'text-gold bg-gold/5 font-bold border-b-2 border-gold'
                  : 'text-brown-medium hover:text-gold hover:bg-gold/3'
              } flex items-center gap-1`}
            >
              <ShieldAlert size={14} className="text-gold shrink-0" />
              {t('nav.dashboard')}
            </Link>
          )}
        </nav>

        {/* User Auth Info, Language Switcher & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Elegant Language Switcher Button Group (Premium Segmented Style) */}
          <div className="flex items-center bg-brown/5 rounded-lg p-0.5 border border-brown-light shrink-0">
            <button
              onClick={() => switchLocale('ko')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                locale === 'ko'
                  ? 'bg-brown text-cream shadow-sm'
                  : 'text-brown-medium hover:text-brown'
              }`}
            >
              KO
            </button>
            <button
              onClick={() => switchLocale('en')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-brown text-cream shadow-sm'
                  : 'text-brown-medium hover:text-brown'
              }`}
            >
              EN
            </button>
          </div>

          {/* Desktop Auth Controls */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-brown-medium">{t('nav.student')}</span>
                <span className="text-xs font-semibold text-brown">{userEmail}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <User size={16} />
              </div>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="p-2 text-brown-medium hover:text-terracotta transition-colors duration-150 tooltip cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              id="nav-login-cta"
              onClick={() => setIsOpen(false)}
              className="hidden md:flex px-4 py-2 bg-brown text-cream text-xs font-medium rounded-lg hover:bg-terracotta transition-all cursor-pointer items-center gap-1.5"
            >
              <LogIn size={14} />
              {t('nav.login')}
            </Link>
          )}

          {/* Mobile Profile Trigger (User is logged in) */}
          {isLoggedIn && (
            <Link
              href="/my-classes"
              onClick={() => setIsOpen(false)}
              className="md:hidden w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold"
            >
              <User size={14} />
            </Link>
          )}

          {/* Hamburger Menu Toggle Icon */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 text-brown border border-brown-light rounded-lg hover:bg-brown-light/40 transition-colors cursor-pointer"
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
          className="md:hidden mt-3 pt-3 pb-2 border-t border-brown-light flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <Link
            href="/about"
            id="nav-about-mobile"
            onClick={() => setIsOpen(false)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive('/about')
                ? 'text-terracotta bg-terracotta/5 font-bold'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5'
            }`}
          >
            {t('nav.about')}
          </Link>

          <Link
            href="/classes"
            id="nav-classes-mobile"
            onClick={() => setIsOpen(false)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isClassesActive
                ? 'text-terracotta bg-terracotta/5 font-bold'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5'
            }`}
          >
            {t('nav.classes')}
          </Link>

          <Link
            href="/books"
            id="nav-books-mobile"
            onClick={() => setIsOpen(false)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive('/books')
                ? 'text-terracotta bg-terracotta/5 font-bold'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5'
            }`}
          >
            {t('nav.books')}
          </Link>

          <Link
            href="/inquiries"
            id="nav-inquiries-mobile"
            onClick={() => setIsOpen(false)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive('/inquiries')
                ? 'text-terracotta bg-terracotta/5 font-bold'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5'
            }`}
          >
            {t('nav.inquiries')}
          </Link>

          <Link
            href={isLoggedIn ? '/my-classes' : '/login'}
            id="nav-myclasses-mobile"
            onClick={() => setIsOpen(false)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isMyClassesActive
                ? 'text-terracotta bg-terracotta/5 font-bold'
                : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5'
            }`}
          >
            {t('nav.myclasses')}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              id="nav-dashboard-mobile"
              onClick={() => setIsOpen(false)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive('/admin')
                  ? 'text-gold bg-gold/5 font-bold border-l-4 border-gold'
                  : 'text-brown-medium hover:text-gold hover:bg-gold/5'
              }`}
            >
              <ShieldAlert size={14} className="text-gold" />
              {t('nav.dashboard')}
            </Link>
          )}

          <div className="my-2 border-t border-brown-light/60" />

          {/* User Sign In or Sign Out Information on Mobile */}
          {isLoggedIn ? (
            <div className="px-4 py-2 flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-brown-medium">{t('nav.student')} 로그인 계정</span>
                <span className="text-xs font-semibold text-brown truncate">{userEmail}</span>
              </div>
              <button
                id="btn-logout-mobile"
                onClick={handleLogout}
                className="w-full mt-1 px-3 py-2 border border-terracotta/30 text-terracotta rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-terracotta/5 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="px-3 pt-1">
              <Link
                href="/login"
                id="nav-login-cta-mobile"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-brown text-cream text-xs font-bold rounded-lg hover:bg-terracotta transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn size={13} />
                {t('nav.login')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
