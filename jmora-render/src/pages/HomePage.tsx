import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ExternalLink, Search, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HERO_QUOTES } from '../data/catalog';
import { getT } from '../i18n/translations';
import { performInstantSearch } from '../utils/search';

export function HomePage() {
  const { locale, catalog, siteConfig, navigate } = useApp();
  const t = getT(locale);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % HERO_QUOTES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const searchResults = performInstantSearch(searchQuery, catalog);
  const approvedTransformations = catalog.transformations.filter((tr) => tr.approved);
  const activeSponsors = catalog.sponsors || [];

  return (
    <div className="space-y-20 pb-20">
      {/* Full-bleed Hero Driven Live by Admin SiteConfig */}
      <section className="relative min-h-[82dvh] flex items-end overflow-hidden bg-[#0C0C0E]">
        <img
          src={siteConfig.heroImage || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg'}
          alt="JMORA athletic training studio"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-85 transition-transform duration-700"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-medium tracking-wide text-white/80"
          >
            {siteConfig.heroEyebrow[locale] || t.home.heroEyebrow}
          </motion.p>

          <div className="mt-4 min-h-[7rem] sm:min-h-[8rem] max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.h1
                key={quoteIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
              >
                {quoteIdx === 0 && siteConfig.heroTitle[locale]
                  ? siteConfig.heroTitle[locale]
                  : HERO_QUOTES[quoteIdx][locale]}
              </motion.h1>
            </AnimatePresence>
          </div>

          <p className="mt-3 max-w-xl text-sm sm:text-base text-white/80">
            {siteConfig.heroSubtitle[locale] || t.home.heroTitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('onboarding')}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--jmora-accent)] px-6 py-3.5 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shadow-lg"
            >
              <span>{t.home.heroPrimaryCta}</span>
              <ArrowIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('muscle-guide')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{t.home.heroSecondaryCta}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Instant Global Search */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <label
          htmlFor="home-instant-search"
          className="mb-2 block text-xs font-medium text-[#71717A]"
        >
          {t.home.searchLabel}
        </label>
        <div className="relative">
          <div className="flex items-center gap-3 rounded-xl border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-4 py-3.5 shadow-sm focus-within:border-[var(--jmora-accent)]">
            <Search className="h-5 w-5 text-[#71717A] shrink-0" />
            <input
              id="home-instant-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.header.searchPlaceholder}
              className="w-full bg-transparent text-sm sm:text-base text-[#111111] dark:text-white placeholder:text-[#71717A] focus:outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-[#71717A]">{t.home.searchHint}</p>

          {searchQuery.trim() && (
            <div className="mt-3 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-4 shadow-xl space-y-4">
              {searchResults.totalCount === 0 ? (
                <p className="text-sm text-[#71717A]">
                  {locale === 'fa' ? 'موردی یافت نشد.' : 'No matches found.'}
                </p>
              ) : (
                <>
                  {searchResults.muscles.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-[#71717A]">
                        {locale === 'fa' ? 'عضلات' : 'Muscles'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchResults.muscles.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => navigate('muscle-guide', { muscleId: m.id })}
                            className="rounded-lg border border-black/10 dark:border-white/15 px-3 py-1.5 text-xs font-medium hover:border-[var(--jmora-accent)] hover:text-[var(--jmora-accent)] cursor-pointer"
                          >
                            {m.name[locale]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-[#71717A]">
                        {t.nav.shop}
                      </div>
                      <div className="space-y-1">
                        {searchResults.products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate('shop')}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <span>{p.name[locale]}</span>
                            <span className="font-mono-tabular text-xs text-[var(--jmora-accent)]">
                              {locale === 'fa'
                                ? `${p.priceToman.toLocaleString('fa-IR')} ت`
                                : `${p.priceToman.toLocaleString('en-US')} T`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.articles.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-[#71717A]">
                        {t.nav.articles}
                      </div>
                      <div className="space-y-1">
                        {searchResults.articles.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => navigate('articles', { articleId: a.id })}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <span>{a.title[locale]}</span>
                            <span className="text-xs text-[#71717A]">
                              {a.readMinutes} {t.articles.minRead}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.pillarsTitle}</h2>
          <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
            {t.home.pillarsSubtitle}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              num: '01',
              title: t.home.pillar1Title,
              desc: t.home.pillar1Desc,
              cta: t.home.pillar1Cta,
              page: 'muscle-guide' as const,
            },
            {
              num: '02',
              title: t.home.pillar2Title,
              desc: t.home.pillar2Desc,
              cta: t.home.pillar2Cta,
              page: 'onboarding' as const,
            },
            {
              num: '03',
              title: t.home.pillar3Title,
              desc: t.home.pillar3Desc,
              cta: t.home.pillar3Cta,
              page: 'shop' as const,
            },
          ].map((card, idx) => (
            <motion.div
              key={card.num}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="jmora-card flex flex-col justify-between border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-7"
            >
              <div>
                <span className="font-mono-tabular text-xs font-semibold text-[var(--jmora-accent)]">
                  {card.num}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {card.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(card.page)}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#111111] dark:text-white hover:text-[var(--jmora-accent)] transition-colors cursor-pointer self-start"
              >
                <span>{card.cta}</span>
                <ArrowIcon className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Admin-Managed Sponsors & Promoted Partners */}
      {activeSponsors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--jmora-accent)]" />
                <span>{t.home.sponsorsTitle}</span>
              </h2>
              <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                {t.home.sponsorsSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {activeSponsors.map((sp) => (
              <a
                key={sp.id}
                href={sp.linkUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="jmora-card group overflow-hidden border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] grid grid-cols-1 sm:grid-cols-5"
              >
                <div className="sm:col-span-2 aspect-[16/10] sm:aspect-auto bg-[#F2F0EC] dark:bg-[#1F1F25] overflow-hidden">
                  <img
                    src={sp.image}
                    alt={sp.title[locale]}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="sm:col-span-3 p-6 flex flex-col justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-[var(--jmora-accent)]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--jmora-accent)]">
                      {sp.badge[locale]}
                    </span>
                    <h3 className="mt-2 text-base font-semibold">{sp.title[locale]}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                      {sp.subtitle[locale]}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--jmora-accent)]">
                    <span>{locale === 'fa' ? 'مشاهده پیشنهاد' : 'Visit Partner'}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Transformations Preview */}
      {approvedTransformations.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t.home.transformationsPreviewTitle}
            </h2>
            <button
              type="button"
              onClick={() => navigate('transformations')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
            >
              <span>{t.home.transformationsPreviewCta}</span>
              <ArrowIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {approvedTransformations.slice(0, 2).map((tr) => (
              <article
                key={tr.id}
                className="jmora-card overflow-hidden border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] grid grid-cols-1 sm:grid-cols-5"
              >
                <div className="sm:col-span-2 aspect-[4/3] sm:aspect-auto bg-[#F2F0EC] dark:bg-[#1F1F25]">
                  <img
                    src={tr.afterImage || tr.image}
                    alt={tr.name[locale]}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="sm:col-span-3 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#71717A]">
                      <span className="font-mono-tabular font-semibold text-[var(--jmora-accent)]">
                        {tr.weightDeltaKg}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {tr.durationWeeks} {t.transformations.weeksUnit}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{tr.name[locale]}</h3>
                    <p className="mt-1 text-xs text-[#71717A]">{tr.programName[locale]}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                      “{tr.testimonial[locale]}”
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Featured Articles Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.articlesPreviewTitle}</h2>
          <button
            type="button"
            onClick={() => navigate('articles')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
          >
            <span>{t.home.articlesPreviewCta}</span>
            <ArrowIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {catalog.articles.slice(0, 3).map((art) => (
            <article
              key={art.id}
              className="jmora-card group overflow-hidden border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#F2F0EC] dark:bg-[#1F1F25]">
                <img
                  src={art.image}
                  alt={art.title[locale]}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#71717A]">
                    <span>{art.tags[0]?.[locale]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {art.readMinutes} {t.articles.minRead}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold leading-snug">
                    {art.title[locale]}
                  </h3>
                  <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA] line-clamp-2">
                    {art.excerpt[locale]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('articles', { articleId: art.id })}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--jmora-accent)] cursor-pointer self-start"
                >
                  <span>{t.articles.readMore}</span>
                  <ArrowIcon className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
