import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { locale } = useApp();
  const t = getT(locale);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs font-medium hover:border-[#EA580C] cursor-pointer whitespace-nowrap'
            : 'inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#C2410C] transition-colors cursor-pointer whitespace-nowrap'
        }
      >
        <Download className="h-3.5 w-3.5" />
        <span>{t.header.installApp}</span>
      </button>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-6 text-sm shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.header.installApp}</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
              {locale === 'fa' ? (
                <>
                  در سافاری آیفون دکمه <Share className="inline h-3.5 w-3.5 text-[#EA580C]" />{' '}
                  (اشتراک‌گذاری) را بزنید و گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.
                </>
              ) : (
                <>
                  In Safari, tap <Share className="inline h-3.5 w-3.5 text-[#EA580C]" /> Share and select{' '}
                  <strong>Add to Home Screen</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
