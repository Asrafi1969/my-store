import { useEffect, useState, useSyncExternalStore } from "react";
import { loadFromIndexedDB, saveToIndexedDB } from "./idb-storage";

export type Party = {
  id: string;
  name: string;
  phone: string;
  type: "customer" | "supplier";
  due: number; // ধনাত্মক = পাবো, ঋণাত্মক = দেবো
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
};

export type PayMethod = "cash" | "bkash" | "nagad" | "rocket" | "bank" | "due";

export const payMethods: { value: PayMethod; label: string }[] = [
  { value: "cash", label: "নগদ" },
  { value: "bkash", label: "বিকাশ" },
  { value: "nagad", label: "নগদ (অ্যাপ)" },
  { value: "rocket", label: "রকেট" },
  { value: "bank", label: "ব্যাংক" },
  { value: "due", label: "বাকি" },
];

export function methodLabel(m?: PayMethod) {
  return payMethods.find((x) => x.value === m)?.label ?? "নগদ";
}

export type TxnKind =
  | "sale"
  | "purchase"
  | "expense"
  | "payment"
  | "capital"
  | "drawings"
  | "sale_return"
  | "purchase_return"
  | "wastage";

export type Txn = {
  id: string;
  kind: TxnKind;
  date: string; // yyyy-mm-dd
  partyId?: string | undefined;
  productId?: string | undefined;
  qty?: number | undefined;
  amount: number;
  paid: number;
  discount?: number | undefined;
  method?: PayMethod | undefined;
  note?: string | undefined;
  refId?: string | undefined;
};


export type HishabState = {
  shopName: string;
  parties: Party[];
  products: Product[];
  txns: Txn[];
};

const STORAGE_KEY = "hishabpati-state-v1";

const bnDays = 60;
function d(offset: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - offset);
  return dt.toISOString().slice(0, 10);
}

export const initialState: HishabState = {
  shopName: "রহমান স্টোর",
  parties: [
    { id: "p1", name: "করিম ট্রেডার্স", phone: "01711-223344", type: "customer", due: 4500 },
    { id: "p2", name: "সালমা এন্টারপ্রাইজ", phone: "01812-556677", type: "customer", due: 1200 },
    { id: "p3", name: "নিউ ঢাকা সাপ্লাই", phone: "01911-889900", type: "supplier", due: -8000 },
    { id: "p4", name: "হাসান ব্রাদার্স", phone: "01611-334455", type: "supplier", due: -2500 },
    { id: "p5", name: "মিতা জেনারেল স্টোর", phone: "01521-667788", type: "customer", due: 0 },
  ],
  products: [
    { id: "i1", name: "চাল (মিনিকেট)", unit: "কেজি", stock: 320, buyPrice: 68, sellPrice: 76 },
    { id: "i2", name: "সয়াবিন তেল", unit: "লিটার", stock: 85, buyPrice: 155, sellPrice: 172 },
    { id: "i3", name: "মসুর ডাল", unit: "কেজি", stock: 140, buyPrice: 105, sellPrice: 120 },
    { id: "i4", name: "চিনি", unit: "কেজি", stock: 42, buyPrice: 118, sellPrice: 130 },
    { id: "i5", name: "আটা (২ কেজি প্যাক)", unit: "প্যাকেট", stock: 9, buyPrice: 95, sellPrice: 110 },
    { id: "i6", name: "গুঁড়া দুধ", unit: "প্যাকেট", stock: 26, buyPrice: 640, sellPrice: 720 },
  ],
  txns: buildDemoTxns(),
};

function buildDemoTxns(): Txn[] {
  const list: Txn[] = [];
  const products = ["i1", "i2", "i3", "i4", "i5", "i6"];
  const customers = ["p1", "p2", "p5"];
  const suppliers = ["p3", "p4"];
  let seed = 7;
  const rand = (n: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.floor((seed / 233280) * n);
  };
  for (let i = bnDays; i >= 0; i--) {
    const sales = 1 + rand(3);
    for (let s = 0; s < sales; s++) {
      const amount = 500 + rand(40) * 125;
      list.push({
        id: `s${i}-${s}`,
        kind: "sale",
        date: d(i),
        partyId: customers[rand(customers.length)]!,
        productId: products[rand(products.length)]!,
        qty: 1 + rand(12),
        amount,
        paid: rand(4) === 0 ? Math.round(amount * 0.6) : amount,
      });
    }
    if (rand(3) === 0) {
      const amount = 2000 + rand(30) * 300;
      list.push({
        id: `pu${i}`,
        kind: "purchase",
        date: d(i),
        partyId: suppliers[rand(suppliers.length)]!,
        productId: products[rand(products.length)]!,
        qty: 10 + rand(40),
        amount,
        paid: rand(2) === 0 ? amount : Math.round(amount * 0.5),
      });
    }
    if (rand(2) === 0) {
      const notes = ["দোকান ভাড়া", "বিদ্যুৎ বিল", "পরিবহন খরচ", "কর্মচারী বেতন", "চা-নাস্তা"];
      const amount = 150 + rand(20) * 90;
      list.push({
        id: `e${i}`,
        kind: "expense",
        date: d(i),
        amount,
        paid: amount,
        note: notes[rand(notes.length)]!,
      });
    }
  }
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

let lastSavedTime: string = typeof window !== "undefined" ? formatTime(new Date()) : "";

function formatTime(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function getLastSavedTime() {
  return lastSavedTime;
}

function loadInitialState(): HishabState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          shopName: typeof parsed.shopName === "string" ? parsed.shopName : initialState.shopName,
          parties: Array.isArray(parsed.parties) ? parsed.parties : initialState.parties,
          products: Array.isArray(parsed.products) ? parsed.products : initialState.products,
          txns: Array.isArray(parsed.txns) ? parsed.txns : initialState.txns,
        };
      }
    } else {
      // First visit: immediately seed localStorage & IndexedDB
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
        saveToIndexedDB(STORAGE_KEY, initialState).catch(() => {});
      } catch {}
    }
  } catch {
    /* ignore */
  }
  return initialState;
}

let state: HishabState = loadInitialState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function forceSaveNow() {
  persist();
  emit();
}

function persist() {
  lastSavedTime = formatTime(new Date());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("LocalStorage save warning:", err);
  }
  // Also asynchronously persist into IndexedDB for persistent reliability
  saveToIndexedDB(STORAGE_KEY, state).catch(() => {});
}

// Background sync from IndexedDB on startup
if (typeof window !== "undefined") {
  loadFromIndexedDB<HishabState>(STORAGE_KEY).then((idbState) => {
    if (idbState && typeof idbState === "object") {
      let shouldUpdate = false;
      try {
        const currentRaw = localStorage.getItem(STORAGE_KEY);
        if (!currentRaw) {
          shouldUpdate = true;
        }
      } catch {
        shouldUpdate = true;
      }

      if (shouldUpdate && idbState.parties && idbState.products && idbState.txns) {
        state = {
          shopName: typeof idbState.shopName === "string" ? idbState.shopName : initialState.shopName,
          parties: Array.isArray(idbState.parties) ? idbState.parties : initialState.parties,
          products: Array.isArray(idbState.products) ? idbState.products : initialState.products,
          txns: Array.isArray(idbState.txns) ? idbState.txns : initialState.txns,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {}
        emit();
      }
    }
  });

  // Cross-tab synchronization
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === "object") {
          state = {
            shopName: parsed.shopName || state.shopName,
            parties: Array.isArray(parsed.parties) ? parsed.parties : state.parties,
            products: Array.isArray(parsed.products) ? parsed.products : state.products,
            txns: Array.isArray(parsed.txns) ? parsed.txns : state.txns,
          };
          emit();
        }
      } catch {}
    }
  });
}

export function hydrateStore() {
  // Handled synchronously at module load
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const subscribeStore = subscribe;

const getSnapshot = () => state;
export const getStoreSnapshot = getSnapshot;

export function setStoreState(newState: HishabState) {
  state = newState;
  persist();
  emit();
}

export function useHishab() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}

function update(fn: (s: HishabState) => HishabState) {
  state = fn(state);
  persist();
  emit();
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addProduct(p: Omit<Product, "id">) {
    update((s) => ({ ...s, products: [{ ...p, id: uid() }, ...s.products] }));
  },
  updateProduct(id: string, updated: Partial<Omit<Product, "id">>) {
    update((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }));
  },
  removeProduct(id: string) {
    update((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  },
  addParty(p: Omit<Party, "id">) {
    update((s) => ({ ...s, parties: [{ ...p, id: uid() }, ...s.parties] }));
  },
  removeParty(id: string) {
    update((s) => ({ ...s, parties: s.parties.filter((p) => p.id !== id) }));
  },
  addTxn(t: Omit<Txn, "id">) {
    update((s) => {
      const txns = [{ ...t, id: uid() }, ...s.txns];
      const products = s.products.map((p) => {
        if (p.id !== t.productId || !t.qty) return p;
        const delta =
          t.kind === "sale" || t.kind === "wastage"
            ? -t.qty
            : t.kind === "purchase"
            ? t.qty
            : 0;
        let newBuyPrice = p.buyPrice;
        if (t.kind === "purchase" && t.qty > 0) {
          const unitCost = Math.round((t.amount / t.qty) * 100) / 100;
          if (unitCost > 0) {
            newBuyPrice = unitCost;
          }
        }
        return { ...p, stock: Math.max(0, p.stock + delta), buyPrice: newBuyPrice };
      });
      const dueDelta = t.amount - t.paid;
      const parties = s.parties.map((p) => {
        if (p.id !== t.partyId || dueDelta === 0) return p;
        return { ...p, due: p.due + (t.kind === "sale" ? dueDelta : -dueDelta) };
      });
      return { ...s, txns, products, parties };
    });
  },
  /** ওয়েস্টেজ/নষ্ট পণ্যের হিসাব: স্টক কমায় ও আর্থিক ক্ষতির হিসাব রাখে */
  addWastage(w: {
    productId: string;
    qty: number;
    amount?: number;
    date: string;
    reason: string;
    note?: string;
  }) {
    update((s) => {
      const product = s.products.find((p) => p.id === w.productId);
      const lossAmount =
        w.amount !== undefined && !isNaN(w.amount)
          ? w.amount
          : product
          ? Math.round(product.buyPrice * w.qty * 100) / 100
          : 0;

      const fullNote = w.note ? `${w.reason} — ${w.note}` : w.reason;

      const txn: Txn = {
        id: uid(),
        kind: "wastage",
        date: w.date,
        productId: w.productId,
        qty: w.qty,
        amount: lossAmount,
        paid: 0,
        note: fullNote,
      };

      const products = s.products.map((p) => {
        if (p.id !== w.productId) return p;
        return { ...p, stock: Math.max(0, p.stock - w.qty) };
      });

      return { ...s, txns: [txn, ...s.txns], products };
    });
  },
  /** মাল ফেরত: বিক্রয় ফেরত হলে স্টক বাড়ে ও ক্যাশ কমে, ক্রয় ফেরত হলে স্টক কমে ও ক্যাশ বাড়ে */
  addReturn(r: {
    of: "sale" | "purchase";
    date: string;
    partyId?: string | undefined;
    productId?: string | undefined;
    qty: number;
    amount: number;
    /** true হলে টাকা হাতবদল হবে না, বকেয়া থেকে সমন্বয় হবে */
    adjustDue: boolean;
    method: PayMethod;
    note?: string | undefined;
    refId?: string | undefined;
  }) {
    update((s) => {
      const isSale = r.of === "sale";
      const paid = r.adjustDue ? 0 : r.amount;
      const txn: Txn = {
        id: uid(),
        kind: isSale ? "sale_return" : "purchase_return",
        date: r.date,
        partyId: r.partyId,
        productId: r.productId,
        qty: r.qty,
        amount: r.amount,
        paid,
        method: r.adjustDue ? "due" : r.method,
        note: r.note ?? (isSale ? "বিক্রিত মাল ফেরত" : "ক্রয়কৃত মাল ফেরত"),
        refId: r.refId,
      };
      const products = s.products.map((p) => {
        if (p.id !== r.productId || !r.qty) return p;
        return { ...p, stock: p.stock + (isSale ? r.qty : -r.qty) };
      });
      const dueDelta = r.amount - paid; // বকেয়া সমন্বয়ের অংশ
      const parties = s.parties.map((p) => {
        if (p.id !== r.partyId || dueDelta === 0) return p;
        // বিক্রয় ফেরত → ক্রেতার পাওনা কমবে; ক্রয় ফেরত → সরবরাহকারীর দেনা কমবে
        return { ...p, due: p.due + (isSale ? -dueDelta : dueDelta) };
      });
      return { ...s, txns: [txn, ...s.txns], products, parties };
    });
  },
  addPayment(p: {
    partyId: string;
    amount: number;
    discount?: number;
    method: PayMethod;
    date: string;
    note?: string;
  }) {
    update((s) => {
      const party = s.parties.find((x) => x.id === p.partyId);
      if (!party) return s;
      const settled = p.amount + (p.discount ?? 0);
      const sign = party.type === "customer" ? -1 : 1;
      const txn: Txn = {
        id: uid(),
        kind: "payment",
        date: p.date,
        partyId: p.partyId,
        amount: p.amount,
        paid: p.amount,
        discount: p.discount ?? 0,
        method: p.method,
        note: p.note ?? (party.type === "customer" ? "বকেয়া আদায়" : "বকেয়া পরিশোধ"),
      };
      return {
        ...s,
        txns: [txn, ...s.txns],
        parties: s.parties.map((x) =>
          x.id === p.partyId ? { ...x, due: x.due + sign * settled } : x,
        ),
      };
    });
  },
  addCapital(p: { amount: number; method: PayMethod; date: string; note?: string }) {
    update((s) => ({
      ...s,
      txns: [
        {
          id: uid(),
          kind: "capital" as const,
          date: p.date,
          amount: p.amount,
          paid: p.amount,
          method: p.method,
          note: p.note ?? "নগদ মূলধন যোগ",
        },
        ...s.txns,
      ],
    }));
  },
  addDrawings(p: { amount: number; method: PayMethod; date: string; note?: string }) {
    update((s) => ({
      ...s,
      txns: [
        {
          id: uid(),
          kind: "drawings" as const,
          date: p.date,
          amount: p.amount,
          paid: p.amount,
          method: p.method,
          note: p.note ?? "মালিকের উত্তোলন",
        },
        ...s.txns,
      ],
    }));
  },
  removeTxn(id: string) {
    update((s) => {
      const target = s.txns.find((t) => t.id === id);
      if (!target) return s;

      let products = s.products;
      let parties = s.parties;

      if (target.productId && target.qty) {
        const qty = target.qty;
        products = products.map((p) => {
          if (p.id !== target.productId) return p;
          let delta = 0;
          if (target.kind === "sale") delta = qty;
          else if (target.kind === "purchase") delta = -qty;
          else if (target.kind === "sale_return") delta = -qty;
          else if (target.kind === "purchase_return") delta = qty;
          else if (target.kind === "wastage") delta = qty;
          return { ...p, stock: Math.max(0, p.stock + delta) };
        });
      }

      if (target.partyId) {
        parties = parties.map((p) => {
          if (p.id !== target.partyId) return p;
          let dueDelta = 0;
          if (target.kind === "sale") {
            const unpaid = target.amount - target.paid;
            dueDelta = -unpaid;
          } else if (target.kind === "purchase") {
            const unpaid = target.amount - target.paid;
            dueDelta = unpaid;
          } else if (target.kind === "payment") {
            const settled = target.amount + (target.discount ?? 0);
            const sign = p.type === "customer" ? -1 : 1;
            dueDelta = -sign * settled;
          } else if (target.kind === "sale_return") {
            const unpaid = target.amount - target.paid;
            dueDelta = unpaid;
          } else if (target.kind === "purchase_return") {
            const unpaid = target.amount - target.paid;
            dueDelta = -unpaid;
          }
          return { ...p, due: p.due + dueDelta };
        });
      }

      return {
        ...s,
        txns: s.txns.filter((t) => t.id !== id),
        products,
        parties,
      };
    });
  },

  clearCapitalTxns() {
    update((s) => ({
      ...s,
      txns: s.txns.filter((t) => t.kind !== "capital" && t.kind !== "drawings"),
    }));
  },

  reset() {
    update(() => initialState);
  },
};

/* ---------- helpers ---------- */

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBn(value: number | string) {
  return String(value).replace(/\d/g, (x) => bnDigits[Number(x)]!);
}

export function taka(n: number) {
  const rounded = Math.round(n);
  const formatted = Math.abs(rounded).toLocaleString("en-US");
  return `${rounded < 0 ? "-" : ""}৳${toBn(formatted)}`;
}

export function bnDate(iso: string) {
  const months = [
    "জানু",
    "ফেব",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্ট",
    "অক্টো",
    "নভে",
    "ডিসে",
  ];
  const dt = new Date(iso + "T00:00:00");
  return `${toBn(dt.getDate())} ${months[dt.getMonth()]!}, ${toBn(dt.getFullYear())}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function withinDays(iso: string, days: number) {
  const dt = new Date(iso + "T00:00:00").getTime();
  return Date.now() - dt <= days * 86400000;
}

/* ---------- নগদ হিসাব ---------- */

export function cashInHand(s: HishabState) {
  return s.txns.reduce((total, t) => {
    if (t.kind === "capital") return total + t.amount;
    if (t.kind === "drawings") return total - t.amount;
    if (t.kind === "sale") return total + t.paid;
    if (t.kind === "purchase") return total - t.paid;
    if (t.kind === "expense") return total - t.amount;
    if (t.kind === "sale_return") return total - t.paid;
    if (t.kind === "purchase_return") return total + t.paid;
    if (t.kind === "payment") {
      const party = s.parties.find((p) => p.id === t.partyId);
      return party?.type === "supplier" ? total - t.amount : total + t.amount;
    }
    return total;
  }, 0);
}
