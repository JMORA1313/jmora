import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Lock, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { SupportTicket } from '../types/jmora';

export function ContactPage() {
  const { locale, siteConfig, userState, addTicketId, setAuthOpen } = useApp();
  const t = getT(locale);

  const [name, setName] = useState(userState.auth?.name || '');
  const [contact, setContact] = useState(userState.auth?.identifier || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const loadTickets = useCallback(async () => {
    if (!userState.auth?.token) return;
    try {
      const res = await fetch('/api/tickets', {
        headers: { 'x-jmora-token': userState.auth.token },
      });
      if (res.ok) {
        const data = (await res.json()) as { tickets: SupportTicket[] };
        setTickets(data.tickets);
      }
    } catch {
      // ignore network error
    }
  }, [userState.auth?.token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (!name.trim() || !contact.trim() || !message.trim()) {
      setError(
        locale === 'fa'
          ? 'لطفاً نام، شماره تماس/ایمیل و متن پیام را پر کنید.'
          : 'Please enter your name, contact, and message.'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          subject: subject.trim() || (locale === 'fa' ? 'پشتیبانی عمومی' : 'General Support'),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
      const created = data.ticket as SupportTicket;
      addTicketId(created.id);
      setTickets((prev) => [created, ...prev]);
      setSent(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold sm:text-4xl">{t.contact.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#52525B] dark:text-[#A1A1AA]">
          {t.contact.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Support Open Hours Only + Submitted Tickets & Admin Replies */}
        <div className="lg:col-span-6 space-y-6">
          <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--jmora-accent)]" />
              <span>{t.contact.hoursTitle}</span>
            </h2>
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
              {siteConfig.openHours[locale] || t.contact.hoursText}
            </p>
          </div>

          <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--jmora-accent)]" />
                <span>{t.contact.myTicketsTitle}</span>
              </h2>
              {userState.auth?.token && (
                <button
                  type="button"
                  onClick={loadTickets}
                  className="text-xs font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
                >
                  {locale === 'fa' ? 'به‌روزرسانی' : 'Refresh'}
                </button>
              )}
            </div>

            {!userState.auth?.token ? (
              <p className="py-4 text-xs text-[#71717A]">{t.authGate.requiredDesc}</p>
            ) : tickets.length === 0 ? (
              <p className="py-4 text-xs text-[#71717A]">{t.contact.noTickets}</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="rounded-xl border border-black/8 dark:border-white/10 bg-[#FAF9F7] dark:bg-[#1F1F25] p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono-tabular font-semibold">{tkt.id}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-medium ${
                          tkt.status === 'answered'
                            ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {tkt.status === 'answered'
                          ? t.contact.statusAnswered
                          : t.contact.statusOpen}
                      </span>
                    </div>
                    <div className="text-sm font-semibold">{tkt.subject}</div>
                    <p className="text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                      {tkt.message}
                    </p>

                    {tkt.adminReply && (
                      <div className="mt-2 rounded-lg border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {t.contact.adminReplyLabel}
                        </div>
                        <p className="mt-1 leading-relaxed text-[#111111] dark:text-white">
                          {tkt.adminReply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Ticket Form (Account Required) */}
        <div className="lg:col-span-6 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 sm:p-8 h-fit">
          <h2 className="text-lg font-semibold">{t.contact.formTitle}</h2>

          {!userState.auth?.token ? (
            <div className="mt-6 rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-6 text-center space-y-3">
              <Lock className="mx-auto h-7 w-7 text-[var(--jmora-accent)]" />
              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{t.authGate.requiredDesc}</p>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-[var(--jmora-accent)] px-5 py-2 text-xs font-medium text-white cursor-pointer"
              >
                {t.authGate.openAuthBtn}
              </button>
            </div>
          ) : sent ? (
            <div className="mt-6 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2 text-sm">{t.contact.sentSuccess}</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 text-xs font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
              >
                {locale === 'fa' ? 'ارسال تیکت جدید' : 'Open another ticket'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium">{t.contact.name}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{t.contact.emailOrPhone}</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="09120000000"
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{t.contact.subject}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{t.contact.message}</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--jmora-accent)] py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {t.contact.send}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
