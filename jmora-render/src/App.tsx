import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingChat } from './components/FloatingChat';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SearchModal } from './components/SearchModal';
import { getT } from './i18n/translations';
import { AdminPage } from './pages/AdminPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { ContactPage } from './pages/ContactPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { MuscleGuidePage } from './pages/MuscleGuidePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ShopPage } from './pages/ShopPage';
import { TransformationsPage } from './pages/TransformationsPage';

function MainRouter() {
  const { locale, route, securityEjected, clearSecurityEjection } = useApp();
  const t = getT(locale);

  if (securityEjected) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0C0C0E] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#16161B] p-8 text-center space-y-5 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-red-400">{t.security.ejectedTitle}</h1>
          <p className="text-sm leading-relaxed text-[#A1A1AA]">{t.security.ejectedDesc}</p>
          <div className="rounded-lg bg-black/40 p-2.5 text-[11px] font-mono-tabular text-red-300">
            {securityEjected.reason}
          </div>
          <button
            type="button"
            onClick={clearSecurityEjection}
            className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
          >
            {t.security.returnHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F7] text-[#111111] dark:bg-[#0C0C0E] dark:text-[#F5F5F4] transition-colors">
      <OfflineIndicator />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {route.page === 'home' && <HomePage />}
            {route.page === 'muscle-guide' && <MuscleGuidePage />}
            {route.page === 'onboarding' && <OnboardingPage />}
            {route.page === 'dashboard' && <DashboardPage />}
            {route.page === 'shop' && <ShopPage />}
            {route.page === 'transformations' && <TransformationsPage />}
            {route.page === 'articles' && <ArticlesPage />}
            {route.page === 'contact' && <ContactPage />}
            {route.page === 'admin' && <AdminPage />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileBottomNav />
      <SearchModal />
      <CartDrawer />
      <AuthModal />
      <FloatingChat />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
