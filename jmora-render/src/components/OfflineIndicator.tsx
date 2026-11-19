import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function OfflineIndicator() {
  const { locale } = useApp();
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="bg-amber-600 text-white px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        {locale === 'fa'
          ? 'حالت آفلاین: محتوای ذخیره‌شده اپلیکیشن در دسترس است.'
          : 'Offline mode: cached app views remain available.'}
      </span>
    </div>
  );
}
