'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { LogIn, LogOut, Menu, ShieldAlert, User, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

type NavItem = {
  /** 요소 id 접두어. 모바일은 `-mobile`이 붙는다. */
  key: string;
  href: string;
  labelKey: string;
  /** 현재 경로가 이 항목에 해당하는지 — 상세 페이지도 부모 탭을 활성화한다. */
  match: (pathname: string) => boolean;
  admin?: boolean;
};

/**
 * DC-96 · 내비 순서: 소개 → 온라인 클래스 → 도서 상점 → 문의사항 → 내 클래스.
 * 데스크톱·모바일이 이 배열 하나를 공유한다(예전에는 두 곳에 복붙되어 순서가 어긋났다).
 */
const NAV_ITEMS: NavItem[] = [
  { key: 'nav-about', href: '/about', labelKey: 'nav.about', match: (p) => p === '/about' },
  {
    key: 'nav-classes',
    href: '/classes',
    labelKey: 'nav.classes',
    match: (p) => p.startsWith('/classes'),
  },
  { key: 'nav-books', href: '/books', labelKey: 'nav.books', match: (p) => p === '/books' },
  {
    key: 'nav-inquiries',
    href: '/inquiries',
    labelKey: 'nav.inquiries',
    match: (p) => p === '/inquiries',
  },
  {
    key: 'nav-myclasses',
    // 비로그인은 로그인으로 유도한다(href는 렌더 시 보정).
    href: '/my-classes',
    labelKey: 'nav.myclasses',
    match: (p) => p === '/my-classes' || p.startsWith('/learn'),
  },
  {
    key: 'nav-dashboard',
    href: '/admin',
    labelKey: 'nav.dashboard',
    match: (p) => p === '/admin',
    admin: true,
  },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isAdmin, user, signOut } = useAuth();
  const userEmail = user?.email ?? '';

  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 모바일 메뉴: ESC로 닫고, 열릴 때 패널로 포커스를 옮긴다.
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  const switchLocale = (nextLocale: 'ko' | 'en') => {
    router.replace(pathname, { locale: nextLocale });
  };

  const items = NAV_ITEMS.filter((item) => !item.admin || isAdmin);
  const hrefFor = (item: NavItem) =>
    item.key === 'nav-myclasses' && !isLoggedIn ? '/login' : item.href;

  /** 데스크톱·모바일이 같은 활성 판정과 톤을 쓰도록 하는 내부 링크. */
  const NavLink = ({ item, mobile }: { item: NavItem; mobile: boolean }) => {
    const active = item.match(pathname);
    const admin = item.admin === true;
    return (
      <Link
        href={hrefFor(item)}
        id={mobile ? `${item.key}-mobile` : item.key}
        onClick={() => setIsOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-lg transition-all duration-200 cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          mobile
            ? 'w-full text-left px-4 py-2.5 min-h-[44px] flex items-center gap-1.5 text-xs font-bold'
            : 'px-3 py-2 flex items-center gap-1',
          admin
            ? active
              ? cn(
                  'text-gold bg-gold/5 font-bold',
                  mobile ? 'border-l-4' : 'border-b-2',
                  'border-gold',
                )
              : 'text-brown-medium hover:text-gold hover:bg-gold/5'
            : active
              ? cn('text-terracotta bg-terracotta/5 font-bold', !mobile && 'shadow-sm')
              : 'text-brown-medium hover:text-terracotta hover:bg-terracotta/5',
        )}
      >
        {admin && <ShieldAlert size={14} className="text-gold shrink-0" />}
        {t(item.labelKey)}
      </Link>
    );
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
          className="flex items-center gap-2 cursor-pointer group shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center text-cream font-serif font-bold text-xl shadow-md transform group-hover:rotate-12 transition-transform duration-300 ease-out-soft">
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
          aria-label={t('nav.mainMenu')}
          className="hidden md:flex items-center gap-2 lg:gap-6 font-sans text-xs sm:text-sm font-medium"
        >
          {items.map((item) => (
            <NavLink key={item.key} item={item} mobile={false} />
          ))}
        </nav>

        {/* User Auth Info, Language Switcher & Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Elegant Language Switcher Button Group (Premium Segmented Style) */}
          <div
            // biome-ignore lint/a11y/useSemanticElements: 폼 입력이 아니라 즉시 전환 버튼 묶음이라 fieldset이 부적절하다
            role="group"
            aria-label="Language"
            className="flex items-center bg-brown/5 rounded-lg p-0.5 border border-brown-light shrink-0"
          >
            {(['ko', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => switchLocale(code)}
                aria-current={locale === code ? 'true' : undefined}
                className={cn(
                  'px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  locale === code
                    ? 'bg-brown text-cream shadow-sm'
                    : 'text-brown-medium hover:text-brown',
                )}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Desktop Auth Controls */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-brown-medium">{t('nav.student')}</span>
                <span className="text-xs font-semibold text-brown">{userEmail}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <User size={16} />
              </div>
              <button
                type="button"
                id="btn-logout"
                onClick={handleLogout}
                className="p-2 text-brown-medium hover:text-terracotta transition-colors duration-150 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              id="nav-login-cta"
              onClick={() => setIsOpen(false)}
              className="hidden md:flex px-4 py-2 bg-brown text-cream text-xs font-medium rounded-lg hover:bg-terracotta transition-all cursor-pointer items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              aria-label={t('nav.myclasses')}
              className="md:hidden w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <User size={14} />
            </Link>
          )}

          {/* Hamburger Menu Toggle Icon */}
          <button
            type="button"
            ref={toggleRef}
            id="mobile-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 sm:p-2 text-brown border border-brown-light rounded-lg hover:bg-brown-light/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isOpen && (
        <div
          id="mobile-nav-panel"
          ref={panelRef}
          tabIndex={-1}
          className="md:hidden mt-3 pt-3 pb-2 border-t border-brown-light flex flex-col gap-1.5 animate-slide-in-from-top focus-visible:outline-none"
        >
          {items.map((item) => (
            <NavLink key={item.key} item={item} mobile />
          ))}

          <div className="my-2 border-t border-brown-light/60" />

          {/* User Sign In or Sign Out Information on Mobile */}
          {isLoggedIn ? (
            <div className="px-4 py-2 flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-[11px] text-brown-medium">
                  {t('nav.student')} {t('nav.accountSuffix')}
                </span>
                <span className="text-xs font-semibold text-brown truncate">{userEmail}</span>
              </div>
              <button
                type="button"
                id="btn-logout-mobile"
                onClick={handleLogout}
                className="w-full mt-1 px-3 py-2 min-h-[44px] border border-terracotta/30 text-terracotta rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-terracotta/5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                className="w-full py-2.5 min-h-[44px] bg-brown text-cream text-xs font-bold rounded-lg hover:bg-terracotta transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
