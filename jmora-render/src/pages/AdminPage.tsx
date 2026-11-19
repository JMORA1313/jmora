import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  Edit3,
  Globe,
  Lock,
  Palette,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type {
  ClientInfoSubmission,
  CoachAccessRequest,
  CoachMessage,
  CoachTier,
  OrderRecord,
  Product,
  ProductCategory,
  ProgressPhotoSubmission,
  SecurityEvent,
  SiteConfig,
  SponsorAd,
  SupportTicket,
  Transformation,
} from '../types/jmora';
import { compressImageFile } from '../utils/imageUpload';
import { calculateTomanPrice } from '../utils/pricing';

type AdminTab =
  | 'accessOrders'
  | 'coach'
  | 'products'
  | 'transformations'
  | 'sponsors'
  | 'tickets'
  | 'theme'
  | 'articlesSecurity';

interface AdminUserSummary {
  id: string;
  name: string;
  identifier: string;
  method: 'phone' | 'email';
  isAdmin: boolean;
  coachAccessUnlocked: boolean;
  coachTier?: CoachTier;
  createdAt: string;
}

export function AdminPage() {
  const { locale, catalog, siteConfig, userState, setAuthOpen, refreshCatalog } = useApp();
  const t = getT(locale);
  const isAdmin = Boolean(userState.auth?.isAdmin && userState.auth?.token);
  const token = userState.auth?.token || '';

  const [tab, setTab] = useState<AdminTab>('accessOrders');
  const [submissions, setSubmissions] = useState<ClientInfoSubmission[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [accessRequests, setAccessRequests] = useState<CoachAccessRequest[]>([]);
  const [coachMessages, setCoachMessages] = useState<Record<string, CoachMessage[]>>({});
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoSubmission[]>([]);
  const [sponsors, setSponsors] = useState<SponsorAd[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [usersList, setUsersList] = useState<AdminUserSummary[]>([]);
  const [localConfig, setLocalConfig] = useState<SiteConfig>(siteConfig);
  const [statusBanner, setStatusBanner] = useState('');

  // Reply & AI coach drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [coachDrafts, setCoachDrafts] = useState<Record<string, string>>({});
  const [photoFeedbackDrafts, setPhotoFeedbackDrafts] = useState<Record<string, string>>({});
  const [generatingAiFor, setGeneratingAiFor] = useState<string | null>(null);

  // Store Product Form (Add or Edit)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pNameFa, setPNameFa] = useState('');
  const [pNameEn, setPNameEn] = useState('');
  const [pSubtitleFa, setPSubtitleFa] = useState('');
  const [pDescFa, setPDescFa] = useState('');
  const [pCategory, setPCategory] = useState<ProductCategory>('water');
  const [pPriceUsd, setPPriceUsd] = useState('2');
  const [pManualToman, setPManualToman] = useState(false);
  const [pTomanOverride, setPTomanOverride] = useState('1120000');
  const [pStock, setPStock] = useState('30');
  const [pSizes, setPSizes] = useState('12 × 500ml, 6 × 1L');
  const [pImageUrl, setPImageUrl] = useState('');

  // Transformation Form (Add or Edit)
  const [editingTrId, setEditingTrId] = useState<string | null>(null);
  const [trNameFa, setTrNameFa] = useState('');
  const [trNameEn, setTrNameEn] = useState('');
  const [trGender, setTrGender] = useState<'women' | 'men'>('women');
  const [trWeeks, setTrWeeks] = useState('12');
  const [trDelta, setTrDelta] = useState('-6 kg');
  const [trTestimonialFa, setTrTestimonialFa] = useState('');
  const [trBeforeImg, setTrBeforeImg] = useState('');
  const [trAfterImg, setTrAfterImg] = useState('');

  // Sponsor Form (Add or Edit)
  const [editingSpId, setEditingSpId] = useState<string | null>(null);
  const [spTitleFa, setSpTitleFa] = useState('');
  const [spTitleEn, setSpTitleEn] = useState('');
  const [spSubtitleFa, setSpSubtitleFa] = useState('');
  const [spBadgeFa, setSpBadgeFa] = useState('اسپانسر رسمی');
  const [spLinkUrl, setSpLinkUrl] = useState('https://reymit.ir/JMORA');
  const [spImage, setSpImage] = useState('');

  // Article Form
  const [aTitleFa, setATitleFa] = useState('');
  const [aTitleEn, setATitleEn] = useState('');
  const [aExcerptFa, setAExcerptFa] = useState('');
  const [aExcerptEn, setAExcerptEn] = useState('');

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 3200);
  };

  const loadAdminData = useCallback(async () => {
    if (!isAdmin || !token) return;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { 'x-jmora-token': token },
      });
      if (res.ok) {
        const d = await res.json();
        setSubmissions(d.submissions || []);
        setTickets(d.tickets || []);
        setOrders(d.orders || []);
        setAccessRequests(d.accessRequests || []);
        setCoachMessages(d.coachMessages || {});
        setProgressPhotos(d.progressPhotos || []);
        setSponsors(d.sponsors || []);
        setSecurityEvents(d.securityEvents || []);
        setUsersList(d.users || []);
        if (d.siteConfig) setLocalConfig(d.siteConfig);
      }
    } catch {
      // ignore
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="jmora-card border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-8 space-y-4">
          <Lock className="mx-auto h-9 w-9 text-[var(--jmora-accent)]" />
          <h1 className="text-xl font-semibold">{t.admin.restrictedTitle}</h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">{t.admin.restrictedDesc}</p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="rounded-lg bg-[var(--jmora-accent)] px-6 py-2.5 text-sm font-medium text-white cursor-pointer"
          >
            {t.header.login}
          </button>
        </div>
      </div>
    );
  }

  const handleUploadToSetter = async (
    file: File | undefined,
    setter: (val: string) => void
  ) => {
    if (!file) return;
    const url = await compressImageFile(file);
    setter(url);
  };

  // ====== Store Products CRUD ======
  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPNameFa(p.name.fa);
    setPNameEn(p.name.en);
    setPSubtitleFa(p.subtitle.fa);
    setPDescFa(p.description.fa);
    setPCategory(p.category);
    setPPriceUsd(String(p.priceUsd));
    setPManualToman(Boolean(p.manualToman));
    setPTomanOverride(String(p.priceToman));
    setPStock(String(p.stock));
    setPSizes(p.sizes.join(', '));
    setPImageUrl(p.image);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setPNameFa('');
    setPNameEn('');
    setPSubtitleFa('');
    setPDescFa('');
    setPCategory('water');
    setPPriceUsd('2');
    setPManualToman(false);
    setPStock('30');
    setPSizes('12 × 500ml');
    setPImageUrl('');
  };

  const computedToman = pManualToman
    ? Number(pTomanOverride) || 0
    : calculateTomanPrice(Number(pPriceUsd) || 0, localConfig.usdRate, localConfig.marginToman);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pNameFa.trim()) return;
    const body = {
      category: pCategory,
      name: { fa: pNameFa.trim(), en: pNameEn.trim() || pNameFa.trim() },
      subtitle: {
        fa: pSubtitleFa.trim() || 'کیفیت منتخب JMORA',
        en: pSubtitleFa.trim() || 'JMORA Curated Quality',
      },
      description: {
        fa: pDescFa.trim() || pSubtitleFa.trim() || pNameFa.trim(),
        en: pDescFa.trim() || pNameEn.trim() || pNameFa.trim(),
      },
      priceUsd: Number(pPriceUsd) || 0,
      priceToman: computedToman,
      manualToman: pManualToman,
      stock: Number(pStock) || 0,
      sizes: pSizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      image: pImageUrl.trim() || undefined,
    };

    const url = editingProductId
      ? `/api/admin/products/${encodeURIComponent(editingProductId)}`
      : '/api/admin/products';
    const method = editingProductId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetProductForm();
      await refreshCatalog();
      showToast(locale === 'fa' ? 'محصول ذخیره شد.' : 'Product saved.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-jmora-token': token },
    });
    await refreshCatalog();
    showToast(locale === 'fa' ? 'محصول حذف شد.' : 'Product deleted.');
  };

  // ====== Transformations CRUD ======
  const startEditTransformation = (tr: Transformation) => {
    setEditingTrId(tr.id);
    setTrNameFa(tr.name.fa);
    setTrNameEn(tr.name.en);
    setTrGender(tr.gender);
    setTrWeeks(String(tr.durationWeeks));
    setTrDelta(tr.weightDeltaKg);
    setTrTestimonialFa(tr.testimonial.fa);
    setTrBeforeImg(tr.beforeImage);
    setTrAfterImg(tr.afterImage);
  };

  const resetTrForm = () => {
    setEditingTrId(null);
    setTrNameFa('');
    setTrNameEn('');
    setTrWeeks('12');
    setTrDelta('-6 kg');
    setTrTestimonialFa('');
    setTrBeforeImg('');
    setTrAfterImg('');
  };

  const handleSaveTransformation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trNameFa.trim() || !trTestimonialFa.trim()) return;
    const body = {
      name: { fa: trNameFa.trim(), en: trNameEn.trim() || trNameFa.trim() },
      gender: trGender,
      durationWeeks: Number(trWeeks) || 12,
      weightDeltaKg: trDelta.trim() || '-5 kg',
      testimonial: { fa: trTestimonialFa.trim(), en: trTestimonialFa.trim() },
      beforeImage: trBeforeImg.trim() || undefined,
      afterImage: trAfterImg.trim() || undefined,
      approved: true,
    };

    const url = editingTrId
      ? `/api/admin/transformations/${encodeURIComponent(editingTrId)}`
      : '/api/admin/transformations';
    const method = editingTrId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetTrForm();
      await refreshCatalog();
      showToast(locale === 'fa' ? 'تغییر واقعی ذخیره شد.' : 'Transformation saved.');
    }
  };

  const handleToggleApproveTr = async (id: string, approved: boolean) => {
    await fetch(`/api/admin/transformations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ approved }),
    });
    refreshCatalog();
  };

  const handleDeleteTr = async (id: string) => {
    await fetch(`/api/admin/transformations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-jmora-token': token },
    });
    refreshCatalog();
  };

  // ====== Private Member Progress Photos Review ======
  const handleSendPhotoFeedback = async (id: string) => {
    const feedback = (photoFeedbackDrafts[id] || '').trim();
    if (!feedback) return;
    const res = await fetch(`/api/admin/progress-photos/${encodeURIComponent(id)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ feedback }),
    });
    if (res.ok) {
      setPhotoFeedbackDrafts((prev) => ({ ...prev, [id]: '' }));
      await loadAdminData();
      showToast(locale === 'fa' ? 'بازخورد مربی برای شاگرد ارسال شد.' : 'Coach feedback sent.');
    }
  };

  const handlePublishProgressPhoto = async (id: string) => {
    const res = await fetch(`/api/admin/progress-photos/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      await refreshCatalog();
      showToast(locale === 'fa' ? 'در گالری عمومی تغییرات واقعی منتشر شد.' : 'Published to public gallery.');
    }
  };

  const handleDeleteProgressPhoto = async (id: string) => {
    await fetch(`/api/admin/progress-photos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-jmora-token': token },
    });
    await loadAdminData();
    showToast(locale === 'fa' ? 'ارسال خصوصی حذف شد.' : 'Private check-in deleted.');
  };

  const formatTierLabel = (tier?: CoachTier) => {
    if (tier === 'private') return t.tiers.privateName;
    if (tier === 'standard') return t.tiers.standardName;
    return t.tiers.assistantName;
  };

  // ====== Sponsors CRUD ======
  const startEditSponsor = (sp: SponsorAd) => {
    setEditingSpId(sp.id);
    setSpTitleFa(sp.title.fa);
    setSpTitleEn(sp.title.en);
    setSpSubtitleFa(sp.subtitle.fa);
    setSpBadgeFa(sp.badge.fa);
    setSpLinkUrl(sp.linkUrl);
    setSpImage(sp.image);
  };

  const resetSponsorForm = () => {
    setEditingSpId(null);
    setSpTitleFa('');
    setSpTitleEn('');
    setSpSubtitleFa('');
    setSpBadgeFa('اسپانسر رسمی');
    setSpLinkUrl('https://reymit.ir/JMORA');
    setSpImage('');
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spTitleFa.trim()) return;
    const body = {
      title: { fa: spTitleFa.trim(), en: spTitleEn.trim() || spTitleFa.trim() },
      subtitle: { fa: spSubtitleFa.trim(), en: spSubtitleFa.trim() },
      badge: { fa: spBadgeFa.trim() || 'اسپانسر', en: spBadgeFa.trim() || 'Partner' },
      linkUrl: spLinkUrl.trim(),
      image: spImage.trim() || undefined,
      active: true,
    };

    const url = editingSpId
      ? `/api/admin/sponsors/${encodeURIComponent(editingSpId)}`
      : '/api/admin/sponsors';
    const method = editingSpId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetSponsorForm();
      await loadAdminData();
      await refreshCatalog();
      showToast(locale === 'fa' ? 'تبلیغ / اسپانسر ذخیره شد.' : 'Sponsor saved.');
    }
  };

  const handleToggleSponsorActive = async (sp: SponsorAd) => {
    await fetch(`/api/admin/sponsors/${encodeURIComponent(sp.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ active: !sp.active }),
    });
    await loadAdminData();
    await refreshCatalog();
  };

  const handleDeleteSponsor = async (id: string) => {
    await fetch(`/api/admin/sponsors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-jmora-token': token },
    });
    await loadAdminData();
    await refreshCatalog();
  };

  // ====== SiteConfig & Theme CMS ======
  const handleSaveSiteConfig = async (cfg: SiteConfig) => {
    const res = await fetch('/api/admin/site-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify(cfg),
    });
    if (res.ok) {
      await refreshCatalog();
      showToast(locale === 'fa' ? 'تنظیمات و تم سایت اعمال شد.' : 'Site & Theme settings applied.');
    }
  };

  // ====== Coaching & Access Controls ======
  const handleReviewAccess = async (id: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/admin/access-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ status }),
    });
    await loadAdminData();
    showToast(status === 'approved' ? 'دسترسی کاربر فعال شد.' : 'درخواست رد شد.');
  };

  const handleToggleUserCoachAccess = async (u: AdminUserSummary) => {
    await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/coach-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ unlocked: !u.coachAccessUnlocked }),
    });
    await loadAdminData();
  };

  const handleGenerateAiDraft = async (userId: string) => {
    setGeneratingAiFor(userId);
    try {
      const res = await fetch(`/api/admin/coach/${encodeURIComponent(userId)}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        const data = (await res.json()) as { draft: string };
        setCoachDrafts((prev) => ({ ...prev, [userId]: data.draft }));
      }
    } finally {
      setGeneratingAiFor(null);
    }
  };

  const handleSendCoachReply = async (userId: string, sender: 'coach' | 'ai' = 'coach') => {
    const text = (coachDrafts[userId] || '').trim();
    if (!text) return;
    const res = await fetch(`/api/admin/coach/${encodeURIComponent(userId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ text, sender }),
    });
    if (res.ok) {
      setCoachDrafts((prev) => ({ ...prev, [userId]: '' }));
      await loadAdminData();
      showToast(locale === 'fa' ? 'پاسخ برای کاربر ارسال شد.' : 'Coach reply sent.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderRecord['status']) => {
    await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ status }),
    });
    await loadAdminData();
  };

  const handleReplyTicket = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    const reply = (replyDrafts[ticketId] || '').trim();
    if (!reply) return;
    const res = await fetch(`/api/admin/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({ reply }),
    });
    if (res.ok) {
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      loadAdminData();
    }
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitleFa.trim() || !aTitleEn.trim()) return;
    await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-jmora-token': token },
      body: JSON.stringify({
        title: { fa: aTitleFa, en: aTitleEn },
        excerpt: { fa: aExcerptFa || aTitleFa, en: aExcerptEn || aTitleEn },
      }),
    });
    setATitleFa('');
    setATitleEn('');
    setAExcerptFa('');
    setAExcerptEn('');
    refreshCatalog();
  };

  const handleDeleteArticle = async (id: string) => {
    await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-jmora-token': token },
    });
    refreshCatalog();
  };

  const tabsList: AdminTab[] = [
    'accessOrders',
    'coach',
    'products',
    'transformations',
    'sponsors',
    'tickets',
    'theme',
    'articlesSecurity',
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.title}</h1>
          <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">{t.admin.subtitle}</p>
        </div>
        {statusBanner && (
          <div className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow">
            {statusBanner}
          </div>
        )}
      </div>

      {/* Responsive Tab Strip */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#F2F0EC] dark:bg-[#1F1F25] p-1.5">
        {tabsList.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
              tab === key
                ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
            }`}
          >
            {t.admin[`${key}Tab`]}
          </button>
        ))}
      </div>

      {/* TAB 1: Payments (Reymit Coach Pass) & Shop Orders & Users */}
      {tab === 'accessOrders' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-semibold">
              {locale === 'fa' ? 'درخواست‌های باز کردن حرکات و مربی (Reymit)' : 'Coach & Exercise Unlock Requests'}
            </h2>
            {accessRequests.length === 0 ? (
              <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 text-xs text-[#71717A]">
                {locale === 'fa' ? 'هنوز درخواستی ثبت نشده است.' : 'No unlock requests yet.'}
              </div>
            ) : (
              accessRequests.map((reqItem) => (
                <div
                  key={reqItem.id}
                  className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">{reqItem.userName} ({reqItem.identifier})</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[var(--jmora-accent)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--jmora-accent)]">
                        {formatTierLabel(reqItem.planTier)}
                      </span>
                      <span className="font-mono-tabular text-[var(--jmora-accent)]">{reqItem.id}</span>
                    </div>
                  </div>
                  <div className="text-xs">
                    <strong>{locale === 'fa' ? 'کد پیگیری / نام پرداخت:' : 'Reference:'}</strong>{' '}
                    <span className="font-mono-tabular">{reqItem.reymitRef}</span> ·{' '}
                    <span className="font-mono-tabular">
                      {reqItem.amountToman.toLocaleString('fa-IR')}{' '}
                      {locale === 'fa' ? 'تومان' : 'Toman'}
                    </span>
                  </div>
                  {reqItem.note && <p className="text-xs text-[#71717A]">{reqItem.note}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    {reqItem.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReviewAccess(reqItem.id, 'approved')}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                        >
                          {locale === 'fa' ? 'تایید و باز کردن دسترسی' : 'Approve & Unlock'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAccess(reqItem.id, 'rejected')}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-500 cursor-pointer"
                        >
                          {locale === 'fa' ? 'رد' : 'Reject'}
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                          reqItem.status === 'approved'
                            ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {reqItem.status === 'approved'
                          ? locale === 'fa' ? 'تایید و باز شد' : 'Approved'
                          : locale === 'fa' ? 'رد شده' : 'Rejected'}
                      </span>
                    )}
                    <span className="ms-auto text-[11px] font-semibold uppercase text-[#71717A]">
                      {reqItem.status}
                    </span>
                  </div>
                </div>
              ))
            )}

            <h3 className="pt-4 text-sm font-semibold">
              {locale === 'fa' ? 'حساب‌های کاربری ثبت‌شده' : 'Registered Accounts'}
            </h3>
            <div className="space-y-2">
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] px-4 py-3 text-xs"
                >
                  <div>
                    <div className="font-semibold">
                      {u.name} {u.isAdmin ? '(Admin)' : ''}
                      {u.coachTier && (
                        <span className="ms-2 rounded bg-[var(--jmora-accent)]/12 px-1.5 py-0.5 text-[10px] text-[var(--jmora-accent)]">
                          {formatTierLabel(u.coachTier)}
                        </span>
                      )}
                    </div>
                    <div className="text-[#71717A] font-mono-tabular">{u.identifier}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleUserCoachAccess(u)}
                    className={`rounded-lg px-3 py-1.5 font-medium cursor-pointer ${
                      u.coachAccessUnlocked
                        ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-[#F2F0EC] dark:bg-[#1F1F25]'
                    }`}
                  >
                    {u.coachAccessUnlocked
                      ? locale === 'fa' ? 'دسترسی مربی باز است' : 'Unlocked'
                      : locale === 'fa' ? 'باز کردن دستی' : 'Grant Access'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-semibold">
              {locale === 'fa' ? 'سفارش‌های ثبت‌شده فروشگاه' : 'Store Orders'}
            </h2>
            {orders.length === 0 ? (
              <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 text-xs text-[#71717A]">
                {locale === 'fa' ? 'هنوز سفارشی ثبت نشده است.' : 'No orders placed yet.'}
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular font-semibold text-[var(--jmora-accent)]">{ord.id}</span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderRecord['status'])}
                      className="rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-xs"
                    >
                      <option value="preparing">preparing</option>
                      <option value="paid">paid</option>
                      <option value="shipped">shipped</option>
                    </select>
                  </div>
                  <div className="font-semibold">{ord.customerName} · {ord.phone}</div>
                  <div className="text-[#71717A]">{ord.address}</div>
                  <div>{ord.items.map((i) => `${i.name[locale]} (${i.size}) ×${i.quantity}`).join('، ')}</div>
                  <div className="font-mono-tabular font-semibold">
                    {ord.totalToman.toLocaleString('fa-IR')} {locale === 'fa' ? 'تومان' : 'Toman'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI Auto-Coach Switch + Manual Coach & Client Info Submissions */}
      {tab === 'coach' && (
        <div className="space-y-6">
          <div className="jmora-card border border-[var(--jmora-accent)]/30 bg-white dark:bg-[#16161A] p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-[var(--jmora-accent)]" />
              <div>
                <h2 className="text-sm font-semibold">
                  {locale === 'fa'
                    ? 'حالت پاسخگویی خودکار مربی هوشمند (AI)'
                    : 'Automatic AI Coach Auto-Reply'}
                </h2>
                <p className="text-xs text-[#71717A]">
                  {locale === 'fa'
                    ? 'وقتی روشن باشد، هوش مصنوعی به محض ثبت اطلاعات یا پیام کاربر به‌صورت خودکار پاسخ می‌دهد؛ وقتی خاموش باشد فقط خودتان دستی پاسخ می‌دهید.'
                    : 'When ON, Gemini AI replies automatically when unlocked clients submit info or messages.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = { ...localConfig, aiAutoReply: !localConfig.aiAutoReply };
                setLocalConfig(updated);
                handleSaveSiteConfig(updated);
              }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
                localConfig.aiAutoReply
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#F2F0EC] dark:bg-[#1F1F25] text-[#52525B] dark:text-[#A1A1AA]'
              }`}
            >
              {localConfig.aiAutoReply
                ? locale === 'fa' ? 'خودکار روشن (AI فعال)' : 'AI Auto-Reply: ON'
                : locale === 'fa' ? 'خاموش (فقط دستی)' : 'Manual Only: OFF'}
            </button>
          </div>

          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-8 text-center text-sm text-[#71717A]">
                {t.admin.noSubmissions}
              </div>
            ) : (
              submissions.map((sub) => {
                const uid = sub.userId || sub.id;
                const thread = coachMessages[uid] || [];
                return (
                  <div
                    key={sub.id}
                    className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-base font-semibold">{sub.fullName}</span>
                        <span className="mx-2 text-[#71717A]">·</span>
                        <span className="text-xs font-mono-tabular text-[var(--jmora-accent)]">
                          {sub.contact}
                        </span>
                      </div>
                      <div className="text-xs text-[#71717A] font-mono-tabular">
                        {t.infoForm[sub.gender]} · {sub.age} · {sub.heightCm} cm · {sub.weightKg} kg
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3.5 text-xs">
                      <div className="font-semibold text-[var(--jmora-accent)]">{t.infoForm.goalLabel}</div>
                      <p className="mt-1 text-sm">{sub.goalText}</p>
                    </div>

                    {thread.length > 0 && (
                      <div className="space-y-2 max-h-52 overflow-y-auto border-t border-black/5 dark:border-white/5 pt-3">
                        {thread.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-lg p-2.5 text-xs ${
                              m.sender === 'user'
                                ? 'bg-[#F2F0EC] dark:bg-[#1F1F25]'
                                : 'bg-[var(--jmora-accent)]/10 border border-[var(--jmora-accent)]/25'
                            }`}
                          >
                            <span className="font-semibold text-[10px] uppercase">{m.sender}: </span>
                            <span>{m.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        type="text"
                        value={coachDrafts[uid] || ''}
                        onChange={(e) =>
                          setCoachDrafts((prev) => ({ ...prev, [uid]: e.target.value }))
                        }
                        placeholder={
                          locale === 'fa'
                            ? 'پیام دستی مربی یا پیش‌نویس هوش مصنوعی...'
                            : 'Write manual coach reply or generate AI draft...'
                        }
                        className="flex-1 min-w-[200px] rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={generatingAiFor === uid}
                        onClick={() => handleGenerateAiDraft(uid)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--jmora-accent)]/40 px-3 py-2 text-xs font-medium text-[var(--jmora-accent)] cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {generatingAiFor === uid
                            ? '...'
                            : locale === 'fa' ? 'پیشنهاد AI' : 'AI Draft'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendCoachReply(uid, 'coach')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--jmora-accent)] px-4 py-2 text-xs font-medium text-white cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>{locale === 'fa' ? 'ارسال دستی' : 'Send Coach Reply'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Full Store CRUD (Mineral Water + Add / Edit / Replace / Delete / Upload Photo) */}
      {tab === 'products' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingProductId
                  ? locale === 'fa' ? 'ویرایش / جایگزینی محصول' : 'Edit Product'
                  : t.admin.addProduct}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-[var(--jmora-accent)] cursor-pointer"
                >
                  {locale === 'fa' ? 'لغو ویرایش' : 'Cancel'}
                </button>
              )}
            </div>

            <select
              value={pCategory}
              onChange={(e) => setPCategory(e.target.value as ProductCategory)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs"
            >
              <option value="water">{t.shop.water}</option>
              <option value="equipment">{t.shop.equipment}</option>
              <option value="apparel">{t.shop.apparel}</option>
              <option value="supplements">{t.shop.supplements}</option>
            </select>

            <input
              type="text"
              placeholder="نام فارسی محصول"
              value={pNameFa}
              onChange={(e) => setPNameFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="English Product Name"
              value={pNameEn}
              onChange={(e) => setPNameEn(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder={locale === 'fa' ? 'زیرعنوان کوتاه' : 'Short subtitle'}
              value={pSubtitleFa}
              onChange={(e) => setPSubtitleFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <textarea
              rows={2}
              placeholder={locale === 'fa' ? 'توضیحات محصول' : 'Description'}
              value={pDescFa}
              onChange={(e) => setPDescFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-[#71717A]">USD</label>
                <input
                  type="number"
                  step="0.5"
                  value={pPriceUsd}
                  onChange={(e) => setPPriceUsd(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[#71717A]">
                  {locale === 'fa' ? 'موجودی انبار' : 'Stock'}
                </label>
                <input
                  type="number"
                  value={pStock}
                  onChange={(e) => setPStock(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={pManualToman}
                onChange={(e) => setPManualToman(e.target.checked)}
                className="accent-[var(--jmora-accent)]"
              />
              <span>{locale === 'fa' ? 'وارد کردن قیمت تومان به صورت دستی' : 'Manual Toman override'}</span>
            </label>

            {pManualToman ? (
              <input
                type="number"
                value={pTomanOverride}
                onChange={(e) => setPTomanOverride(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
              />
            ) : (
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-[#FAF9F7] dark:bg-[#1F1F25] px-3 py-2 text-xs font-mono-tabular font-semibold text-[var(--jmora-accent)]">
                {computedToman.toLocaleString('fa-IR')} {locale === 'fa' ? 'تومان' : 'Toman'}
              </div>
            )}

            <input
              type="text"
              placeholder={locale === 'fa' ? 'سایزها با کاما' : 'Sizes comma separated'}
              value={pSizes}
              onChange={(e) => setPSizes(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={locale === 'fa' ? 'لینک عکس محصول' : 'Product image URL'}
                value={pImageUrl}
                onChange={(e) => setPImageUrl(e.target.value)}
                className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <label className="inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
                <Upload className="h-3.5 w-3.5" />
                <span>{locale === 'fa' ? 'آپلود' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadToSetter(e.target.files?.[0], setPImageUrl)}
                />
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-xs font-medium text-white cursor-pointer"
            >
              {editingProductId
                ? locale === 'fa' ? 'ذخیره تغییرات محصول' : 'Update Product'
                : t.admin.addProduct}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {catalog.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.image}
                    alt={p.name[locale]}
                    className="h-14 w-14 rounded-lg object-cover bg-[#F2F0EC]"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name[locale]}</div>
                    <div className="text-xs text-[#71717A] font-mono-tabular">
                      ${p.priceUsd} · {p.priceToman.toLocaleString('fa-IR')} T · Stock: {p.stock}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditProduct(p)}
                    aria-label={`Edit ${p.name[locale]}`}
                    className="rounded-lg p-2 text-[#71717A] hover:text-[var(--jmora-accent)] cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    aria-label={`Delete ${p.name[locale]}`}
                    className="rounded-lg p-2 text-[#71717A] hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Private Trainee Progress Photos Inbox + Public Before/After CMS */}
      {tab === 'transformations' && (
        <div className="space-y-8">
          {/* Private Photos Sent Directly by Trainees to Coach */}
          <div className="jmora-card border border-[var(--jmora-accent)]/30 bg-white dark:bg-[#16161A] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-[var(--jmora-accent)]" />
                <h2 className="text-base font-semibold">
                  {locale === 'fa'
                    ? 'عکس‌های پیشرفت محرمانه شاگردان (ارسالی مستقیم به مربی)'
                    : 'Private Trainee Progress Photos Sent to Coach'}
                </h2>
              </div>
              <span className="text-xs font-mono-tabular text-[#71717A]">
                {progressPhotos.length} {locale === 'fa' ? 'مورد' : 'submissions'}
              </span>
            </div>

            {progressPhotos.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                {locale === 'fa'
                  ? 'هنوز هیچ شاگردی عکس پیشرفت محرمانه برای مربی نفرستاده است.'
                  : 'No private progress photos received yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {progressPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-black/10 dark:border-white/12 bg-[#FAF9F7] dark:bg-[#1F1F25] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {item.userName}{' '}
                        <span className="font-mono-tabular text-[#71717A]">({item.identifier})</span>
                      </span>
                      <span className="font-mono-tabular text-[#71717A]">
                        {item.createdAt.slice(0, 10)}
                        {item.weightKg ? ` · ${item.weightKg}kg` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {item.beforeImage && (
                        <img
                          src={item.beforeImage}
                          alt="Trainee Before"
                          className="h-32 w-full rounded-lg object-cover bg-black/10"
                        />
                      )}
                      {item.afterImage && (
                        <img
                          src={item.afterImage}
                          alt="Trainee After"
                          className="h-32 w-full rounded-lg object-cover bg-black/10"
                        />
                      )}
                    </div>

                    {item.note && <p className="text-xs">{item.note}</p>}

                    {item.coachFeedback && (
                      <div className="rounded-lg bg-emerald-600/12 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <strong>{locale === 'fa' ? 'پاسخ ثبت‌شده مربی:' : 'Sent Feedback:'}</strong>{' '}
                        {item.coachFeedback}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={photoFeedbackDrafts[item.id] || ''}
                        onChange={(e) =>
                          setPhotoFeedbackDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder={
                          locale === 'fa'
                            ? 'نظر و راهنمایی مربی را بنویسید...'
                            : 'Write coach feedback...'
                        }
                        className="flex-1 min-w-[160px] rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendPhotoFeedback(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--jmora-accent)] px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        <span>{locale === 'fa' ? 'ارسال نظر' : 'Reply'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishProgressPhoto(item.id)}
                        title={locale === 'fa' ? 'انتشار در گالری عمومی' : 'Promote to Public Gallery'}
                        className="inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-2.5 py-1.5 text-xs hover:border-[var(--jmora-accent)] cursor-pointer"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>{locale === 'fa' ? 'انتشار عمومی' : 'Publish'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProgressPhoto(item.id)}
                        aria-label="Delete private submission"
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form
              onSubmit={handleSaveTransformation}
              className="lg:col-span-5 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-3 h-fit"
            >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingTrId
                  ? locale === 'fa' ? 'ویرایش تغییر واقعی' : 'Edit Transformation'
                  : locale === 'fa' ? 'افزودن عکس قبل و بعد واقعی' : 'Add Before/After'}
              </h2>
              {editingTrId && (
                <button
                  type="button"
                  onClick={resetTrForm}
                  className="text-xs text-[var(--jmora-accent)] cursor-pointer"
                >
                  {locale === 'fa' ? 'لغو' : 'Cancel'}
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder={locale === 'fa' ? 'نام (فارسی)' : 'Name (FA)'}
              value={trNameFa}
              onChange={(e) => setTrNameFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="Name (EN)"
              value={trNameEn}
              onChange={(e) => setTrNameEn(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={trGender}
                onChange={(e) => setTrGender(e.target.value as 'women' | 'men')}
                className="rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-2 py-2 text-xs"
              >
                <option value="women">{t.transformations.women}</option>
                <option value="men">{t.transformations.men}</option>
              </select>
              <input
                type="number"
                value={trWeeks}
                onChange={(e) => setTrWeeks(e.target.value)}
                placeholder="Weeks"
                className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-xs font-mono-tabular"
              />
              <input
                type="text"
                value={trDelta}
                onChange={(e) => setTrDelta(e.target.value)}
                placeholder="-6 kg"
                className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-xs font-mono-tabular"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-3 text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
                <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
                <span>{trBeforeImg ? (locale === 'fa' ? 'قبل آماده است' : 'Before Ready') : (locale === 'fa' ? 'آپلود عکس قبل' : 'Upload Before')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadToSetter(e.target.files?.[0], setTrBeforeImg)}
                />
              </label>
              <label className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-3 text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
                <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
                <span>{trAfterImg ? (locale === 'fa' ? 'بعد آماده است' : 'After Ready') : (locale === 'fa' ? 'آپلود عکس بعد' : 'Upload After')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadToSetter(e.target.files?.[0], setTrAfterImg)}
                />
              </label>
            </div>

            <textarea
              rows={2}
              placeholder={locale === 'fa' ? 'توضیحات تغییر' : 'Story'}
              value={trTestimonialFa}
              onChange={(e) => setTrTestimonialFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-xs font-medium text-white cursor-pointer"
            >
              {editingTrId ? (locale === 'fa' ? 'به‌روزرسانی' : 'Update') : (locale === 'fa' ? 'انتشار در گالری' : 'Publish')}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {catalog.transformations.map((tr) => (
              <div
                key={tr.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={tr.beforeImage || tr.image}
                    alt="Before"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <img
                    src={tr.afterImage || tr.image}
                    alt="After"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {tr.name[locale]} ·{' '}
                      <span className="text-xs font-mono-tabular text-[var(--jmora-accent)]">
                        {tr.weightDeltaKg}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#71717A] max-w-xs">
                      {tr.testimonial[locale]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleApproveTr(tr.id, !tr.approved)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      tr.approved
                        ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-[var(--jmora-accent)] text-white'
                    }`}
                  >
                    {tr.approved && <Check className="h-3.5 w-3.5" />}
                    <span>{tr.approved ? t.admin.approved : t.admin.approve}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditTransformation(tr)}
                    className="rounded-lg p-2 text-[#71717A] hover:text-[var(--jmora-accent)] cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTr(tr.id)}
                    className="rounded-lg p-2 text-[#71717A] hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* TAB 5: Sponsors & Ads CRUD */}
      {tab === 'sponsors' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleSaveSponsor}
            className="lg:col-span-5 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingSpId
                  ? locale === 'fa' ? 'ویرایش اسپانسر' : 'Edit Sponsor'
                  : locale === 'fa' ? 'افزودن اسپانسر / تبلیغ جدید' : 'Add Sponsor / Ad'}
              </h2>
              {editingSpId && (
                <button
                  type="button"
                  onClick={resetSponsorForm}
                  className="text-xs text-[var(--jmora-accent)] cursor-pointer"
                >
                  {locale === 'fa' ? 'لغو' : 'Cancel'}
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="عنوان اسپانسر (فارسی)"
              value={spTitleFa}
              onChange={(e) => setSpTitleFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="Sponsor Title (English)"
              value={spTitleEn}
              onChange={(e) => setSpTitleEn(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder={locale === 'fa' ? 'توضیح کوتاه تبلیغ' : 'Ad subtitle'}
              value={spSubtitleFa}
              onChange={(e) => setSpSubtitleFa(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="برچسب (مثلاً اسپانسر)"
                value={spBadgeFa}
                onChange={(e) => setSpBadgeFa(e.target.value)}
                className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <input
                type="url"
                placeholder="https://..."
                value={spLinkUrl}
                onChange={(e) => setSpLinkUrl(e.target.value)}
                className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={locale === 'fa' ? 'لینک عکس بنر' : 'Banner URL'}
                value={spImage}
                onChange={(e) => setSpImage(e.target.value)}
                className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <label className="inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>{locale === 'fa' ? 'آپلود' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadToSetter(e.target.files?.[0], setSpImage)}
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-xs font-medium text-white cursor-pointer"
            >
              {editingSpId ? (locale === 'fa' ? 'ذخیره ویرایش' : 'Save Edit') : (locale === 'fa' ? 'افزودن اسپانسر' : 'Add Sponsor')}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {sponsors.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={sp.image} alt={sp.title[locale]} className="h-14 w-20 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{sp.title[locale]}</div>
                    <div className="text-xs text-[#71717A] truncate max-w-xs">{sp.subtitle[locale]}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleSponsorActive(sp)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      sp.active ? 'bg-emerald-600/15 text-emerald-600' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {sp.active ? (locale === 'fa' ? 'فعال' : 'Active') : (locale === 'fa' ? 'مخفی' : 'Hidden')}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditSponsor(sp)}
                    className="rounded-lg p-2 text-[#71717A] hover:text-[var(--jmora-accent)] cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(sp.id)}
                    className="rounded-lg p-2 text-[#71717A] hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Support Tickets */}
      {tab === 'tickets' && (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-8 text-center text-sm text-[#71717A]">
              {t.admin.noTickets}
            </div>
          ) : (
            tickets.map((tkt) => (
              <div
                key={tkt.id}
                className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--jmora-accent)]">
                      {tkt.id}
                    </span>
                    <span className="text-sm font-semibold">{tkt.name}</span>
                    <span className="text-xs text-[#71717A]">({tkt.contact})</span>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${
                      tkt.status === 'answered'
                        ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {tkt.status === 'answered' ? t.contact.statusAnswered : t.contact.statusOpen}
                  </span>
                </div>
                <div className="text-sm font-medium">{tkt.subject}</div>
                <p className="text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {tkt.message}
                </p>
                <form onSubmit={(e) => handleReplyTicket(e, tkt.id)} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyDrafts[tkt.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                    }
                    placeholder={t.admin.replyPlaceholder}
                    className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--jmora-accent)] px-4 py-2 text-xs font-medium text-white cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{t.admin.sendReply}</span>
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 7: Site Theme, Colors, Shape, Pricing & Hero Customizer */}
      {tab === 'theme' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSiteConfig(localConfig);
          }}
          className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-6"
        >
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--jmora-accent)]" />
            <h2 className="text-base font-semibold">
              {locale === 'fa'
                ? 'شخصی‌سازی کامل تم، رنگ، شکل کارت‌ها و محتوای سایت'
                : 'Global Theme, Shape, Pricing & Copy Customizer'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'رنگ اصلی برند (Accent)' : 'Accent Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localConfig.accentColor}
                  onChange={(e) => setLocalConfig({ ...localConfig, accentColor: e.target.value })}
                  className="h-9 w-12 rounded cursor-pointer border border-black/15"
                />
                {['#EA580C', '#10B981', '#2563EB', '#D97706', '#E11D48'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setLocalConfig({ ...localConfig, accentColor: hex })}
                    className="h-6 w-6 rounded-full border border-black/20 cursor-pointer"
                    style={{ backgroundColor: hex }}
                    aria-label={`Accent ${hex}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'فرم و گردی لبه‌ها (Shape)' : 'UI Shape / Radius'}
              </label>
              <select
                value={localConfig.radiusStyle}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    radiusStyle: e.target.value as SiteConfig['radiusStyle'],
                  })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs"
              >
                <option value="sharp">{locale === 'fa' ? 'تیز و معماری (Sharp)' : 'Sharp'}</option>
                <option value="rounded">{locale === 'fa' ? 'متعادل استاندارد (Rounded)' : 'Rounded'}</option>
                <option value="soft">{locale === 'fa' ? 'نرم و کپسولی (Soft)' : 'Soft'}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'تم پیش‌فرض بازدیدکنندگان' : 'Default Theme'}
              </label>
              <select
                value={localConfig.defaultTheme}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    defaultTheme: e.target.value as SiteConfig['defaultTheme'],
                  })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'لینک درگاه پرداخت Reymit' : 'Reymit Gateway URL'}
              </label>
              <input
                type="url"
                dir="ltr"
                value={localConfig.reymitUrl}
                onChange={(e) => setLocalConfig({ ...localConfig, reymitUrl: e.target.value })}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
              />
            </div>
          </div>

          {/* 3-Tier Coaching Pricing Controls */}
          <div className="rounded-xl border border-[var(--jmora-accent)]/25 bg-[#FAF9F7] dark:bg-[#1F1F25] p-4 space-y-3">
            <div className="text-xs font-semibold text-[var(--jmora-accent)]">
              {locale === 'fa'
                ? 'تعرفه سه سطح مربیگری و آموزش (تومان — قابل تغییر لحظه‌ای)'
                : '3-Tier Coaching Fees (Toman — Live Editable)'}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium">
                  {locale === 'fa' ? '۱. هزینه کمک مربی و آموزش حرکات' : '1. Assistant Coach Fee'}
                </label>
                <input
                  type="number"
                  value={localConfig.coachAssistantToman ?? localConfig.coachPassToman}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setLocalConfig({
                      ...localConfig,
                      coachAssistantToman: val,
                      coachPassToman: val,
                    });
                  }}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  {locale === 'fa' ? '۲. هزینه مربی معمولی' : '2. Standard Coach Fee'}
                </label>
                <input
                  type="number"
                  value={localConfig.standardCoachToman ?? 980000}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      standardCoachToman: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  {locale === 'fa' ? '۳. هزینه مربی اختصاصی VIP' : '3. Private VIP Coach Fee'}
                </label>
                <input
                  type="number"
                  value={localConfig.privateCoachToman ?? 2400000}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      privateCoachToman: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'نرخ دلار محاسبه فروشگاه (تومان)' : 'USD Exchange Rate'}
              </label>
              <input
                type="number"
                value={localConfig.usdRate}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, usdRate: Number(e.target.value) || 260000 })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'سود افزوده به هر کالا (تومان)' : 'Profit Margin (Toman)'}
              </label>
              <input
                type="number"
                value={localConfig.marginToman}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, marginToman: Number(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'ساعات کاری پشتیبانی' : 'Support Open Hours'}
              </label>
              <input
                type="text"
                value={localConfig.openHours.fa}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    openHours: { ...localConfig.openHours, fa: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Hero Title (FA)</label>
              <input
                type="text"
                value={localConfig.heroTitle.fa}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    heroTitle: { ...localConfig.heroTitle, fa: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                {locale === 'fa' ? 'تصویر بنر اصلی (Hero)' : 'Hero Banner Image'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localConfig.heroImage}
                  onChange={(e) => setLocalConfig({ ...localConfig, heroImage: e.target.value })}
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleUploadToSetter(e.target.files?.[0], (val) =>
                        setLocalConfig({ ...localConfig, heroImage: val })
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[var(--jmora-accent)] px-6 py-2.5 text-xs font-medium text-white cursor-pointer"
          >
            {locale === 'fa' ? 'ذخیره و اعمال زنده روی کل سایت' : 'Save & Apply Live'}
          </button>
        </form>
      )}

      {/* TAB 8: Articles CRUD & Anti-Cheat Security Events */}
      {tab === 'articlesSecurity' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-4">
            <form
              onSubmit={handleAddArticle}
              className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-3"
            >
              <h2 className="text-base font-semibold">{t.admin.addArticle}</h2>
              <input
                type="text"
                placeholder="عنوان فارسی مقاله"
                value={aTitleFa}
                onChange={(e) => setATitleFa(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="English Article Title"
                value={aTitleEn}
                onChange={(e) => setATitleEn(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                placeholder="خلاصه فارسی"
                value={aExcerptFa}
                onChange={(e) => setAExcerptFa(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-xs font-medium text-white cursor-pointer"
              >
                {t.admin.addArticle}
              </button>
            </form>

            <div className="space-y-2">
              {catalog.articles.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center justify-between rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-3.5 text-xs"
                >
                  <span className="font-semibold">{art.title[locale]}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteArticle(art.id)}
                    className="text-[#71717A] hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <span>{locale === 'fa' ? 'گزارش امنیتی و آنتی‌چیت' : 'Anti-Cheat & Security Log'}</span>
            </h2>
            {securityEvents.length === 0 ? (
              <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 text-xs text-[#71717A]">
                {locale === 'fa' ? 'رویداد مشکوکی ثبت نشده است.' : 'No security incidents recorded.'}
              </div>
            ) : (
              securityEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-red-500/25 bg-white dark:bg-[#16161A] p-4 text-xs space-y-1"
                >
                  <div className="flex justify-between font-mono-tabular font-semibold text-red-500">
                    <span>{ev.type}</span>
                    <span>{ev.createdAt.slice(0, 19)}</span>
                  </div>
                  <p className="text-[#52525B] dark:text-[#A1A1AA]">{ev.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
