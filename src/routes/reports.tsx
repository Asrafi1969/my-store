import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bnDate,
  methodLabel,
  payMethods,
  taka,
  toBn,
  useHishab,
  withinDays,
} from "@/lib/hishab-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "রিপোর্ট — হিসাবপাতি" },
      { name: "description", content: "সাপ্তাহিক, মাসিক ও বার্ষিক বিক্রয়-ক্রয়-লাভের রিপোর্ট দেখুন।" },
      { property: "og:title", content: "রিপোর্ট — হিসাবপাতি" },
      { property: "og:description", content: "লাভ-ক্ষতি ও লেনদেনের বিস্তারিত রিপোর্ট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const ranges = [
  { key: 7, label: "সাপ্তাহিক" },
  { key: 30, label: "মাসিক" },
  { key: 365, label: "বার্ষিক" },
] as const;

const ALL = "__all__";

function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { txns, parties, products } = useHishab();
  const [days, setDays] = useState<number>(30);
  const [query, setQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState(ALL);
  const [productFilter, setProductFilter] = useState(ALL);
  const [methodFilter, setMethodFilter] = useState(ALL);

  const filterActive =
    query.trim() !== "" || partyFilter !== ALL || productFilter !== ALL || methodFilter !== ALL;

  const q = query.trim().toLowerCase();
  const scoped = txns.filter((t) => {
    if (!withinDays(t.date, days)) return false;
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

  const sum = (kind: string) =>
    scoped.filter((t) => t.kind === kind).reduce((a, t) => a + t.amount, 0);
  const sales = sum("sale");
  const purchase = sum("purchase");
  const expense = sum("expense");
  const wastage = sum("wastage");
  const profit = sales - purchase - expense - wastage;

  const pie = [
    { name: "বিক্রয়", value: sales, color: "var(--color-chart-1)" },
    { name: "ক্রয়", value: purchase, color: "var(--color-chart-4)" },
    { name: "খরচ", value: expense, color: "var(--color-chart-2)" },
    { name: "ওয়েস্টেজ", value: wastage, color: "var(--color-destructive, #ef4444)" },
  ];

  /* পণ্যওয়ারী হিসাব */
  const productRows = products
    .map((p) => {
      const saleTxns = scoped.filter((t) => t.kind === "sale" && t.productId === p.id);
      const purchaseTxns = scoped.filter((t) => t.kind === "purchase" && t.productId === p.id);
      const wastageTxns = scoped.filter((t) => t.kind === "wastage" && t.productId === p.id);
      const saleQty = saleTxns.reduce((a, t) => a + (t.qty ?? 0), 0);
      const saleAmount = saleTxns.reduce((a, t) => a + t.amount, 0);
      const purchaseQty = purchaseTxns.reduce((a, t) => a + (t.qty ?? 0), 0);
      const purchaseAmount = purchaseTxns.reduce((a, t) => a + t.amount, 0);
      const wastageQty = wastageTxns.reduce((a, t) => a + (t.qty ?? 0), 0);
      const wastageAmount = wastageTxns.reduce((a, t) => a + t.amount, 0);
      const cost = saleQty * p.buyPrice;
      return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        saleQty,
        saleAmount,
        purchaseQty,
        purchaseAmount,
        wastageQty,
        wastageAmount,
        profit: saleAmount - cost - wastageAmount,
      };
    })
    .filter((r) => r.saleQty || r.purchaseQty || r.wastageQty)
    .sort((a, b) => b.saleAmount - a.saleAmount);

  const topProducts = productRows.slice(0, 5).map((r) => ({ name: r.name, বিক্রয়: r.saleAmount }));

  const partyRows = parties
    .map((p) => {
      const rows = scoped.filter((t) => t.partyId === p.id);
      return {
        ...p,
        count: rows.length,
        total: rows.reduce((a, t) => a + t.amount, 0),
        unpaid: rows.reduce((a, t) => a + (t.amount - t.paid), 0),
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.total - a.total);

  const history = scoped
    .filter((t) => t.kind === "sale" || t.kind === "purchase" || t.kind === "wastage")
    .slice(0, 80);

  return (
    <AppLayout
      title="রিপোর্ট"
      subtitle="লাভ-ক্ষতি ও লেনদেনের বিশ্লেষণ"
      action={
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {ranges.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={days === r.key ? "default" : "ghost"}
              onClick={() => setDays(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      }
    >
      <div className="card-surface mb-6 p-4">
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
              <SelectValue placeholder="পার্টি" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>সব পার্টি</SelectItem>
              {parties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.type === "customer" ? "ক্রেতা" : "সরবরাহকারী"})
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
          <div className="flex items-center gap-2">
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
            {filterActive && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="ফিল্টার মুছুন"
                onClick={() => {
                  setQuery("");
                  setPartyFilter(ALL);
                  setProductFilter(ALL);
                  setMethodFilter(ALL);
                }}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { l: "বিক্রয়", v: sales, tone: "" },
          { l: "ক্রয়", v: purchase, tone: "" },
          { l: "খরচ", v: expense, tone: "text-warning-foreground" },
          { l: "ওয়েস্টেজ ক্ষতি", v: wastage, tone: "text-destructive" },
          {
            l: "নিট লাভ",
            v: profit,
            tone: profit >= 0 ? "text-primary font-bold" : "text-destructive font-bold",
          },
        ].map((s) => (
          <div key={s.l} className="card-surface p-5">
            <p className="text-sm text-muted-foreground">{s.l}</p>
            <p className={`mt-2 text-2xl font-semibold ${s.tone}`}>{taka(s.v)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="text-base font-semibold">সেরা ৫টি পণ্য</h2>
          <div className="mt-4 h-72 min-h-[280px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => taka(v)}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                  />
                  <Bar dataKey="বিক্রয়" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                লোড হচ্ছে...
              </div>
            )}
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="text-base font-semibold">লেনদেনের বণ্টন</h2>
          <div className="mt-4 h-72 min-h-[280px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    isAnimationActive={false}
                  >
                    {pie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(v: number) => taka(v)}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                লোড হচ্ছে...
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList className="flex w-full justify-start overflow-x-auto h-auto p-1 border border-border/50 bg-muted/40 rounded-xl gap-1">
          <TabsTrigger value="products" className="py-2.5 px-3.5 text-sm">পণ্যওয়ারী</TabsTrigger>
          <TabsTrigger value="parties" className="py-2.5 px-3.5 text-sm">পার্টিওয়ারী</TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 px-3.5 text-sm">লেনদেনের ইতিহাস</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <div className="card-surface overflow-x-auto">
            <table className="data-table w-full min-w-[780px] text-base">
              <thead className="border-b border-border text-left text-sm text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">পণ্য</th>
                  <th className="px-5 py-3 text-right font-medium">বিক্রয় পরিমাণ</th>
                  <th className="px-5 py-3 text-right font-medium">বিক্রয়</th>
                  <th className="px-5 py-3 text-right font-medium">ক্রয় পরিমাণ</th>
                  <th className="px-5 py-3 text-right font-medium">ক্রয়</th>
                  <th className="px-5 py-3 text-right font-medium">ওয়েস্টেজ ক্ষতি</th>
                  <th className="px-5 py-3 text-right font-medium">নিট লাভ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      কোনো তথ্য নেই।
                    </td>
                  </tr>
                )}
                {productRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">{r.name}</td>
                    <td className="px-5 py-3 text-right">
                      {toBn(r.saleQty)} {r.unit}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{taka(r.saleAmount)}</td>
                    <td className="px-5 py-3 text-right">
                      {toBn(r.purchaseQty)} {r.unit}
                    </td>
                    <td className="px-5 py-3 text-right">{taka(r.purchaseAmount)}</td>
                    <td className="px-5 py-3 text-right text-destructive">
                      {r.wastageQty > 0 ? (
                        <span>
                          {toBn(r.wastageQty)} {r.unit} ({taka(r.wastageAmount)})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {taka(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="mt-4">
          <div className="card-surface overflow-x-auto">
            <table className="data-table w-full min-w-[640px] text-base">
              <thead className="border-b border-border text-left text-sm text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">পার্টি</th>
                  <th className="px-5 py-3 font-medium">ধরন</th>
                  <th className="px-5 py-3 text-right font-medium">লেনদেন</th>
                  <th className="px-5 py-3 text-right font-medium">মোট</th>
                  <th className="px-5 py-3 text-right font-medium">বাকি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partyRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      কোনো তথ্য নেই।
                    </td>
                  </tr>
                )}
                {partyRows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">{p.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.type === "customer" ? "ক্রেতা" : "সরবরাহকারী"}
                    </td>
                    <td className="px-5 py-3 text-right">{toBn(p.count)}</td>
                    <td className="px-5 py-3 text-right font-medium">{taka(p.total)}</td>
                    <td className="px-5 py-3 text-right text-destructive">
                      {p.unpaid ? taka(p.unpaid) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="card-surface overflow-x-auto">
            <table className="data-table w-full min-w-[760px] text-base">
              <thead className="border-b border-border text-left text-sm text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">তারিখ</th>
                  <th className="px-5 py-3 font-medium">ধরন</th>
                  <th className="px-5 py-3 font-medium">পার্টি / বিবরণ</th>
                  <th className="px-5 py-3 font-medium">পণ্য</th>
                  <th className="px-5 py-3 font-medium">মাধ্যম</th>
                  <th className="px-5 py-3 text-right font-medium">মোট</th>
                  <th className="px-5 py-3 text-right font-medium">বাকি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      কোনো লেনদেন নেই।
                    </td>
                  </tr>
                )}
                {history.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3 whitespace-nowrap">{bnDate(t.date)}</td>
                    <td className="px-5 py-3">
                      {t.kind === "sale" ? (
                        <span className="text-primary font-medium">বিক্রয়</span>
                      ) : t.kind === "purchase" ? (
                        <span className="text-foreground font-medium">ক্রয়</span>
                      ) : t.kind === "wastage" ? (
                        <span className="text-destructive font-medium">ওয়েস্টেজ</span>
                      ) : (
                        t.kind
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {parties.find((p) => p.id === t.partyId)?.name || t.note || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {products.find((p) => p.id === t.productId)?.name ?? "—"}
                      {t.qty ? ` × ${toBn(t.qty)}` : ""}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {t.kind === "wastage" ? "স্টক সমন্বয়" : methodLabel(t.method)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      <span className={t.kind === "wastage" ? "text-destructive" : ""}>
                        {taka(t.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-destructive">
                      {t.kind === "wastage"
                        ? "—"
                        : t.amount - t.paid
                        ? taka(t.amount - t.paid)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
