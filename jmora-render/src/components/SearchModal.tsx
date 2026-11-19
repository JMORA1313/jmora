import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import { performInstantSearch } from '../utils/search';

export function SearchModal() {
  const { locale, catalog, isSearchOpen, setSearchOpen, navigate } = useApp();
  const [query, setQuery] = useState('');
  const t = getT(locale);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen]);

  if (!isSearchOpen) return null;

  const results = performInstantSearch(query, catalog);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.header.searchTrigger}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-black/8 dark:border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-[#71717A]" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.header.searchPlaceholder}
            className="w-full bg-transparent text-sm text-[#111111] dark:text-white placeholder:text-[#71717A] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
          {!query.trim() ? (
            <p className="py-6 text-center text-sm text-[#71717A]">{t.home.searchHint}</p>
          ) : results.totalCount === 0 ? (
            <p className="py-8 text-center text-sm text-[#71717A]">
              {locale === 'fa' ? 'نتیجه‌ای یافت نشد.' : 'No matching results found.'}
            </p>
          ) : (
            <>
              {results.muscles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-[#71717A]">
                    {locale === 'fa' ? 'عضلات' : 'Muscles'}
                  </h4>
                  <div className="space-y-1">
                    {results.muscles.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate('muscle-guide', { muscleId: m.id });
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <span className="font-medium text-[#111111] dark:text-white">
                          {m.name[locale]}
                        </span>
                        <span className="text-xs text-[#EA580C]">
                          {locale === 'fa' ? 'مشاهده حرکات' : 'View'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.exercises.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-[#71717A]">
                    {locale === 'fa' ? 'حرکات ورزشی' : 'Exercises'}
                  </h4>
                  <div className="space-y-1">
                    {results.exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate('muscle-guide', { muscleId: ex.muscleId });
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <span className="font-medium text-[#111111] dark:text-white">
                          {ex.name[locale]}
                        </span>
                        <span className="text-xs text-[#71717A]">{ex.setsReps[locale]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.products.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-[#71717A]">{t.nav.shop}</h4>
                  <div className="space-y-1">
                    {results.products.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate('shop');
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <span className="font-medium text-[#111111] dark:text-white">
                          {pr.name[locale]}
                        </span>
                        <span className="font-mono-tabular text-xs text-[#EA580C]">
                          {locale === 'fa'
                            ? `${pr.priceToman.toLocaleString('fa-IR')} ت`
                            : `${pr.priceToman.toLocaleString('en-US')} T`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.articles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-[#71717A]">{t.nav.articles}</h4>
                  <div className="space-y-1">
                    {results.articles.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate('articles', { articleId: art.id });
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <span className="font-medium text-[#111111] dark:text-white">
                          {art.title[locale]}
                        </span>
                        <span className="text-xs text-[#71717A]">
                          {art.readMinutes} {t.articles.minRead}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
