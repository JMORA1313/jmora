import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Minus, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { OrderRecord } from '../types/jmora';

export function CartDrawer() {
  const {
    locale,
    catalog,
    siteConfig,
    cart,
    userState,
    isCartOpen,
    setCartOpen,
    setAuthOpen,
    updateCartQty,
    removeFromCart,
    placeOrder,
  } = useApp();

  const t = getT(locale);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [customerName, setCustomerName] = useState(userState.auth?.name || '');
  const [phone, setPhone] = useState(userState.auth?.identifier || '');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  if (!isCartOpen) return null;

  const lineItems = cart
    .map((item) => {
      const product = catalog.products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const subtotalToman = lineItems.reduce(
    (sum, item) => sum + item.product.priceToman * item.quantity,
    0
  );

  const gatewayUrl = siteConfig.reymitUrl || 'https://reymit.ir/JMORA';

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setError(
        locale === 'fa'
          ? 'لطفاً نام، شماره تماس و آدرس دقیق خانه را کامل وارد کنید.'
          : 'Please complete your name, phone, and exact home address.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const order = await placeOrder({
        customerName,
        phone,
        address,
        gateway: 'reymit',
      });
      setConfirmedOrder(order);
      setCheckoutMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.shop.cartTitle}
        className="flex h-full w-full max-w-md flex-col bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold">{t.shop.cartTitle}</h2>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              setCheckoutMode(false);
              setCartOpen(false);
            }}
            aria-label="Close bag"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {confirmedOrder ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 p-5 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                <h3 className="mt-2.5 text-base font-semibold">{t.shop.orderSuccess}</h3>
                <p className="mt-1.5 text-xs text-[#52525B] dark:text-[#A1A1AA]">
                  {t.shop.orderCode}{' '}
                  <span className="font-mono-tabular font-semibold text-[#111111] dark:text-white">
                    {confirmedOrder.id}
                  </span>
                </p>
                <div className="mt-2 font-mono-tabular text-base font-semibold text-[var(--jmora-accent)]">
                  {confirmedOrder.totalToman.toLocaleString('fa-IR')}{' '}
                  {locale === 'fa' ? 'تومان' : 'Toman'}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t.shop.importantPaymentNoticeTitle}</span>
                </div>
                <p className="mt-2 text-amber-950 dark:text-amber-100/90">
                  {t.shop.importantPaymentNoticeBody}
                </p>
                <div className="mt-3 rounded-lg bg-white/80 dark:bg-black/30 p-3 space-y-1 text-[11px]">
                  <div>
                    <strong>{locale === 'fa' ? 'محصول(ها):' : 'Item(s):'}</strong>{' '}
                    {confirmedOrder.items.map((i) => `${i.name[locale]} ×${i.quantity}`).join('، ')}
                  </div>
                  <div>
                    <strong>{t.shop.address}:</strong> {confirmedOrder.address}
                  </div>
                  <div>
                    <strong>{t.shop.subtotal}:</strong>{' '}
                    <span className="font-mono-tabular">
                      {confirmedOrder.totalToman.toLocaleString('fa-IR')}{' '}
                      {locale === 'fa' ? 'تومان' : 'Toman'}
                    </span>
                  </div>
                </div>
              </div>

              <a
                href={gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--jmora-accent)] py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <span>{t.shop.openGatewayNow}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : lineItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#71717A]">{t.shop.emptyCart}</div>
          ) : checkoutMode ? (
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t.shop.importantPaymentNoticeTitle}</span>
                </div>
                <p className="mt-1.5 text-amber-950 dark:text-amber-100/90">
                  {t.shop.importantPaymentNoticeBody}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">{t.shop.customerName}</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{t.shop.phone}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{t.shop.address}</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-black/10 dark:border-white/15 bg-[#FAF9F7] dark:bg-[#1F1F25] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#71717A]">{t.shop.subtotal}</span>
                  <span className="font-mono-tabular font-semibold text-[var(--jmora-accent)]">
                    {subtotalToman.toLocaleString('fa-IR')} {locale === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[#71717A]">
                    {locale === 'fa' ? 'درگاه پرداخت:' : 'Payment Link:'}
                  </span>
                  <span className="font-mono-tabular font-semibold">reymit.ir/JMORA</span>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCheckoutMode(false)}
                  className="rounded-lg border border-black/15 dark:border-white/15 px-4 py-2.5 text-sm font-medium cursor-pointer"
                >
                  {t.onboarding.prev}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[var(--jmora-accent)] py-2.5 text-xs sm:text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {t.shop.confirmAndPayBtn}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-3 border-b border-black/8 dark:border-white/10 pb-4"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name[locale]}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-lg object-cover bg-[#F2F0EC] dark:bg-[#1F1F25]"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-medium">{item.product.name[locale]}</h4>
                    <p className="mt-0.5 text-xs text-[#71717A]">
                      {item.size} · {item.color}
                    </p>
                    <p className="mt-1 font-mono-tabular text-xs font-semibold text-[var(--jmora-accent)]">
                      {(item.product.priceToman * item.quantity).toLocaleString('fa-IR')}{' '}
                      {locale === 'fa' ? 'تومان' : 'Toman'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateCartQty(item.productId, item.size, item.color, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-black/15 dark:border-white/15 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono-tabular text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateCartQty(item.productId, item.size, item.color, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-black/15 dark:border-white/15 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.product.name[locale]}`}
                        onClick={() => removeFromCart(item.productId, item.size, item.color)}
                        className="ms-auto text-[#71717A] hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lineItems.length > 0 && !checkoutMode && !confirmedOrder && (
          <div className="border-t border-black/8 dark:border-white/10 p-6">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{t.shop.subtotal}</span>
              <span className="font-mono-tabular">
                {subtotalToman.toLocaleString('fa-IR')} {locale === 'fa' ? 'تومان' : 'Toman'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutMode(true)}
              className="mt-4 w-full rounded-lg bg-[#111111] dark:bg-[#F5F5F4] py-3 text-sm font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.shop.checkoutBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
