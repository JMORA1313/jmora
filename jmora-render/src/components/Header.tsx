import { useState } from 'react';
import { Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { PageRoute } from '../types/jmora';
import { PWAInstallButton } from './PWAInstallButton';

export function Header() {
  const {
    locale,
    theme,
    route,
    cart,
    userState,
    toggleLocale,
    toggleTheme,
    navigate,
    setCartOpen,
    setSearchOpen,
    setAuthOpen,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = getT(locale);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navItems: { page: PageRoute; label: string }[] = [
    { page: 'home', label: t.nav.home },
    { page: 'muscle-guide', label: t.nav.muscleGuide },
    { page: 'onboarding', label: t.nav.myInfo },
    { page: 'shop', label: t.nav.shop },
    { page: 'transformations', label: t.nav.transformations },
    { page: 'articles', label: t.nav.articles },
    { page: 'contact', label: t.nav.contact },
    ...(userState.auth?.isAdmin ? [{ page: 'admin' as const, label: t.nav.admin }] : []),
  ];

  const handleNav = (page: PageRoute) => {
    setMobileMenuOpen(false);
    navigate(page);
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-black/8 dark:border-white/10 bg-[#FAF9F7]/90 dark:bg-[#0C0C0E]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Spaced minimalist brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="text-lg font-semibold tracking-[0.28em] text-[#111111] dark:text-[#F5F5F4] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--jmora-accent)]"
          aria-label="JMORA Home"
        >
          J M O R A
        </button>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-4 xl:gap-5 text-[13px] xl:text-sm font-medium"
        >
          {navItems.map((item) => {
            const active = route.page === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => handleNav(item.page)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b-2 ${
                  active
                    ? 'border-[var(--jmora-accent)] text-[#111111] dark:text-white'
                    : 'border-transparent text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact action utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t.header.searchTrigger}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleLocale}
            aria-label="Switch language"
            className="h-10 px-2.5 rounded-lg text-xs font-semibold tracking-wider text-[#111111] dark:text-[#F5F5F4] border border-black/10 dark:border-white/15 hover:border-[var(--jmora-accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.header.langSwitch}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.header.themeLight : t.header.themeDark}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!userState.auth?.token) {
                setAuthOpen(true);
                return;
              }
              setCartOpen(true);
            }}
            aria-label={t.header.cart}
            className="relative flex h-10 items-center gap-1.5 px-2.5 rounded-lg text-[#111111] dark:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="font-mono-tabular text-xs font-semibold">{cartCount}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (userState.auth) {
                navigate('dashboard');
              } else {
                setAuthOpen(true);
              }
            }}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-3.5 text-xs font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="h-3.5 w-3.5" />
            <span>{userState.auth ? t.nav.dashboard : t.header.login}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            className="flex lg:hidden h-10 w-10 items-center justify-center rounded-lg text-[#111111] dark:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-black/10 dark:border-white/10 bg-[#FAF9F7] dark:bg-[#0C0C0E] px-4 py-4 shadow-xl">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = route.page === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNav(item.page)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer ${
                    active
                      ? 'bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                      : 'text-[#111111] dark:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (userState.auth) navigate('dashboard');
                  else setAuthOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-4 py-2.5 text-sm font-medium text-white dark:text-[#111111]"
              >
                <User className="h-4 w-4" />
                <span>{userState.auth ? t.nav.dashboard : t.header.login}</span>
              </button>
              <PWAInstallButton compact />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
