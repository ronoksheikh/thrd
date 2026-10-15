// Single source of truth for the product, prices and options.
// Used by BOTH the storefront and the Worker (server recalculates every price,
// so the browser can never change what a customer pays).

export const BRAND = 'THREAD HOUSE';

export const PRODUCT = {
  id: 'sweatshirt',
  name: 'প্রিমিয়াম সোয়েটশার্ট',
  tagline: 'নরম, আরামদায়ক ও স্টাইলিশ — প্রতিদিনের জন্য পারফেক্ট',
};

export type Color = { id: string; name: string; hex: string; border?: boolean };

// Edit freely. `id` is saved in orders, `name` is what customers see.
export const COLORS: Color[] = [
  { id: 'black', name: 'কালো', hex: '#1c1c1c' },
  { id: 'white', name: 'সাদা', hex: '#fafafa', border: true },
  { id: 'orange', name: 'কমলা', hex: '#f57c00' },
  { id: 'cream', name: 'অফ-হোয়াইট', hex: '#efe7da', border: true },
];

export const SIZES = ['M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

// Product photos, shown in this order. Replace the placeholder SVGs in
// /public/products with real photos (webp recommended, ~1000px wide, square).
// `color` links a photo to a colour: picking that colour scrolls the gallery to it.
export const IMAGES: { src: string; alt: string; color?: string }[] = [
  { src: '/products/black.svg', alt: 'কালো সোয়েটশার্ট', color: 'black' },
  { src: '/products/white.svg', alt: 'সাদা সোয়েটশার্ট', color: 'white' },
  { src: '/products/orange.svg', alt: 'কমলা সোয়েটশার্ট', color: 'orange' },
  { src: '/products/cream.svg', alt: 'অফ-হোয়াইট সোয়েটশার্ট', color: 'cream' },
];

export type Combo = { qty: 1 | 2 | 3; price: number; freeDelivery: boolean; label: string; badge?: string };

export const COMBOS: Combo[] = [
  { qty: 3, price: 1700, freeDelivery: true, label: '৩টি সোয়েটশার্ট', badge: 'সবচেয়ে জনপ্রিয়' },
  { qty: 2, price: 1300, freeDelivery: true, label: '২টি সোয়েটশার্ট' },
  { qty: 1, price: 700, freeDelivery: false, label: '১টি সোয়েটশার্ট' },
];

export const SINGLE_PRICE = 700;
/** Delivery charge when the combo has no free delivery (1 piece). */
export const DELIVERY_CHARGE = 100;
export const CURRENCY = 'BDT';

export type OrderItem = { color: string; size: Size };

export function getCombo(qty: number): Combo | undefined {
  return COMBOS.find((c) => c.qty === qty);
}

export function priceFor(qty: number) {
  const combo = getCombo(qty);
  if (!combo) return null;
  const delivery = combo.freeDelivery ? 0 : DELIVERY_CHARGE;
  return { subtotal: combo.price, delivery, total: combo.price + delivery, saved: SINGLE_PRICE * qty - combo.price };
}

export const colorById = (id: string) => COLORS.find((c) => c.id === id);

// ---- Validation shared by browser + server ----

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Converts Bangla digits to English and strips spaces/dashes. */
export function normalizePhone(input: string): string {
  let s = '';
  for (const ch of input) {
    const i = BN_DIGITS.indexOf(ch);
    s += i >= 0 ? String(i) : ch;
  }
  s = s.replace(/[^\d+]/g, '');
  if (s.startsWith('+880')) s = s.slice(3);
  else if (s.startsWith('880')) s = s.slice(2);
  return s;
}

/** Bangladeshi mobile: 01[3-9]XXXXXXXX (11 digits). */
export function isValidPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(phone));
}

export function validateOrder(input: { name?: unknown; phone?: unknown; address?: unknown; qty?: unknown; items?: unknown }) {
  const errors: Record<string, string> = {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? normalizePhone(input.phone) : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const qty = Number(input.qty);
  const items = Array.isArray(input.items) ? (input.items as OrderItem[]) : [];

  if (name.length < 2 || name.length > 80) errors.name = 'আপনার নাম লিখুন';
  if (!isValidPhone(phone)) errors.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন';
  if (address.length < 8 || address.length > 400) errors.address = 'সম্পূর্ণ ঠিকানা লিখুন (এলাকা, থানা, জেলা)';
  if (!getCombo(qty)) errors.qty = 'প্যাকেজ বেছে নিন';
  else if (items.length !== qty) errors.items = 'প্রতিটির রং ও সাইজ বেছে নিন';
  else
    items.forEach((it, i) => {
      if (!it || !colorById(it.color)) errors[`color${i}`] = 'রং বেছে নিন';
      if (!it || !SIZES.includes(it.size)) errors[`size${i}`] = 'সাইজ বেছে নিন';
    });

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { name, phone, address, qty, items: items.map((it) => ({ color: it?.color, size: it?.size })) },
  };
}
