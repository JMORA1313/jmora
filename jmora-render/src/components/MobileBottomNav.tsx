import { ClipboardEdit, Dumbbell, Home, MessageSquare, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { PageRoute } from '../types/jmora';

export function MobileBottomNav() {
  const { locale, route, navigate } = useApp();
  const t = getT(locale);

  const tabs: { page: PageRoute; label: string; icon: typeof Home }[] = [
    { page: 'home', label: t.nav.home, icon: Home },
    { page: 'muscle-guide', label: locale === 'fa' ? 'عضلات ۳D' : '3D Muscles', icon: Dumbbell },
    { page: 'onboarding', label: locale === 'fa' ? 'مربی من' : 'Coach', icon: ClipboardEdit },
    { page: 'shop', label: t.nav.shop, icon: ShoppingBag },
    { page: 'contact', label: locale === 'fa' ? 'تیکت' : 'Tickets', icon: MessageSquare },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden safe-pb border-t border-black/10 dark:border-white/10 bg-[#FAF9F7]/95 dark:bg-[#0C0C0E]/95 backdrop-blur-md"
    >
      <div className="grid h-14 grid-cols-5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = route.page === tab.page;
          return (
            <button
              key={tab.page}
              type="button"
              onClick={() => navigate(tab.page)}
              className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer transition-colors ${
                active
                  ? 'text-[var(--jmora-accent)]'
                  : 'text-[#52525B] dark:text-[#A1A1AA]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[68px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
