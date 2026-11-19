import { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { Product } from '../types/jmora';

export function ShopPage() {
  const { locale, catalog, userState, addToCart, toggleFavoriteProduct } = useApp();
  const t = getT(locale);

  const [category, setCategory] = useState<'all' | Product['category']>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const presentCategories = Array.from(new Set(catalog.products.map((p) => p.category)));
  const filterTabs: ('all' | Product['category'])[] = ['all', ...presentCategories];

  const filtered = catalog.products.filter((p) =>
    category === 'all' ? true : p.category === category
  );

  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setSelectedSize(p.sizes[0] || 'Standard');
    setSelectedColor(p.colors[0]?.name[locale] || 'Default');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-4xl">{t.shop.title}</h1>
          <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">{t.shop.subtitle}</p>
        </div>

        {filterTabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F2F0EC] dark:bg-[#1F1F25] p-1">
            {filterTabs.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  category === cat
                    ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                    : 'text-[#52525B] dark:text-[#A1A1AA]'
                }`}
              >
                {t.shop[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-10 text-center text-sm text-[#71717A]">
          {t.shop.emptyShop}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const isFav = userState.favoriteProductIds.includes(product.id);
            return (
              <article
                key={product.id}
                className="jmora-card group flex flex-col overflow-hidden border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#F2F0EC] dark:bg-[#1F1F25]">
                  <img
                    src={product.image}
                    alt={product.name[locale]}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <button
                    type="button"
                    aria-label={`Favorite ${product.name[locale]}`}
                    onClick={() => toggleFavoriteProduct(product.id)}
                    className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-[#16161A]/90 text-[#111111] dark:text-white shadow-sm cursor-pointer"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFav ? 'fill-[var(--jmora-accent)] text-[var(--jmora-accent)]' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#71717A]">
                      <span>{t.shop[product.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {product.stock > 0
                          ? `${t.shop.inStock} (${product.stock})`
                          : t.shop.outOfStock}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-semibold">{product.name[locale]}</h2>
                    <p className="mt-1 text-xs text-[#71717A]">{product.subtitle[locale]}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="font-mono-tabular text-sm font-semibold text-[#111111] dark:text-white">
                      {locale === 'fa'
                        ? `${product.priceToman.toLocaleString('fa-IR')} تومان`
                        : `${product.priceToman.toLocaleString('en-US')} Toman`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openProduct(product)}
                        className="rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs font-medium hover:border-[var(--jmora-accent)] cursor-pointer whitespace-nowrap"
                      >
                        {t.shop.viewDetails}
                      </button>
                      <button
                        type="button"
                        disabled={product.stock === 0}
                        onClick={() =>
                          addToCart(
                            product.id,
                            product.sizes[0] || 'Standard',
                            product.colors[0]?.name[locale] || 'Default'
                          )
                        }
                        className="rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-3.5 py-2 text-xs font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t.shop.addToCart}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={selectedProduct.name[locale]}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-2xl grid grid-cols-1 md:grid-cols-2">
            <div className="aspect-[4/3] md:aspect-auto bg-[#F2F0EC] dark:bg-[#1F1F25]">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name[locale]}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#71717A]">
                      {t.shop[selectedProduct.category]}
                    </div>
                    <h3 className="mt-1 text-xl font-semibold">
                      {selectedProduct.name[locale]}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    aria-label="Close product details"
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {selectedProduct.description[locale]}
                </p>

                <div className="mt-5">
                  <span className="text-xs font-semibold">{t.shop.selectSize}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          selectedSize === sz
                            ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                            : 'border-black/12 dark:border-white/15'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs font-semibold">{t.shop.selectColor}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProduct.colors.map((clr) => {
                      const label = clr.name[locale];
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setSelectedColor(label)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                            selectedColor === label
                              ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                              : 'border-black/12 dark:border-white/15'
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-black/20"
                            style={{ backgroundColor: clr.hex }}
                          />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-black/8 dark:border-white/10 pt-4">
                <span className="font-mono-tabular text-base font-semibold">
                  {locale === 'fa'
                    ? `${selectedProduct.priceToman.toLocaleString('fa-IR')} تومان`
                    : `${selectedProduct.priceToman.toLocaleString('en-US')} Toman`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct.id, selectedSize, selectedColor);
                    setSelectedProduct(null);
                  }}
                  className="rounded-lg bg-[var(--jmora-accent)] px-5 py-2.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                >
                  {t.shop.addToCart}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
