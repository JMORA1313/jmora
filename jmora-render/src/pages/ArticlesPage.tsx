import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { Article } from '../types/jmora';

export function ArticlesPage() {
  const { locale, catalog, route } = useApp();
  const t = getT(locale);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | Article['category']>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    route.articleId || null
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(catalog.faqs[0]?.id || null);

  useEffect(() => {
    if (route.articleId) setSelectedArticleId(route.articleId);
  }, [route.articleId]);

  const activeArticle = selectedArticleId
    ? catalog.articles.find((a) => a.id === selectedArticleId)
    : null;

  const filtered = catalog.articles.filter((a) => {
    if (category !== 'all' && a.category !== category) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      a.title[locale].toLowerCase().includes(q) ||
      a.excerpt[locale].toLowerCase().includes(q) ||
      a.tags.some((tg) => tg[locale].toLowerCase().includes(q))
    );
  });

  if (activeArticle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => setSelectedArticleId(null)}
          className="text-xs font-medium text-[#EA580C] hover:underline cursor-pointer"
        >
          ← {t.articles.backToList}
        </button>

        <article className="mt-6">
          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <span>{activeArticle.tags.map((tg) => tg[locale]).join(' · ')}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {activeArticle.readMinutes} {t.articles.minRead}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold sm:text-4xl leading-snug">
            {activeArticle.title[locale]}
          </h1>

          <div className="mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-[#F2F0EC] dark:bg-[#1F1F25]">
            <img
              src={activeArticle.image}
              alt={activeArticle.title[locale]}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-[#27272A] dark:text-[#D4D4D8]">
            <p className="font-medium text-[#111111] dark:text-white">
              {activeArticle.excerpt[locale]}
            </p>
            {activeArticle.content.map((para, idx) => (
              <p key={idx}>{para[locale]}</p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-16">
      <div>
        <h1 className="text-2xl font-semibold sm:text-4xl">{t.articles.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#52525B] dark:text-[#A1A1AA]">
          {t.articles.subtitle}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 rounded-lg bg-[#F2F0EC] dark:bg-[#1F1F25] p-1">
            {(['all', 'glutes', 'training', 'nutrition', 'mindset'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize cursor-pointer ${
                  category === cat
                    ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                    : 'text-[#52525B] dark:text-[#A1A1AA]'
                }`}
              >
                {cat === 'all' ? t.shop.all : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 w-full sm:w-72">
            <Search className="h-4 w-4 text-[#71717A]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.articles.searchPlaceholder}
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((art) => (
            <article
              key={art.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A]"
            >
              <div className="aspect-[4/3] bg-[#F2F0EC] dark:bg-[#1F1F25]">
                <img
                  src={art.image}
                  alt={art.title[locale]}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#71717A]">
                    <span>{art.tags.map((tg) => tg[locale]).join(' · ')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {art.readMinutes} {t.articles.minRead}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold leading-snug">
                    {art.title[locale]}
                  </h2>
                  <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA] line-clamp-2">
                    {art.excerpt[locale]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticleId(art.id)}
                  className="mt-5 text-start text-sm font-medium text-[#EA580C] hover:underline cursor-pointer"
                >
                  {t.articles.readMore}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold">{t.articles.faqTitle}</h2>
        <div className="mt-6 divide-y divide-black/8 dark:divide-white/10 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A]">
          {catalog.faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className="px-6 py-4">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 text-start text-sm font-semibold cursor-pointer"
                >
                  <span>{faq.question[locale]}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#EA580C]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                    {faq.answer[locale]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
