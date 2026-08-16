import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Search,
  AlertOctagon,
  TrendingDown,
  Package,
  Calendar,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actions,
  bnDate,
  taka,
  toBn,
  todayISO,
  useHishab,
  withinDays,
} from "@/lib/hishab-store";

export const Route = createFileRoute("/wastage")({
  head: () => ({
    meta: [
      { title: "ওয়েস্টেজ হিসাব — হিসাবপাতি" },
      {
        name: "description",
        content: "নষ্ট, মেয়াদোত্তীর্ণ, পচা ও ক্ষতিগ্রস্থ পণ্যের স্টক সমন্বয় ও ক্ষতির পূর্ণাঙ্গ হিসাব রাখুন।",
      },
      { property: "og:title", content: "ওয়েস্টেজ হিসাব — হিসাবপাতি" },
      {
        property: "og:description",
        content: "ব্যবসার নষ্ট পণ্যের হিসাব ও আর্থিক ক্ষতির ট্র্যাকিং।",
      },
    ],
  }),
  component: WastagePage,
});

const REASONS = [
  "মেয়াদোত্তীর্ণ (Expired)",
  "নষ্ট / পচে গেছে (Spoiled)",
  "ভেঙে গেছে / ক্ষতিগ্রস্ত (Damaged)",
  "চুরি / ঘাটতি (Lost/Missing)",
  "ব্যবহার অনুপযোগী (Defective)",
  "অন্যান্য (Other)",
];

function WastagePage() {
  const { txns, products } = useHishab();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [rangeDays, setRangeDays] = useState<number>(30);

  const [form, setForm] = useState({
    productId: products[0]?.id || "",
    qty: "1",
    customAmount: "",
    reason: "মেয়াদোত্তীর্ণ (Expired)",
    note: "",
    date: todayISO(),
  });

  const selectedProduct = products.find((p) => p.id === form.productId);
  const autoCalculatedCost = selectedProduct
    ? (Number(form.qty) || 0) * selectedProduct.buyPrice
    : 0;

  // Filter wastage transactions
  const wastageTxns = useMemo(() => {
    return txns.filter((t) => t.kind === "wastage");
  }, [txns]);

  const filteredTxns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wastageTxns.filter((t) => {
      if (rangeDays > 0 && !withinDays(t.date, rangeDays)) return false;
      if (reasonFilter !== "all" && !t.note?.includes(reasonFilter)) return false;
      if (!q) return true;

      const product = products.find((p) => p.id === t.productId);
      const hay = `${product?.name ?? ""} ${t.note ?? ""} ${t.date} ${t.amount}`.toLowerCase();
      return hay.includes(q);
    });
  }, [wastageTxns, rangeDays, reasonFilter, query, products]);

  // Statistics
  const monthTotalLoss = useMemo(() => {
    return wastageTxns
      .filter((t) => withinDays(t.date, 30))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [wastageTxns]);

  const monthTotalQty = useMemo(() => {
    return wastageTxns
      .filter((t) => withinDays(t.date, 30))
      .reduce((sum, t) => sum + (t.qty || 0), 0);
  }, [wastageTxns]);

  // Top wasted product
  const topWastedProduct = useMemo(() => {
    const map = new Map<string, { name: string; loss: number; qty: number; unit: string }>();
    for (const t of wastageTxns) {
      if (!t.productId) continue;
      const p = products.find((prod) => prod.id === t.productId);
      const curr = map.get(t.productId) || {
        name: p?.name || "অজানা পণ্য",
        loss: 0,
        qty: 0,
        unit: p?.unit || "একক",
      };
      curr.loss += t.amount;
      curr.qty += t.qty || 0;
      map.set(t.productId, curr);
    }
    const arr = Array.from(map.values()).sort((a, b) => b.loss - a.loss);
    return arr[0] || null;
  }, [wastageTxns, products]);

  const handleOpenModal = () => {
    if (products.length > 0 && !form.productId) {
      setForm((prev) => ({ ...prev, productId: products[0]!.id }));
    }
    setOpen(true);
  };

  const submit = () => {
    if (!form.productId) return;
    const qty = Number(form.qty) || 0;
    if (qty <= 0) return;

    const customAmt = form.customAmount ? Number(form.customAmount) : undefined;

    actions.addWastage({
      productId: form.productId,
      qty,
      amount: customAmt,
      date: form.date,
      reason: form.reason,
      note: form.note.trim() || undefined,
    });

    setForm({
      productId: products[0]?.id || "",
      qty: "1",
      customAmount: "",
      reason: "মেয়াদোত্তীর্ণ (Expired)",
      note: "",
      date: todayISO(),
    });
    setOpen(false);
  };

  return (
    <AppLayout
      title="ওয়েস্টেজ (নষ্ট পণ্যের হিসাব)"
      subtitle={`গত ৩০ দিনে মোট ক্ষতি: ${taka(monthTotalLoss)} • ${toBn(monthTotalQty)} একক নষ্ট`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenModal} className="gap-1.5">
              <Plus className="size-4" /> নতুন ওয়েস্টেজ এন্ট্রি
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="size-5" />
                নষ্ট / ওয়েস্টেজ পণ্য এন্ট্রি করুন
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-foreground/80 leading-relaxed">
                💡 <strong>স্টক ও আর্থিক সমন্বয়:</strong> ওয়েস্টেজ এন্ট্রি করলে পণ্যের বর্তমান স্টক থেকে এই পরিমাণ স্বয়ংক্রিয়ভাবে কমে যাবে এবং আর্থিক ক্ষতি হিসাবে রিপোর্ট ও লাভ-ক্ষতিতে যুক্ত হবে।
              </div>

              {/* Product Selection */}
              <div className="grid gap-2">
                <Label>পণ্য নির্বাচন করুন</Label>
                <Select
                  value={form.productId}
                  onValueChange={(val) => setForm({ ...form, productId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="পণ্য বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — স্টক: {toBn(p.stock)} {p.unit} (ক্রয়মূল্য: {taka(p.buyPrice)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>
                    নষ্ট পরিমাণ ({selectedProduct?.unit || "একক"})
                  </Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="any"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  />
                  {selectedProduct && Number(form.qty) > selectedProduct.stock && (
                    <span className="text-[11px] text-destructive font-medium">
                      ⚠️ বর্তমান স্টক ({toBn(selectedProduct.stock)} {selectedProduct.unit}) এর চেয়ে বেশি!
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>তারিখ</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="grid gap-2">
                <Label>নষ্ট হওয়ার কারণ</Label>
                <Select
                  value={form.reason}
                  onValueChange={(val) => setForm({ ...form, reason: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="কারণ বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note / Details */}
              <div className="grid gap-2">
                <Label>অতিরিক্ত বিবরণ / মন্তব্য (ঐচ্ছিক)</Label>
                <Input
                  placeholder="যেমন: ইঁদুরে কেটেছে / বৃষ্টির পানিতে ভিজেছে"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              {/* Loss Calculation */}
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>পণ্যের ইউনিট ক্রয়মূল্য:</span>
                  <span className="font-semibold text-foreground">
                    {selectedProduct ? taka(selectedProduct.buyPrice) : "—"} / {selectedProduct?.unit || "একক"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-medium">
                  <span className="text-destructive font-semibold">আনুমানিক মোট ক্ষতি:</span>
                  <span className="text-base font-bold text-destructive">
                    {taka(autoCalculatedCost)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={submit}
                disabled={!form.productId || !Number(form.qty)}
                className="w-full"
              >
                ক্ষতি হিসেবে সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">৩০ দিনে মোট ওয়েস্টেজ ক্ষতি</p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TrendingDown className="size-4.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-destructive">{taka(monthTotalLoss)}</p>
          <p className="mt-1 text-xs text-muted-foreground">ব্যবসার মোট আর্থিক লোকসান</p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">নষ্ট পণ্যের পরিমাণ</p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
              <Package className="size-4.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">{toBn(monthTotalQty)} টি/একক</p>
          <p className="mt-1 text-xs text-muted-foreground">গত ৩০ দিনে বাদ দেওয়া পণ্য</p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">সর্বাধিক ক্ষতিগ্রস্ত পণ্য</p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertOctagon className="size-4.5" />
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold truncate">
            {topWastedProduct ? topWastedProduct.name : "কোনো ওয়েস্টেজ নেই"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {topWastedProduct
              ? `ক্ষতি: ${taka(topWastedProduct.loss)} (${toBn(topWastedProduct.qty)} ${topWastedProduct.unit})`
              : "সব পণ্য সঠিক আছে"}
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">মোট ওয়েস্টেজ রেকর্ড</p>
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <FileSpreadsheet className="size-4.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">{toBn(wastageTxns.length)} টি</p>
          <p className="mt-1 text-xs text-muted-foreground">রেকর্ডকৃত ঘটনা</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="পণ্যের নাম বা কারণ খুঁজুন..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger>
              <SelectValue placeholder="সব কারণ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব কারণ</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r.split(" ")[0]!}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant={rangeDays === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(7)}
              className="flex-1 text-xs"
            >
              ৭ দিন
            </Button>
            <Button
              variant={rangeDays === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(30)}
              className="flex-1 text-xs"
            >
              ৩০ দিন
            </Button>
            <Button
              variant={rangeDays === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(0)}
              className="flex-1 text-xs"
            >
              সব সময়
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="mt-4 space-y-3 sm:hidden">
        {filteredTxns.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            <AlertOctagon className="mx-auto size-8 text-muted-foreground/50 mb-2" />
            কোনো ওয়েস্টেজ তথ্য পাওয়া যায়নি।
          </div>
        ) : (
          filteredTxns.map((t) => {
            const product = products.find((p) => p.id === t.productId);
            return (
              <div key={t.id} className="card-surface p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-base">
                      {product?.name || "মুছে ফেলা পণ্য"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="size-3" /> {bnDate(t.date)}
                    </p>
                  </div>
                  <span className="text-right font-bold text-destructive text-base">
                    −{taka(t.amount)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
                  <span className="rounded-md bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                    নষ্ট: {toBn(t.qty || 0)} {product?.unit || "একক"}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {t.note || "ওয়েস্টেজ"}
                  </span>

                  <button
                    aria-label="রেকর্ড মুছুন"
                    onClick={() => actions.removeTxn(t.id)}
                    title="মুছুন (স্টক স্বয়ংক্রিয়ভাবে ফেরত আসবে)"
                    className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="card-surface mt-4 hidden overflow-x-auto sm:block">
        <table className="data-table w-full min-w-[700px] text-base">
          <thead className="border-b border-border text-left text-sm text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5 font-medium">তারিখ</th>
              <th className="px-5 py-3.5 font-medium">পণ্য</th>
              <th className="px-5 py-3.5 text-right font-medium">নষ্ট পরিমাণ</th>
              <th className="px-5 py-3.5 text-right font-medium">ক্রয়মূল্য</th>
              <th className="px-5 py-3.5 text-right font-medium">মোট আর্থিক ক্ষতি</th>
              <th className="px-5 py-3.5 font-medium">কারণ ও মন্তব্য</th>
              <th className="px-5 py-3.5 text-center font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTxns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  <AlertOctagon className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                  কোনো ওয়েস্টেজ তথ্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              filteredTxns.map((t) => {
                const product = products.find((p) => p.id === t.productId);
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm">{bnDate(t.date)}</td>
                    <td className="px-5 py-3.5 font-medium">
                      {product?.name || <span className="text-muted-foreground">মুছে ফেলা পণ্য</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-semibold text-destructive text-sm">
                        {toBn(t.qty || 0)} {product?.unit || "একক"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-muted-foreground">
                      {product ? taka(product.buyPrice) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-destructive">
                      −{taka(t.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-xs truncate">
                      {t.note || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        aria-label="রেকর্ড মুছুন"
                        onClick={() => actions.removeTxn(t.id)}
                        title="মুছুন (স্টক স্বয়ংক্রিয়ভাবে ফেরত আসবে)"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        মোট {toBn(filteredTxns.length)} টি ওয়েস্টেজ রেকর্ড প্রদর্শিত হচ্ছে
      </p>
    </AppLayout>
  );
}
