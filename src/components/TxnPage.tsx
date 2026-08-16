import { useState } from "react";
import { Plus, Trash2, Search, X, Undo2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ReturnDialog } from "@/components/ReturnDialog";
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
  methodLabel,
  payMethods,
  taka,
  toBn,
  todayISO,
  useHishab,
  type PayMethod,
} from "@/lib/hishab-store";

const emptyForm = {
  partyId: "",
  productId: "",
  qty: "1",
  rate: "",
  discount: "",
  paid: "",
  method: "cash" as PayMethod,
  date: todayISO(),
};

const ALL = "__all__";

export function TxnPage({ kind }: { kind: "sale" | "purchase" }) {
  const { txns, parties, products } = useHishab();
  const [open, setOpen] = useState(false);
  const isSale = kind === "sale";
  const options = parties.filter((p) => (isSale ? p.type === "customer" : p.type === "supplier"));

  const [form, setForm] = useState(emptyForm);

  /* ---------- ফিল্টার ---------- */
  const [query, setQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState(ALL);
  const [productFilter, setProductFilter] = useState(ALL);
  const [methodFilter, setMethodFilter] = useState(ALL);
  const [period, setPeriod] = useState<"all" | "day" | "month" | "year">("all");
  const [day, setDay] = useState(todayISO());
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [year, setYear] = useState(todayISO().slice(0, 4));

  const resetFilters = () => {
    setQuery("");
    setPartyFilter(ALL);
    setProductFilter(ALL);
    setMethodFilter(ALL);
    setPeriod("all");
  };

  const filterActive =
    query.trim() !== "" ||
    partyFilter !== ALL ||
    productFilter !== ALL ||
    methodFilter !== ALL ||
    period !== "all";

  const q = query.trim().toLowerCase();
  const returnKind = isSale ? "sale_return" : "purchase_return";
  const list = txns.filter((t) => {
    if (t.kind !== kind && t.kind !== returnKind) return false;
    if (period === "day" && t.date !== day) return false;
    if (period === "month" && !t.date.startsWith(month)) return false;
    if (period === "year" && !t.date.startsWith(year)) return false;
    if (partyFilter !== ALL && t.partyId !== partyFilter) return false;
    if (productFilter !== ALL && t.productId !== productFilter) return false;
    if (methodFilter !== ALL && (t.method ?? "cash") !== methodFilter) return false;
    if (q) {
      const partyName = parties.find((p) => p.id === t.partyId)?.name ?? "";
      const productName = products.find((p) => p.id === t.productId)?.name ?? "";
      const hay = `${partyName} ${productName} ${methodLabel(t.method)} ${t.note ?? ""} ${t.amount}`;
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const qty = Number(form.qty) || 0;
  const rate = Number(form.rate) || 0;
  const discount = Number(form.discount) || 0;
  const gross = qty * rate;
  const net = Math.max(0, gross - discount);

  const isReturn = (t: { kind: string }) => t.kind === returnKind;
  const total = list.reduce((a, t) => a + (isReturn(t) ? -t.amount : t.amount), 0);
  const dueTotal = list.reduce(
    (a, t) => a + (isReturn(t) ? -(t.amount - t.paid) : t.amount - t.paid),
    0,
  );
  const returnTotal = list.reduce((a, t) => a + (isReturn(t) ? t.amount : 0), 0);

  const submit = () => {
    if (!net) return;
    actions.addTxn({
      kind,
      date: form.date,
      partyId: form.partyId || undefined,
      productId: form.productId || undefined,
      qty,
      amount: net,
      paid: Number(form.paid) || 0,
      discount,
      method: form.method,
    });
    setForm({ ...emptyForm, date: todayISO() });
    setOpen(false);
  };

  const pickProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const price = product ? (isSale ? product.sellPrice : product.buyPrice) : 0;
    setForm((prev) => ({ ...prev, productId, rate: price ? String(price) : prev.rate }));
  };

  return (
    <AppLayout
      title={isSale ? "বিক্রয়" : "ক্রয়"}
      subtitle={`মোট ${toBn(list.length)} টি লেনদেন`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> নতুন {isSale ? "বিক্রয়" : "ক্রয়"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>নতুন {isSale ? "বিক্রয়" : "ক্রয়"} যোগ করুন</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{isSale ? "ক্রেতা" : "সরবরাহকারী"}</Label>
                <Select
                  value={form.partyId}
                  onValueChange={(v) => setForm({ ...form, partyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>পণ্য</Label>
                <Select value={form.productId} onValueChange={pickProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="পণ্য নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => {
                      const priceText = isSale
                        ? p.sellPrice > 0
                          ? taka(p.sellPrice)
                          : "বিক্রয়মূল্য সেট হয়নি"
                        : p.buyPrice > 0
                          ? taka(p.buyPrice)
                          : "নতুন (ক্রয়মূল্য নেই)";
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({priceText}/{p.unit})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>পরিমাণ</Label>
                  <Input
                    inputMode="decimal"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>দর (প্রতি একক)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>ছাড়</Label>
                  <Input
                    inputMode="decimal"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 px-4 py-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {toBn(form.qty || 0)} × {taka(rate)}
                  </span>
                  <span>{taka(gross)}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-1 flex items-center justify-between text-sm text-destructive">
                    <span>ছাড়</span>
                    <span>−{taka(discount)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
                  <span>মোট টাকা</span>
                  <span>{taka(net)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>জমা</Label>
                  <Input
                    inputMode="decimal"
                    placeholder={String(net)}
                    value={form.paid}
                    onChange={(e) => setForm({ ...form, paid: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>লেনদেনের মাধ্যম</Label>
                  <Select
                    value={form.method}
                    onValueChange={(v) => setForm({ ...form, method: v as PayMethod })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {payMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            <DialogFooter>
              <Button onClick={submit}>সংরক্ষণ করুন</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">নিট {isSale ? "বিক্রয়" : "ক্রয়"}</p>
          <p className="mt-2 text-2xl font-semibold">{taka(total)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">বকেয়া</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">{taka(dueTotal)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মাল ফেরত</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{taka(returnTotal)}</p>
        </div>
      </div>

      {/* ফিল্টার */}
      <div className="card-surface mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="নাম, পণ্য বা মাধ্যম খুঁজুন"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={partyFilter} onValueChange={setPartyFilter}>
            <SelectTrigger>
              <SelectValue placeholder={isSale ? "ক্রেতা" : "সরবরাহকারী"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>সব {isSale ? "ক্রেতা" : "সরবরাহকারী"}</SelectItem>
              {options.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger>
              <SelectValue placeholder="পণ্য" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>সব পণ্য</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="মাধ্যম" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>সব মাধ্যম</SelectItem>
              {payMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব সময়</SelectItem>
              <SelectItem value="day">দিন</SelectItem>
              <SelectItem value="month">মাস</SelectItem>
              <SelectItem value="year">বছর</SelectItem>
            </SelectContent>
          </Select>
          {period === "day" && (
            <Input
              type="date"
              className="w-48"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          )}
          {period === "month" && (
            <Input
              type="month"
              className="w-48"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          )}
          {period === "year" && (
            <Input
              inputMode="numeric"
              className="w-32"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          )}
          {filterActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-4" /> ফিল্টার মুছুন
            </Button>
          )}
        </div>
      </div>

      {/* মোবাইল কার্ড ভিউ */}
      <div className="mt-6 space-y-3 md:hidden">
        {list.length === 0 && (
          <div className="card-surface p-6 text-center text-sm text-muted-foreground">
            কোনো লেনদেন পাওয়া যায়নি।
          </div>
        )}
        {list.slice(0, 60).map((t) => {
          const partyName = parties.find((p) => p.id === t.partyId)?.name ?? "—";
          const productName = products.find((p) => p.id === t.productId)?.name ?? "—";
          const due = t.amount - t.paid;
          const isRet = isReturn(t);

          return (
            <div key={t.id} className="card-surface p-4 text-base space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{partyName}</p>
                  <p className="text-xs text-muted-foreground">{bnDate(t.date)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${isRet ? "text-warning" : "text-foreground"}`}>
                    {isRet ? `−${taka(t.amount)}` : taka(t.amount)}
                  </p>
                  {due > 0 && !isRet && (
                    <p className="text-xs font-medium text-destructive">
                      বকেয়া: {taka(due)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{productName}</span>
                  {t.qty ? <span className="text-muted-foreground"> × {toBn(t.qty)}</span> : null}
                  {isRet && (
                    <span className="ml-2 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground font-medium">
                      ফেরত
                    </span>
                  )}
                </div>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground font-medium">
                  {methodLabel(t.method)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                {!isRet && (
                  <ReturnDialog
                    txn={t}
                    of={kind}
                    trigger={
                      <Button variant="outline" size="sm" className="h-9 px-3 text-xs gap-1.5">
                        <Undo2 className="size-3.5 text-warning" /> মাল ফেরত
                      </Button>
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.removeTxn(t.id)}
                  className="h-9 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="size-3.5" /> মুছুন
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ট্যাবলেট ও ডেস্কটপ টেবিল ভিউ */}
      <div className="card-surface mt-6 hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[760px] text-base">
          <thead className="border-b border-border text-left text-sm text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">তারিখ</th>
              <th className="px-5 py-3 font-medium">{isSale ? "ক্রেতা" : "সরবরাহকারী"}</th>
              <th className="px-5 py-3 font-medium">পণ্য</th>
              <th className="px-5 py-3 font-medium">মাধ্যম</th>
              <th className="px-5 py-3 text-right font-medium">ছাড়</th>
              <th className="px-5 py-3 text-right font-medium">মোট</th>
              <th className="px-5 py-3 text-right font-medium">বকেয়া</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  কোনো লেনদেন পাওয়া যায়নি।
                </td>
              </tr>
            )}
            {list.slice(0, 60).map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 whitespace-nowrap">{bnDate(t.date)}</td>
                <td className="px-5 py-3">
                  {parties.find((p) => p.id === t.partyId)?.name ?? "—"}
                </td>
                <td className="px-5 py-3">
                  {products.find((p) => p.id === t.productId)?.name ?? "—"}
                  {t.qty ? ` × ${toBn(t.qty)}` : ""}
                  {isReturn(t) && (
                    <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground">
                      ফেরত
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                  {methodLabel(t.method)}
                </td>
                <td className="px-5 py-3 text-right">{t.discount ? taka(t.discount) : "—"}</td>
                <td
                  className={`px-5 py-3 text-right font-medium ${isReturn(t) ? "text-warning" : ""}`}
                >
                  {isReturn(t) ? `−${taka(t.amount)}` : taka(t.amount)}
                </td>
                <td className="px-5 py-3 text-right text-destructive">
                  {t.amount - t.paid ? taka(t.amount - t.paid) : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {!isReturn(t) && (
                    <ReturnDialog
                      txn={t}
                      of={kind}
                      trigger={
                        <button
                          aria-label="মাল ফেরত"
                          title="মাল ফেরত"
                          className="mr-3 p-2 rounded-lg text-muted-foreground transition-colors hover:text-warning hover:bg-warning/10"
                        >
                          <Undo2 className="size-4" />
                        </button>
                      }
                    />
                  )}
                  <button
                    aria-label="মুছুন"
                    onClick={() => actions.removeTxn(t.id)}
                    className="p-2 rounded-lg text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
