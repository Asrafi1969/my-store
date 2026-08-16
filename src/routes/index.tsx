import { useState, useEffect, type ElementType } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Users, AlertTriangle, Banknote, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CapitalDialog } from "@/components/CapitalDialog";
import { Button } from "@/components/ui/button";
import { bnDate, cashInHand, taka, toBn, useHishab, withinDays } from "@/lib/hishab-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — হিসাবপাতি | ব্যবসার হিসাব অ্যাপ" },
      {
        name: "description",
        content: "বিক্রয়, ক্রয়, খরচ, বকেয়া ও স্টক — এক নজরে আপনার ব্যবসার সম্পূর্ণ হিসাব।",
      },
      { property: "og:title", content: "ড্যাশবোর্ড — হিসাবপাতি" },
      {
        property: "og:description",
        content: "বিক্রয়, ক্রয়, খরচ ও বকেয়ার হিসাব এক নজরে দেখুন।",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ElementType;
  tone: "primary" | "warning" | "destructive" | "muted";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-secondary text-secondary-foreground",
  }[tone];
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const state = useHishab();
  const { txns, parties, products } = state;
  const cash = cashInHand(state);

  const month = txns.filter((t) => withinDays(t.date, 30));
  const sum = (kind: string) =>
    month.filter((t) => t.kind === kind).reduce((a, t) => a + t.amount, 0);
  
  // const sales = sum("sale");
  // const salesReturn = sum("sale_return");
  // const purchase = sum("purchase");
  // const purchaseReturn = sum("purchase_return");
  // const expense = sum("expense");
  const sales = sum("sale");
  const salesReturn = sum("sale_return");
  const purchase = sum("purchase");
  const expense = sum("expense");
  const wastage = sum("wastage");

  // বিক্রিত পণ্যের আনুমানিক ক্রয়মূল্য
  const costOfGoodsSold = month.reduce((total, t) => {
    if (t.kind !== "sale" || !t.productId || !t.qty) return total;

    const product = products.find((p) => p.id === t.productId);
    if (!product) return total;

    return total + product.buyPrice * t.qty;
  }, 0);

  // বিক্রিত পণ্যের ফেরতকৃত অংশের ক্রয়মূল্য
  const costOfSalesReturned = month.reduce((total, t) => {
    if (t.kind !== "sale_return" || !t.productId || !t.qty) return total;

    const product = products.find((p) => p.id === t.productId);
    if (!product) return total;

    return total + product.buyPrice * t.qty;
  }, 0);

  // নিট বিক্রয়
  const netSales = sales - salesReturn;

  // বিক্রিত পণ্যের নিট ক্রয়মূল্য
  const netCostOfGoodsSold = costOfGoodsSold - costOfSalesReturned;

  // আনুমানিক লাভ (নিট বিক্রয় - বিক্রিত পণ্যের ক্রয়মূল্য - খরচ - ওয়েস্টেজ ক্ষতি)
  const profit = netSales - netCostOfGoodsSold - expense - wastage;

  const receivable = parties.filter((p) => p.due > 0).reduce((a, p) => a + p.due, 0);
  const payable = parties.filter((p) => p.due < 0).reduce((a, p) => a - p.due, 0);
  const lowStock = products.filter((p) => p.stock <= 15);

  const chart = Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - i));
    const iso = day.toISOString().slice(0, 10);
    const dayTxns = txns.filter((t) => t.date === iso);
    return {
      name: toBn(day.getDate()),
      বিক্রয়: dayTxns.filter((t) => t.kind === "sale").reduce((a, t) => a + t.amount, 0),
      খরচ: dayTxns
        .filter((t) => t.kind === "expense" || t.kind === "purchase" || t.kind === "wastage")
        .reduce((a, t) => a + t.amount, 0),
    };
  });

  const recent = txns.slice(0, 8);
  const kindLabel = {
    sale: "বিক্রয়",
    purchase: "ক্রয়",
    expense: "খরচ",
    payment: "বকেয়া পরিশোধ",
    capital: "নগদ মূলধন",
    drawings: "মালিকের উত্তোলন",
    sale_return: "বিক্রয় ফেরত",
    purchase_return: "ক্রয় ফেরত",
    wastage: "ওয়েস্টেজ",
  } as const;

  return (
    <AppLayout
      title="ড্যাশবোর্ড"
      subtitle="গত ৩০ দিনের সারসংক্ষেপ"
      action={
        <CapitalDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> নগদ যোগ / ব্যবস্থাপনা
            </Button>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="মোট বিক্রয়"
          value={taka(sales)}
          hint={`${toBn(month.filter((t) => t.kind === "sale").length)} টি লেনদেন`}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="মোট ক্রয়"
          value={taka(purchase)}
          hint="৩০ দিনে পণ্য ক্রয়"
          icon={TrendingDown}
          tone="muted"
        />
        <StatCard label="মোট খরচ" value={taka(expense)} hint="পরিচালন ব্যয়" icon={Wallet} tone="warning" />
        <StatCard
          label="আনুমানিক লাভ"
          value={taka(profit)}
          hint="বিক্রয় − (ক্রয় + খরচ)"
          icon={TrendingUp}
          tone={profit >= 0 ? "primary" : "destructive"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CapitalDialog
          trigger={
            <div className="cursor-pointer transition-opacity hover:opacity-90">
              <StatCard
                label="হাতে নগদ (ক্লিক করে নিয়ন্ত্রণ করুন)"
                value={taka(cash)}
                hint="মূলধন + আদায় − পরিশোধ ও খরচ"
                icon={Banknote}
                tone={cash >= 0 ? "primary" : "destructive"}
              />
            </div>
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">গত ১৪ দিনের লেনদেন</h2>
          <div className="mt-4 h-64 min-h-[250px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <AreaChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} />
                  <Tooltip
                    formatter={(v: number) => taka(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="বিক্রয়"
                    stroke="var(--color-chart-1)"
                    fill="url(#g1)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="খরচ"
                    stroke="var(--color-chart-2)"
                    fill="url(#g2)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                লোড হচ্ছে...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-base font-semibold">দেনা-পাওনা</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-primary/8 px-3 py-2.5">
                <span className="text-muted-foreground">পাবো</span>
                <span className="font-semibold text-primary">{taka(receivable)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-destructive/8 px-3 py-2.5">
                <span className="text-muted-foreground">দেবো</span>
                <span className="font-semibold text-destructive">{taka(payable)}</span>
              </div>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning-foreground" />
              <h2 className="text-base font-semibold">স্টক কম</h2>
            </div>
            {lowStock.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">সব পণ্যের স্টক ঠিক আছে।</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 rounded-md bg-warning/25 px-2 py-0.5 text-xs">
                      {toBn(p.stock)} {p.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card-surface mt-6 overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">সাম্প্রতিক লেনদেন</h2>
        <div className="divide-y divide-border">
          {recent.map((t) => {
            const party = parties.find((p) => p.id === t.partyId);
            const isPositive =
              t.kind === "sale" ||
              t.kind === "capital" ||
              t.kind === "purchase_return" ||
              (t.kind === "payment" && party?.type === "customer");

            const title =
              party?.name ||
              t.note ||
              (t.kind === "capital"
                ? "নগদ মূলধন"
                : t.kind === "drawings"
                ? "মালিকের উত্তোলন"
                : t.kind === "expense"
                ? "সাধারণ খরচ"
                : kindLabel[t.kind]);

            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 text-base">
                <div className="min-w-0">
                  <p className="truncate font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">
                    {kindLabel[t.kind]} • {bnDate(t.date)}
                  </p>
                </div>
                <span
                  className={`ml-auto font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}
                >
                  {isPositive ? "+" : "−"}
                  {taka(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
