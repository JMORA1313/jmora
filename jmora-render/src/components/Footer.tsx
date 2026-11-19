import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';

export function Footer() {
  const { locale, userState, siteConfig, navigate } = useApp();
  const t = getT(locale);

  return (
    <footer className="border-t border-black/8 dark:border-white/10 bg-[#F2F0EC] dark:bg-[#121215] py-12 pb-24 md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2 space-y-4">
            <div className="text-lg font-semibold tracking-[0.28em] text-[#111111] dark:text-white">
              J M O R A
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
              {siteConfig.footerTagline[locale] || t.home.footerTagline}
            </p>
            <PWAInstallButton compact />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#111111] dark:text-white">
              {locale === 'fa' ? 'مسیرهای اصلی' : 'Explore'}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('muscle-guide')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.muscleGuide}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('onboarding')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.myInfo}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('shop')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.shop}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#111111] dark:text-white">
              {locale === 'fa' ? 'جامعه و پشتیبانی' : 'Community'}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('transformations')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.transformations}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('articles')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.articles}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('contact')}
                  className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                >
                  {t.nav.contact}
                </button>
              </li>
              {userState.auth?.isAdmin && (
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('admin')}
                    className="hover:text-[var(--jmora-accent)] transition-colors cursor-pointer"
                  >
                    {t.nav.admin}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-black/8 dark:border-white/10 pt-6 text-xs text-[#71717A] sm:flex-row sm:items-center">
          <span>{t.home.footerRights}</span>
          <span>
            {t.contact.hoursTitle}: {siteConfig.openHours[locale] || t.contact.hoursText}
          </span>
        </div>
      </div>
    </footer>
  );
}
