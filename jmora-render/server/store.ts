import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARTICLES,
  DEFAULT_SITE_CONFIG,
  EXERCISES,
  FAQS,
  MUSCLES,
  PRODUCTS,
  SPONSORS,
  TRANSFORMATIONS,
} from '../src/data/catalog.ts';
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
} from '../src/types/jmora.ts';
import { calculateTomanPrice } from '../src/utils/pricing.ts';

export interface StoredUserRecord {
  id: string;
  method: 'phone' | 'email';
  identifier: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  coachAccessUnlocked: boolean;
  coachTier?: CoachTier;
  createdAt: string;
}

export interface StoreSchema {
  schemaVersion: number;
  siteConfig: SiteConfig;
  products: Product[];
  sponsors: SponsorAd[];
  articles: Article[];
  transformations: Transformation[];
  progressPhotos: ProgressPhotoSubmission[];
  orders: OrderRecord[];
  tickets: SupportTicket[];
  infoSubmissions: ClientInfoSubmission[];
  coachAccessRequests: CoachAccessRequest[];
  coachMessages: Record<string, CoachMessage[]>;
  users: Record<string, StoredUserRecord>;
  securityEvents: SecurityEvent[];
  userStates: Record<string, UserState>;
}

const CURRENT_SCHEMA_VERSION = 3;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const PERMANENT_ADMIN_PHONE = '09155783522';
const PERMANENT_ADMIN_EMAIL = 'avinadehnavi@gmail.com';
const PERMANENT_ADMIN_PASS = 'avina3522';

function computeUserId(identifier: string): string {
  return `usr_${crypto.createHash('sha1').update(identifier).digest('hex').slice(0, 10)}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function ensurePermanentAdmins(store: StoreSchema): boolean {
  let mutated = false;
  const seeds: { method: 'phone' | 'email'; identifier: string; name: string }[] = [
    { method: 'phone', identifier: PERMANENT_ADMIN_PHONE, name: 'مدیریت JMORA' },
    { method: 'email', identifier: PERMANENT_ADMIN_EMAIL, name: 'مدیریت JMORA' },
  ];

  for (const seed of seeds) {
    const id = computeUserId(seed.identifier);
    if (!store.users[id]) {
      store.users[id] = {
        id,
        method: seed.method,
        identifier: seed.identifier,
        name: seed.name,
        passwordHash: hashPassword(PERMANENT_ADMIN_PASS),
        isAdmin: true,
        coachAccessUnlocked: true,
        coachTier: 'private',
        createdAt: new Date().toISOString(),
      };
      mutated = true;
    } else if (!store.users[id].isAdmin || !store.users[id].coachAccessUnlocked) {
      store.users[id].isAdmin = true;
      store.users[id].coachAccessUnlocked = true;
      store.users[id].coachTier = 'private';
      mutated = true;
    }
  }
  return mutated;
}

function createInitialStore(): StoreSchema {
  const store: StoreSchema = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    products: PRODUCTS.map((p) => ({ ...p })),
    sponsors: SPONSORS.map((s) => ({ ...s })),
    articles: ARTICLES.map((a) => ({ ...a })),
    transformations: TRANSFORMATIONS.map((t) => ({ ...t })),
    progressPhotos: [],
    orders: [],
    tickets: [],
    infoSubmissions: [],
    coachAccessRequests: [],
    coachMessages: {},
    users: {},
    securityEvents: [],
    userStates: {},
  };
  ensurePermanentAdmins(store);
  return store;
}

let cachedStore: StoreSchema | null = null;

export function recalculateProductPrices(products: Product[], siteConfig: SiteConfig): Product[] {
  return products.map((p) => ({
    ...p,
    priceToman: p.manualToman
      ? p.priceToman
      : calculateTomanPrice(p.priceUsd, siteConfig.usdRate, siteConfig.marginToman),
  }));
}

export function readStore(): StoreSchema {
  if (cachedStore) return cachedStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreSchema>;
      if ((parsed.schemaVersion || 1) >= 2) {
        const siteConfig: SiteConfig = {
          ...DEFAULT_SITE_CONFIG,
          ...(parsed.siteConfig || {}),
        };
        const products = recalculateProductPrices(parsed.products ?? PRODUCTS, siteConfig);
        cachedStore = {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          siteConfig,
          products,
          sponsors: parsed.sponsors ?? SPONSORS,
          articles: parsed.articles ?? ARTICLES,
          transformations: (parsed.transformations ?? TRANSFORMATIONS).map((tr) => ({
            ...tr,
            beforeImage: tr.beforeImage || tr.image || '/src/assets/images/article_strength_studio_1795014056746.jpg',
            afterImage: tr.afterImage || tr.image || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg',
          })),
          progressPhotos: parsed.progressPhotos ?? [],
          orders: parsed.orders ?? [],
          tickets: parsed.tickets ?? [],
          infoSubmissions: parsed.infoSubmissions ?? [],
          coachAccessRequests: (parsed.coachAccessRequests ?? []).map((r) => ({
            ...r,
            planTier: r.planTier || 'assistant',
          })),
          coachMessages: parsed.coachMessages ?? {},
          users: parsed.users ?? {},
          securityEvents: parsed.securityEvents ?? [],
          userStates: parsed.userStates ?? {},
        };
        const mutated = ensurePermanentAdmins(cachedStore);
        if (mutated || (parsed.schemaVersion || 1) < CURRENT_SCHEMA_VERSION) {
          writeStore(cachedStore);
        }
        return cachedStore;
      }
    }
  } catch (err) {
    console.error('Failed to read store.json, seeding clean v3 store:', err);
  }

  cachedStore = createInitialStore();
  writeStore(cachedStore);
  return cachedStore;
}

export function writeStore(next: StoreSchema): void {
  cachedStore = next;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store.json:', err);
  }
}

export function getPublicCatalog() {
  const store = readStore();
  return {
    siteConfig: store.siteConfig,
    muscles: MUSCLES,
    exercises: EXERCISES,
    faqs: FAQS,
    products: store.products,
    sponsors: store.sponsors.filter((s) => s.active),
    allSponsorsCount: store.sponsors.length,
    articles: store.articles,
    transformations: store.transformations,
  };
}
