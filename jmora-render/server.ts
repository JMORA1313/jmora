import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { generateCoachReply } from './server/ai.ts';
import {
  getPublicCatalog,
  readStore,
  recalculateProductPrices,
  writeStore,
  type StoredUserRecord,
} from './server/store.ts';
import type {
  Article,
  ClientInfoSubmission,
  CoachAccessRequest,
  CoachMessage,
  CoachTier,
  OrderRecord,
  Product,
  ProgressPhotoSubmission,
  SecurityEvent,
  SiteConfig,
  SponsorAd,
  SupportTicket,
  Transformation,
  UserState,
} from './src/types/jmora.ts';
import { calculateTomanPrice } from './src/utils/pricing.ts';

function resolveTierPrice(config: SiteConfig, tier: CoachTier): number {
  if (tier === 'private') return config.privateCoachToman || 2_400_000;
  if (tier === 'standard') return config.standardCoachToman || 980_000;
  return config.coachAssistantToman || config.coachPassToman || 490_000;
}

function parseCoachTier(raw: unknown): CoachTier {
  if (raw === 'standard' || raw === 'private' || raw === 'assistant') return raw;
  return 'assistant';
}

function tierLabelFa(tier: CoachTier): string {
  if (tier === 'private') return 'مربی اختصاصی VIP';
  if (tier === 'standard') return 'مربی معمولی';
  return 'کمک مربی و آموزش حرکات';
}

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PHONE = '09155783522';
const ADMIN_EMAIL = 'avinadehnavi@gmail.com';
const SESSION_SECRET =
  process.env.JMORA_SESSION_SECRET ||
  crypto.createHash('sha256').update(`jmora-secret-${process.cwd()}`).digest('hex');

const captchaChallenges = new Map<string, { code: string; expiresAt: number }>();
const ipRequests = new Map<string, number[]>();

function normalizeDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizePhone(raw: string): string {
  const cleaned = normalizeDigits(raw).replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+98')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('0098')) return `0${cleaned.slice(4)}`;
  if (cleaned.startsWith('98') && cleaned.length === 12) return `0${cleaned.slice(2)}`;
  return cleaned;
}

function computeUserId(identifier: string): string {
  return `usr_${crypto.createHash('sha1').update(identifier).digest('hex').slice(0, 10)}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, original] = stored.split(':');
  if (!salt || !original) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(original, 'hex');
  if (candidate.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(candidate, originalBuf);
}

function signSessionToken(userId: string): string {
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      uid: string;
      exp: number;
    };
    if (!parsed.uid || parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function recordSecurityEvent(type: string, detail: string, req?: express.Request, user?: StoredUserRecord) {
  const store = readStore();
  const evt: SecurityEvent = {
    id: `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    detail: detail.slice(0, 240),
    userId: user?.id,
    identifier: user?.identifier,
    ip: req?.ip || req?.socket?.remoteAddress || 'unknown',
    createdAt: new Date().toISOString(),
  };
  store.securityEvents.unshift(evt);
  store.securityEvents = store.securityEvents.slice(0, 120);
  writeStore(store);
}

function containsMaliciousPayload(value: unknown, keyName = ''): string | null {
  if (keyName === '__proto__' || keyName === 'constructor' || keyName === 'prototype') {
    return `Forbidden key: ${keyName}`;
  }
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) return null;
    const lowered = value.toLowerCase();
    const patterns = ['<script', 'javascript:', 'onerror=', 'onload=', 'union select', 'drop table', 'sleep(', '-- '];
    for (const pat of patterns) {
      if (lowered.includes(pat)) return `Suspicious pattern detected: ${pat}`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = containsMaliciousPayload(item);
      if (hit) return hit;
    }
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const hit = containsMaliciousPayload(v, k);
      if (hit) return hit;
    }
  }
  return null;
}

function createCaptchaChallenge(): { challengeId: string; svgDataUrl: string } {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  const challengeId = crypto.randomUUID();
  captchaChallenges.set(challengeId, {
    code,
    expiresAt: Date.now() + 8 * 60 * 1000,
  });

  // Cleanup expired challenges
  const now = Date.now();
  for (const [k, v] of captchaChallenges.entries()) {
    if (v.expiresAt < now) captchaChallenges.delete(k);
  }

  const charsSvg = code
    .split('')
    .map((ch, idx) => {
      const x = 22 + idx * 30;
      const y = 34 + crypto.randomInt(-5, 6);
      const rot = crypto.randomInt(-14, 15);
      return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="monospace" font-size="24" font-weight="700" fill="#18181B">${ch}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="52" viewBox="0 0 176 52">
    <rect width="176" height="52" rx="8" fill="#F4F2EE"/>
    <path d="M8 ${crypto.randomInt(10, 40)} Q 88 ${crypto.randomInt(5, 48)} 168 ${crypto.randomInt(10, 42)}" stroke="#EA580C" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M10 ${crypto.randomInt(12, 44)} Q 90 ${crypto.randomInt(6, 46)} 166 ${crypto.randomInt(8, 42)}" stroke="#71717A" stroke-width="1" fill="none" opacity="0.45"/>
    ${charsSvg}
  </svg>`;

  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return { challengeId, svgDataUrl };
}

function getAuthenticatedUser(req: express.Request): StoredUserRecord | null {
  const token = String(req.headers['x-jmora-token'] || '').trim();
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const store = readStore();
  return store.users[userId] || null;
}

function requireAuth(req: express.Request, res: express.Response): StoredUserRecord | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return null;
  }
  return user;
}

function requireAdmin(req: express.Request, res: express.Response): StoredUserRecord | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!user.isAdmin) {
    recordSecurityEvent('unauthorized_admin_attempt', `User ${user.identifier} attempted admin endpoint ${req.path}`, req, user);
    res.status(403).json({ error: 'Admin privileges required.' });
    return null;
  }
  return user;
}

function verifyHumanChallenge(body: Record<string, unknown>): string | null {
  if (!body?.humanChecked) {
    return 'لطفاً تیک «من ربات نیستم» را بزنید / Please confirm you are not a robot.';
  }
  const challengeId = String(body?.challengeId || '').trim();
  const challengeCode = normalizeDigits(String(body?.challengeCode || '').trim()).toUpperCase();
  const record = captchaChallenges.get(challengeId);
  if (!record || record.expiresAt < Date.now()) {
    return 'کد امنیتی منقضی شده است؛ لطفاً کد جدید بگیرید / Verification code expired.';
  }
  if (record.code !== challengeCode) {
    return 'کد را به درستی وارد کنید / Please enter the verification code accurately.';
  }
  captchaChallenges.delete(challengeId);
  return null;
}

function isAdminIdentifier(method: 'phone' | 'email', identifier: string): boolean {
  if (method === 'phone') return identifier === ADMIN_PHONE;
  return identifier === ADMIN_EMAIL;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Sliding-window rate limit & anti-cheat payload firewall for /api/*
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (ipRequests.get(ip) || []).filter((ts) => now - ts < 60_000);
    recent.push(now);
    ipRequests.set(ip, recent);

    if (recent.length > 200) {
      recordSecurityEvent('rate_limit_exceeded', `IP exceeded 200 req/min on ${req.path}`, req);
      return res.status(429).json({ error: 'Too many requests. Slow down.' });
    }

    if (req.body && typeof req.body === 'object') {
      const threat = containsMaliciousPayload(req.body);
      if (threat) {
        recordSecurityEvent('malicious_payload_blocked', `${threat} at ${req.path}`, req);
        return res.status(403).json({ error: 'Security firewall blocked unsafe input.' });
      }
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'jmora' });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json(getPublicCatalog());
  });

  // Anti-cheat telemetry from client
  app.post('/api/security/event', (req, res) => {
    const user = getAuthenticatedUser(req) || undefined;
    const type = String(req.body?.type || 'devtools_or_tamper').slice(0, 60);
    const detail = String(req.body?.detail || 'Protected inspection attempt').slice(0, 200);
    recordSecurityEvent(type, detail, req, user);
    res.json({ logged: true });
  });

  // Visual challenge endpoint ("من ربات نیستم" + typed security code)
  app.get('/api/auth/challenge', (_req, res) => {
    res.json(createCaptchaChallenge());
  });

  // Create Account or First-Time Activation
  app.post('/api/auth/register', (req, res) => {
    const challengeErr = verifyHumanChallenge(req.body || {});
    if (challengeErr) return res.status(400).json({ error: challengeErr });

    const method: 'phone' | 'email' = req.body?.method === 'email' ? 'email' : 'phone';
    const rawIdentifier = String(req.body?.identifier || '').trim();
    const identifier =
      method === 'phone' ? normalizePhone(rawIdentifier) : rawIdentifier.toLowerCase();
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');

    if (method === 'phone' && identifier.length < 8) {
      return res.status(400).json({ error: 'Valid mobile phone number is required.' });
    }
    if (method === 'email' && !identifier.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!name || password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Name and a password (at least 6 characters) are required.' });
    }

    const store = readStore();
    const userId = computeUserId(identifier);
    if (store.users[userId]) {
      return res
        .status(409)
        .json({ error: 'Account already exists. Please switch to Sign In.' });
    }

    const isAdmin = isAdminIdentifier(method, identifier);
    const userRecord: StoredUserRecord = {
      id: userId,
      method,
      identifier,
      name,
      passwordHash: hashPassword(password),
      isAdmin,
      coachAccessUnlocked: isAdmin,
      createdAt: new Date().toISOString(),
    };
    store.users[userId] = userRecord;
    writeStore(store);

    const token = signSessionToken(userId);
    res.status(201).json({
      user: {
        id: userRecord.id,
        method: userRecord.method,
        identifier: userRecord.identifier,
        name: userRecord.name,
        isAdmin: userRecord.isAdmin,
        coachAccessUnlocked: userRecord.coachAccessUnlocked,
        coachTier: userRecord.coachTier,
        token,
      },
    });
  });

  // Sign In
  app.post('/api/auth/login', (req, res) => {
    const challengeErr = verifyHumanChallenge(req.body || {});
    if (challengeErr) return res.status(400).json({ error: challengeErr });

    const method: 'phone' | 'email' = req.body?.method === 'email' ? 'email' : 'phone';
    const rawIdentifier = String(req.body?.identifier || '').trim();
    const identifier =
      method === 'phone' ? normalizePhone(rawIdentifier) : rawIdentifier.toLowerCase();
    const password = String(req.body?.password || '');

    const store = readStore();
    const userId = computeUserId(identifier);
    const userRecord = store.users[userId];

    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      recordSecurityEvent('failed_login', `Failed login attempt for ${identifier}`, req);
      return res.status(401).json({ error: 'Invalid credentials. Check identifier and password.' });
    }

    const token = signSessionToken(userRecord.id);
    const savedState = store.userStates[userRecord.id] || null;
    res.json({
      user: {
        id: userRecord.id,
        method: userRecord.method,
        identifier: userRecord.identifier,
        name: userRecord.name,
        isAdmin: userRecord.isAdmin,
        coachAccessUnlocked: userRecord.coachAccessUnlocked || userRecord.isAdmin,
        coachTier: userRecord.coachTier || (userRecord.isAdmin ? 'private' : undefined),
        token,
      },
      state: savedState,
    });
  });

  app.get('/api/user/:userId/state', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (user.id !== req.params.userId && !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const store = readStore();
    const existing = store.userStates[req.params.userId] || null;
    res.json({
      state: existing,
      coachAccessUnlocked: user.coachAccessUnlocked || user.isAdmin,
      coachTier: user.coachTier || (user.isAdmin ? 'private' : undefined),
    });
  });

  app.put('/api/user/:userId/state', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const nextState = req.body?.state as UserState | undefined;
    if (!nextState) {
      return res.status(400).json({ error: 'Missing user state payload.' });
    }
    const store = readStore();
    // Strip token before storing in userStates
    const sanitizedAuth = nextState.auth
      ? {
          ...nextState.auth,
          token: undefined,
          isAdmin: user.isAdmin,
          coachAccessUnlocked: user.coachAccessUnlocked || user.isAdmin,
          coachTier: user.coachTier || (user.isAdmin ? 'private' : undefined),
        }
      : null;
    store.userStates[user.id] = {
      ...nextState,
      auth: sanitizedAuth,
      coachAccessUnlocked: user.coachAccessUnlocked || user.isAdmin,
      coachTier: user.coachTier || (user.isAdmin ? 'private' : undefined),
    };
    writeStore(store);
    res.json({ saved: true });
  });

  // Paid Exercise & 3-Tier Coaching Unlock Requests (Reymit)
  app.post('/api/coach/unlock-request', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const reymitRef = String(req.body?.reymitRef || '').trim();
    const note = String(req.body?.note || '').trim();
    const planTier = parseCoachTier(req.body?.planTier);
    if (!reymitRef || reymitRef.length < 3) {
      return res.status(400).json({ error: 'Payment reference or full payer name is required.' });
    }
    const store = readStore();
    const requestItem: CoachAccessRequest = {
      id: `CREQ-${Date.now().toString().slice(-6)}`,
      userId: user.id,
      userName: user.name,
      identifier: user.identifier,
      planTier,
      reymitRef,
      amountToman: resolveTierPrice(store.siteConfig, planTier),
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    store.coachAccessRequests.unshift(requestItem);
    if (store.userStates[user.id]) {
      store.userStates[user.id].coachRequestStatus = 'pending';
    }
    writeStore(store);
    res.status(201).json({ request: requestItem });
  });

  // Client Info & Goal Submissions (Requires Auth + Coach Pass unless Admin)
  app.post('/api/info-submissions', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!user.coachAccessUnlocked && !user.isAdmin) {
      return res.status(403).json({ error: 'Please complete the Reymit Coach Pass first.' });
    }

    const store = readStore();
    const body = req.body as Partial<ClientInfoSubmission> & { locale?: 'fa' | 'en' };
    const fullName = String(body.fullName || user.name || '').trim();
    const contact = String(body.contact || user.identifier || '').trim();
    const goalText = String(body.goalText || '').trim();
    if (!fullName || !contact || !goalText) {
      return res.status(400).json({ error: 'Name, contact, and goal are required.' });
    }

    const submission: ClientInfoSubmission = {
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      fullName,
      contact,
      gender: body.gender === 'male' ? 'male' : 'female',
      age: Math.max(12, Math.min(95, Number(body.age) || 26)),
      heightCm: Math.max(100, Math.min(240, Number(body.heightCm) || 168)),
      weightKg: Math.max(30, Math.min(250, Number(body.weightKg) || 65)),
      goalText,
      experienceAndGear: String(body.experienceAndGear || '').trim(),
      injuriesNotes: String(body.injuriesNotes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    store.infoSubmissions.unshift(submission);
    const thread = store.coachMessages[user.id] || [];
    const introMsg: CoachMessage = {
      id: `msg_${Date.now()}`,
      userId: user.id,
      sender: 'user',
      text: `${submission.goalText}${submission.experienceAndGear ? ` (${submission.experienceAndGear})` : ''}`,
      createdAt: new Date().toISOString(),
    };
    thread.push(introMsg);

    if (store.siteConfig.aiAutoReply) {
      const replyText = await generateCoachReply({
        locale: body.locale === 'en' ? 'en' : 'fa',
        userName: fullName,
        userInfo: submission,
        history: thread,
        latestMessage: introMsg.text,
      });
      thread.push({
        id: `msg_${Date.now() + 1}`,
        userId: user.id,
        sender: 'ai',
        text: replyText,
        createdAt: new Date().toISOString(),
      });
    }

    store.coachMessages[user.id] = thread;
    writeStore(store);
    res.status(201).json({ submission, messages: thread });
  });

  // Coaching Thread for Signed-in Unlocked User
  app.get('/api/coach/thread', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    const unlocked = Boolean(user.coachAccessUnlocked || user.isAdmin);
    res.json({
      unlocked,
      messages: unlocked ? store.coachMessages[user.id] || [] : [],
      requests: store.coachAccessRequests.filter((r) => r.userId === user.id),
    });
  });

  app.post('/api/coach/thread', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!user.coachAccessUnlocked && !user.isAdmin) {
      return res.status(403).json({ error: 'Coach access must be unlocked first.' });
    }
    const text = String(req.body?.text || '').trim();
    const locale = req.body?.locale === 'en' ? 'en' : 'fa';
    if (!text) return res.status(400).json({ error: 'Message text is required.' });

    const store = readStore();
    const thread = store.coachMessages[user.id] || [];
    const userMsg: CoachMessage = {
      id: `msg_${Date.now()}`,
      userId: user.id,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    thread.push(userMsg);

    if (store.siteConfig.aiAutoReply) {
      const latestInfo = store.infoSubmissions.find((s) => s.userId === user.id) || null;
      const aiReply = await generateCoachReply({
        locale,
        userName: user.name,
        userInfo: latestInfo,
        history: thread,
        latestMessage: text,
      });
      thread.push({
        id: `msg_${Date.now() + 1}`,
        userId: user.id,
        sender: 'ai',
        text: aiReply,
        createdAt: new Date().toISOString(),
      });
    }

    store.coachMessages[user.id] = thread;
    writeStore(store);
    res.status(201).json({ messages: thread });
  });

  // In-Site Support Tickets (Requires Auth)
  app.post('/api/tickets', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    const name = String(req.body?.name || user.name || '').trim();
    const contact = String(req.body?.contact || user.identifier || '').trim();
    const subject = String(req.body?.subject || '').trim() || 'پشتیبانی';
    const message = String(req.body?.message || '').trim();
    if (!name || !contact || !message) {
      return res.status(400).json({ error: 'Name, contact, and message are required.' });
    }
    const ticket: SupportTicket = {
      id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      name,
      contact,
      subject,
      message,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    store.tickets.unshift(ticket);
    writeStore(store);
    res.status(201).json({ ticket });
  });

  app.get('/api/tickets', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    const filtered = store.tickets.filter(
      (t) => t.userId === user.id || t.contact.toLowerCase() === user.identifier.toLowerCase()
    );
    res.json({ tickets: filtered });
  });

  // Shop Orders (Requires Auth & Strictly Scoped to User)
  app.post('/api/orders', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    const { customerName, phone, address, items } = req.body as {
      customerName?: string;
      phone?: string;
      address?: string;
      items?: { productId: string; size: string; color: string; quantity: number }[];
    };

    if (!customerName?.trim() || !phone?.trim() || !address?.trim() || !items?.length) {
      return res.status(400).json({ error: 'Customer details and cart items are required.' });
    }

    let totalUsd = 0;
    let totalToman = 0;
    const orderItems: OrderRecord['items'] = [];

    for (const item of items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (!product) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      product.stock = Math.max(0, product.stock - qty);
      totalUsd += product.priceUsd * qty;
      totalToman += product.priceToman * qty;
      orderItems.push({
        productId: product.id,
        name: product.name,
        size: item.size,
        color: item.color,
        quantity: qty,
        priceUsd: product.priceUsd,
        priceToman: product.priceToman,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'No valid products found in bag.' });
    }

    const order: OrderRecord = {
      id: `JMR-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: user.id,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gateway: 'reymit',
      status: 'preparing',
      totalUsd,
      totalToman,
      items: orderItems,
    };

    store.orders.unshift(order);
    writeStore(store);
    res.status(201).json({ order });
  });

  app.get('/api/orders/mine', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    res.json({
      orders: store.orders.filter((o) => o.userId === user.id),
    });
  });

  // Public Transformations Gallery — ADMIN ONLY (Non-admins must send private progress photos to Coach)
  app.post('/api/transformations', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const store = readStore();
    const payload = req.body as Partial<Transformation>;
    if (!payload.name?.fa || !payload.testimonial?.fa) {
      return res.status(400).json({ error: 'Name and testimonial are required.' });
    }
    const beforeImage =
      payload.beforeImage?.trim() || '/src/assets/images/article_strength_studio_1795014056746.jpg';
    const afterImage =
      payload.afterImage?.trim() || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg';

    const created: Transformation = {
      id: `tr_${Date.now()}`,
      userId: admin.id,
      name: payload.name,
      gender: payload.gender || 'women',
      goal: payload.goal || 'recomp',
      durationWeeks: Number(payload.durationWeeks) || 12,
      weightDeltaKg: payload.weightDeltaKg || '-4 kg',
      programName: payload.programName || { fa: 'مسیر اختصاصی JMORA', en: 'JMORA Custom Journey' },
      testimonial: payload.testimonial,
      beforeMetrics: payload.beforeMetrics || { fa: 'شروع مسیر', en: 'Start' },
      afterMetrics: payload.afterMetrics || { fa: 'نتیجه نهایی', en: 'Result' },
      beforeImage,
      afterImage,
      image: afterImage,
      approved: true,
    };
    store.transformations.unshift(created);
    writeStore(store);
    res.status(201).json({ transformation: created });
  });

  // Private Before/After Progress Photos Sent Directly to Coach (NEVER public unless Admin explicitly publishes)
  app.post('/api/progress-photos', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const beforeImage = String(req.body?.beforeImage || '').trim();
    const afterImage = String(req.body?.afterImage || '').trim();
    const note = String(req.body?.note || '').trim();
    const weightStr =
      req.body?.weightKg !== undefined && String(req.body.weightKg).trim() !== ''
        ? String(req.body.weightKg).trim()
        : undefined;
    if (!beforeImage && !afterImage) {
      return res
        .status(400)
        .json({ error: 'Please upload at least one before or after progress photo.' });
    }
    const store = readStore();
    const submission: ProgressPhotoSubmission = {
      id: `pph_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      userName: user.name,
      identifier: user.identifier,
      beforeImage,
      afterImage,
      weightKg: weightStr,
      note,
      createdAt: new Date().toISOString(),
    };
    store.progressPhotos.unshift(submission);
    writeStore(store);
    res.status(201).json({ submission });
  });

  app.get('/api/progress-photos/mine', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const store = readStore();
    res.json({
      submissions: store.progressPhotos.filter((p) => p.userId === user.id),
    });
  });

  // ================= ADMIN ENDPOINTS =================

  app.get('/api/admin/overview', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    res.json({
      submissions: store.infoSubmissions,
      tickets: store.tickets,
      orders: store.orders,
      accessRequests: store.coachAccessRequests,
      coachMessages: store.coachMessages,
      progressPhotos: store.progressPhotos,
      sponsors: store.sponsors,
      siteConfig: store.siteConfig,
      securityEvents: store.securityEvents,
      users: Object.values(store.users).map((u) => ({
        id: u.id,
        name: u.name,
        identifier: u.identifier,
        method: u.method,
        isAdmin: u.isAdmin,
        coachAccessUnlocked: u.coachAccessUnlocked,
        coachTier: u.coachTier,
        createdAt: u.createdAt,
      })),
    });
  });

  app.put('/api/admin/site-config', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const patch = req.body as Partial<SiteConfig>;
    const nextAssistant =
      patch.coachAssistantToman !== undefined
        ? Number(patch.coachAssistantToman)
        : patch.coachPassToman !== undefined
          ? Number(patch.coachPassToman)
          : store.siteConfig.coachAssistantToman;
    const nextConfig: SiteConfig = {
      ...store.siteConfig,
      ...patch,
      coachAssistantToman: nextAssistant,
      coachPassToman: nextAssistant,
      standardCoachToman:
        patch.standardCoachToman !== undefined
          ? Number(patch.standardCoachToman)
          : store.siteConfig.standardCoachToman,
      privateCoachToman:
        patch.privateCoachToman !== undefined
          ? Number(patch.privateCoachToman)
          : store.siteConfig.privateCoachToman,
    };
    store.siteConfig = nextConfig;
    store.products = recalculateProductPrices(store.products, nextConfig);
    writeStore(store);
    res.json({ siteConfig: store.siteConfig, products: store.products });
  });

  // Admin Private Progress Photos Review, Feedback & Optional Public Promotion
  app.post('/api/admin/progress-photos/:id/feedback', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const item = store.progressPhotos.find((p) => p.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Progress submission not found.' });
    const feedback = String(req.body?.feedback || '').trim();
    if (!feedback) return res.status(400).json({ error: 'Feedback text is required.' });
    item.coachFeedback = feedback;
    item.reviewedAt = new Date().toISOString();

    const thread = store.coachMessages[item.userId] || [];
    thread.push({
      id: `msg_${Date.now()}`,
      userId: item.userId,
      sender: 'coach',
      text: `بازخورد مربی روی عکس پیشرفت شما:\n${feedback}`,
      createdAt: new Date().toISOString(),
    });
    store.coachMessages[item.userId] = thread;
    writeStore(store);
    res.json({ submission: item });
  });

  app.post('/api/admin/progress-photos/:id/publish', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const item = store.progressPhotos.find((p) => p.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Progress submission not found.' });
    const beforeImg =
      item.beforeImage || '/src/assets/images/article_strength_studio_1795014056746.jpg';
    const afterImg =
      item.afterImage || item.beforeImage || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg';

    const created: Transformation = {
      id: `tr_${Date.now()}`,
      userId: item.userId,
      name: { fa: item.userName, en: item.userName },
      gender: req.body?.gender === 'men' ? 'men' : 'women',
      goal: 'recomp',
      durationWeeks: Number(req.body?.durationWeeks) || 12,
      weightDeltaKg: String(req.body?.weightDeltaKg || (item.weightKg ? `${item.weightKg} kg` : 'نتیجه واقعی')),
      programName: { fa: 'مسیر اختصاصی JMORA', en: 'JMORA Custom Journey' },
      testimonial: {
        fa: item.note || 'نتیجه پیگیری منظم تمرین با مربی JMORA.',
        en: item.note || 'Consistent progress achieved with JMORA coaching.',
      },
      beforeMetrics: { fa: 'قبل', en: 'Before' },
      afterMetrics: { fa: 'بعد', en: 'After' },
      beforeImage: beforeImg,
      afterImage: afterImg,
      image: afterImg,
      approved: true,
    };
    store.transformations.unshift(created);
    writeStore(store);
    res.status(201).json({ transformation: created });
  });

  app.delete('/api/admin/progress-photos/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    store.progressPhotos = store.progressPhotos.filter((p) => p.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  // Admin Access Requests & Coaching Replies
  app.patch('/api/admin/access-requests/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const reqItem = store.coachAccessRequests.find((r) => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Access request not found.' });

    const wasApproved = reqItem.status === 'approved';
    const status = req.body?.status === 'rejected' ? 'rejected' : 'approved';
    const tier = parseCoachTier(reqItem.planTier);
    reqItem.status = status;
    reqItem.reviewedAt = new Date().toISOString();

    const user = store.users[reqItem.userId];
    if (user) {
      user.coachAccessUnlocked = status === 'approved';
      if (status === 'approved') {
        user.coachTier = tier;
      }
    }
    if (store.userStates[reqItem.userId]) {
      store.userStates[reqItem.userId].coachAccessUnlocked = status === 'approved';
      store.userStates[reqItem.userId].coachRequestStatus = status;
      if (status === 'approved') {
        store.userStates[reqItem.userId].coachTier = tier;
      }
    }

    if (status === 'approved' && !wasApproved) {
      const thread = store.coachMessages[reqItem.userId] || [];
      thread.push({
        id: `msg_${Date.now()}`,
        userId: reqItem.userId,
        sender: 'coach',
        text: `پرداخت شما تایید شد و سطح «${tierLabelFa(tier)}» به همراه آموزش کامل حرکات برای شما فعال شد. اطلاعات بدنی و هدف خود را ثبت کنید تا تمرینتان را شروع کنیم.`,
        createdAt: new Date().toISOString(),
      });
      store.coachMessages[reqItem.userId] = thread;
    }

    writeStore(store);
    res.json({ request: reqItem });
  });

  app.post('/api/admin/users/:userId/coach-access', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const user = store.users[req.params.userId];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const unlocked = Boolean(req.body?.unlocked);
    user.coachAccessUnlocked = unlocked;
    if (store.userStates[user.id]) {
      store.userStates[user.id].coachAccessUnlocked = unlocked;
    }
    writeStore(store);
    res.json({ userId: user.id, coachAccessUnlocked: unlocked });
  });

  app.post('/api/admin/coach/:userId/reply', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const text = String(req.body?.text || '').trim();
    const sender = req.body?.sender === 'ai' ? 'ai' : 'coach';
    if (!text) return res.status(400).json({ error: 'Reply text is required.' });
    const thread = store.coachMessages[req.params.userId] || [];
    const msg: CoachMessage = {
      id: `msg_${Date.now()}`,
      userId: req.params.userId,
      sender,
      text,
      createdAt: new Date().toISOString(),
    };
    thread.push(msg);
    store.coachMessages[req.params.userId] = thread;
    writeStore(store);
    res.status(201).json({ messages: thread });
  });

  app.post('/api/admin/coach/:userId/ai-draft', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const user = store.users[req.params.userId];
    const info = store.infoSubmissions.find((s) => s.userId === req.params.userId) || null;
    const history = store.coachMessages[req.params.userId] || [];
    const latestUserMsg =
      [...history].reverse().find((m) => m.sender === 'user')?.text ||
      info?.goalText ||
      'درخواست برنامه و راهنمایی مربی';
    const locale = req.body?.locale === 'en' ? 'en' : 'fa';

    const draft = await generateCoachReply({
      locale,
      userName: user?.name || info?.fullName || 'ورزشکار',
      userInfo: info,
      history,
      latestMessage: latestUserMsg,
    });
    res.json({ draft });
  });

  // Admin Orders
  app.patch('/api/admin/orders/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const status = req.body?.status;
    if (status === 'paid' || status === 'preparing' || status === 'shipped') {
      order.status = status;
    }
    writeStore(store);
    res.json({ order });
  });

  // Admin Tickets
  app.post('/api/admin/tickets/:id/reply', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const found = store.tickets.find((t) => t.id === req.params.id);
    if (!found) return res.status(404).json({ error: 'Ticket not found.' });
    const reply = String(req.body?.reply || '').trim();
    if (!reply) return res.status(400).json({ error: 'Reply text is required.' });
    found.adminReply = reply;
    found.status = 'answered';
    found.repliedAt = new Date().toISOString();
    writeStore(store);
    res.json({ ticket: found });
  });

  // Admin Store Products CRUD
  app.post('/api/admin/products', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const p = req.body as Partial<Product>;
    if (!p.name?.en || !p.name?.fa) {
      return res.status(400).json({ error: 'Bilingual product name is required.' });
    }
    const priceUsd = Math.max(0, Number(p.priceUsd) || 2);
    const manualToman = Boolean(p.manualToman && p.priceToman);
    const priceToman = manualToman
      ? Number(p.priceToman)
      : calculateTomanPrice(priceUsd, store.siteConfig.usdRate, store.siteConfig.marginToman);
    const imageUrl = p.image?.trim() || '/src/assets/images/shop_mineral_water_1795022774737.jpg';
    const created: Product = {
      id: `prod_${Date.now()}`,
      slug: `jmora-${Date.now()}`,
      category: p.category || 'water',
      name: p.name,
      subtitle: p.subtitle || { fa: 'کیفیت منتخب JMORA', en: 'JMORA Curated Release' },
      description: p.description || { fa: 'محصول جدید فروشگاه JMORA.', en: 'New JMORA item.' },
      priceUsd,
      priceToman,
      manualToman,
      image: imageUrl,
      gallery: [imageUrl],
      sizes: p.sizes?.length ? p.sizes : ['Standard'],
      colors: p.colors?.length ? p.colors : [{ name: { fa: 'استاندارد', en: 'Standard' }, hex: '#18181B' }],
      stock: Number(p.stock) || 20,
      featured: Boolean(p.featured),
    };
    store.products.unshift(created);
    writeStore(store);
    res.status(201).json({ product: created });
  });

  app.patch('/api/admin/products/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
    const existing = store.products[idx];
    const patch = req.body as Partial<Product>;
    const priceUsd = patch.priceUsd !== undefined ? Math.max(0, Number(patch.priceUsd)) : existing.priceUsd;
    const manualToman =
      patch.manualToman !== undefined ? Boolean(patch.manualToman) : Boolean(existing.manualToman);
    const priceToman = manualToman
      ? Number(patch.priceToman ?? existing.priceToman)
      : calculateTomanPrice(priceUsd, store.siteConfig.usdRate, store.siteConfig.marginToman);
    const nextImage = patch.image?.trim() || existing.image;

    store.products[idx] = {
      ...existing,
      ...patch,
      priceUsd,
      priceToman,
      manualToman,
      image: nextImage,
      gallery: [nextImage],
      stock: patch.stock !== undefined ? Math.max(0, Number(patch.stock)) : existing.stock,
    };
    writeStore(store);
    res.json({ product: store.products[idx] });
  });

  app.delete('/api/admin/products/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    store.products = store.products.filter((p) => p.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  // Admin Transformations CRUD (Separate Before & After images)
  app.post('/api/admin/transformations', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const payload = req.body as Partial<Transformation>;
    if (!payload.name?.fa || !payload.testimonial?.fa) {
      return res.status(400).json({ error: 'Name and story are required.' });
    }
    const beforeImage =
      payload.beforeImage?.trim() || '/src/assets/images/article_strength_studio_1795014056746.jpg';
    const afterImage =
      payload.afterImage?.trim() || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg';

    const created: Transformation = {
      id: `tr_${Date.now()}`,
      name: {
        fa: payload.name.fa,
        en: payload.name.en || payload.name.fa,
      },
      gender: payload.gender === 'men' ? 'men' : 'women',
      goal: payload.goal || 'recomp',
      durationWeeks: Number(payload.durationWeeks) || 12,
      weightDeltaKg: payload.weightDeltaKg || '-4 kg',
      programName: payload.programName || { fa: 'تحول واقعی JMORA', en: 'JMORA Transformation' },
      testimonial: {
        fa: payload.testimonial.fa,
        en: payload.testimonial.en || payload.testimonial.fa,
      },
      beforeMetrics: payload.beforeMetrics || { fa: 'قبل', en: 'Before' },
      afterMetrics: payload.afterMetrics || { fa: 'بعد', en: 'After' },
      beforeImage,
      afterImage,
      image: afterImage,
      approved: payload.approved !== false,
    };
    store.transformations.unshift(created);
    writeStore(store);
    res.status(201).json({ transformation: created });
  });

  app.patch('/api/admin/transformations/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const idx = store.transformations.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Transformation not found.' });
    const existing = store.transformations[idx];
    const patch = req.body as Partial<Transformation>;
    const nextAfter = patch.afterImage?.trim() || existing.afterImage;
    store.transformations[idx] = {
      ...existing,
      ...patch,
      beforeImage: patch.beforeImage?.trim() || existing.beforeImage,
      afterImage: nextAfter,
      image: nextAfter,
    };
    writeStore(store);
    res.json({ transformation: store.transformations[idx] });
  });

  app.delete('/api/admin/transformations/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    store.transformations = store.transformations.filter((t) => t.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  // Admin Sponsors / Advertisers CRUD
  app.post('/api/admin/sponsors', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const s = req.body as Partial<SponsorAd>;
    if (!s.title?.fa) {
      return res.status(400).json({ error: 'Sponsor title is required.' });
    }
    const created: SponsorAd = {
      id: `sp_${Date.now()}`,
      title: { fa: s.title.fa, en: s.title.en || s.title.fa },
      subtitle: s.subtitle || { fa: 'همکار تبلیغاتی JMORA', en: 'JMORA Featured Sponsor' },
      badge: s.badge || { fa: 'اسپانسر', en: 'Sponsored' },
      image: s.image?.trim() || '/src/assets/images/sponsor_banner_studio_1795022775859.jpg',
      linkUrl: s.linkUrl?.trim() || 'https://reymit.ir/JMORA',
      active: s.active !== false,
      createdAt: new Date().toISOString(),
    };
    store.sponsors.unshift(created);
    writeStore(store);
    res.status(201).json({ sponsor: created });
  });

  app.patch('/api/admin/sponsors/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const idx = store.sponsors.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Sponsor not found.' });
    store.sponsors[idx] = { ...store.sponsors[idx], ...(req.body as Partial<SponsorAd>) };
    writeStore(store);
    res.json({ sponsor: store.sponsors[idx] });
  });

  app.delete('/api/admin/sponsors/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    store.sponsors = store.sponsors.filter((s) => s.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  // Admin Articles CRUD
  app.post('/api/admin/articles', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    const a = req.body as Partial<Article>;
    if (!a.title?.fa || !a.title?.en) {
      return res.status(400).json({ error: 'Bilingual article title is required.' });
    }
    const created: Article = {
      id: `art_${Date.now()}`,
      slug: `article-${Date.now()}`,
      category: a.category || 'training',
      title: a.title,
      excerpt: a.excerpt || { fa: 'راهنمای کاربردی جدید JMORA.', en: 'New JMORA training insight.' },
      content: a.content?.length
        ? a.content
        : [{ fa: a.excerpt?.fa || 'محتوای مقاله', en: a.excerpt?.en || 'Article body' }],
      readMinutes: Number(a.readMinutes) || 4,
      tags: [{ fa: 'تازه', en: 'New' }],
      image: a.image?.trim() || '/src/assets/images/article_strength_studio_1795014056746.jpg',
      publishedAt: new Date().toISOString().slice(0, 10),
    };
    store.articles.unshift(created);
    writeStore(store);
    res.status(201).json({ article: created });
  });

  app.delete('/api/admin/articles/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const store = readStore();
    store.articles = store.articles.filter((a) => a.id !== req.params.id);
    writeStore(store);
    res.json({ deleted: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const srcAssetsDir = path.resolve(process.cwd(), 'src/assets');
    app.use('/src/assets', express.static(srcAssetsDir));
    app.use('/JMORA/src/assets', express.static(srcAssetsDir));
    app.use('/JMORA', express.static(distDir));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JMORA server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
