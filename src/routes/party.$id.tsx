import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Phone, HandCoins, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/PaymentDialog";
import { actions, bnDate, methodLabel, taka, toBn, useHishab } from "@/lib/hishab-store";

export const Route = createFileRoute("/party/$id")({
  head: () => ({
    meta: [
      { title: "পার্টির বিস্তারিত — হিসাবপাতি" },
      {
        name: "description",
        content: "ক্রেতা বা সরবরাহকারীর সম্পূর্ণ লেনদেনের ইতিহাস, মাধ্যম ও বকেয়ার বিবরণ।",
      },
      { property: "og:title", content: "পার্টির বিস্তারিত — হিসাবপাতি" },
      { property: "og:description", content: "লেনদেনের পূর্ণ ইতিহাস ও বকেয়ার হিসাব।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartyDetailPage,
});

const kindLabel = {
  sale: "বিক্রয়",
  purchase: "ক্রয়",
  expense: "খরচ",
  payment: "পরিশোধ",
  capital: "নগদ মূলধন",
  drawings: "মালিকের উত্তোলন",
  sale_return: "বিক্রয় ফেরত",
  purchase_return: "ক্রয় ফেরত",
} as const;

function PartyDetailPage() {
  const { id } = useParams({ from: "/party/$id" });
  const { parties, products, txns } = useHishab();
  const party = parties.find((p) => p.id === id);

  if (!party) {
    return (
      <AppLayout title="পার্টি পাওয়া যায়নি">
        <Link to="/parties" className="text-primary underline">
          পার্টি তালিকায় ফিরে যান
        </Link>
      </AppLayout>
    );
  }

  const history = txns
    .filter((t) => t.partyId === party.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const isCustomer = party.type === "customer";
  const trade = history.filter((t) => t.kind === "sale" || t.kind === "purchase");
  const totalBusiness = trade.reduce((a, t) => a + t.amount, 0);
  const totalDiscount = history.reduce((a, t) => a + (t.discount ?? 0), 0);
  const totalPaid = history.reduce(
    (a, t) => a + (t.kind === "payment" ? t.amount : t.paid),
    0,
  );

  return (
    <AppLayout
      title={party.name}
      subtitle={isCustomer ? "ক্রেতা" : "সরবরাহকারী"}
      action={
        <PaymentDialog
          party={party}
          trigger={
            <Button size="sm">
              <HandCoins className="size-4" /> {isCustomer ? "বকেয়া আদায়" : "বকেয়া পরিশোধ"}
            </Button>
          }
        />
      }
    >
      <Link
        to="/parties"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> পার্টি তালিকা
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট লেনদেন</p>
          <p className="mt-2 text-2xl font-semibold">{taka(totalBusiness)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট জমা</p>
          <p className="mt-2 text-2xl font-semibold">{taka(totalPaid)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট ছাড়</p>
          <p className="mt-2 text-2xl font-semibold">{taka(totalDiscount)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">
            {party.due > 0 ? "পাবো" : party.due < 0 ? "দেবো" : "বকেয়া"}
          </p>
          <p
            className={`mt-2 text-2xl font-semibold ${party.due > 0 ? "text-primary" : party.due < 0 ? "text-destructive" : ""}`}
          >
            {taka(Math.abs(party.due))}
          </p>
        </div>
      </div>

      <div className="card-surface mt-4 flex items-center gap-2 px-5 py-4 text-sm">
        <Phone className="size-4 text-muted-foreground" />
        <a href={`tel:${party.phone}`} className="hover:underline">
          {toBn(party.phone)}
        </a>
      </div>

      <div className="card-surface mt-6 overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">
          লেনদেনের ইতিহাস ({toBn(history.length)})
        </h2>

        {/* মোবাইল ভিউ - কার্ড তালিকা */}
        <div className="divide-y divide-border/60 md:hidden">
          {history.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">কোনো লেনদেন নেই।</p>
          )}
          {history.map((t) => {
            const product = products.find((p) => p.id === t.productId);
            const due = t.kind === "payment" ? 0 : t.amount - t.paid;
            return (
              <div key={t.id} className="p-4 space-y-2 text-base">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {kindLabel[t.kind]}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{bnDate(t.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{taka(t.amount)}</p>
                    {due > 0 && (
                      <p className="text-xs font-medium text-destructive">বকেয়া: {taka(due)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-1 border-t border-border/40">
                  <span className="truncate">
                    {product ? `${product.name}${t.qty ? ` × ${toBn(t.qty)} ${product.unit}` : ""}` : (t.note ?? "—")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-medium text-foreground">{methodLabel(t.method)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => actions.removeTxn(t.id)}
                      title="রেকর্ড মুছুন"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ট্যাবলেট ও ডেস্কটপ টেবিল ভিউ */}
        <div className="hidden overflow-x-auto md:block">
          <table className="data-table w-full min-w-[760px] text-base">
            <thead className="border-b border-border text-left text-sm text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">তারিখ</th>
                <th className="px-5 py-3 font-medium">ধরন</th>
                <th className="px-5 py-3 font-medium">বিবরণ</th>
                <th className="px-5 py-3 font-medium">মাধ্যম</th>
                <th className="px-5 py-3 text-right font-medium">ছাড়</th>
                <th className="px-5 py-3 text-right font-medium">মোট</th>
                <th className="px-5 py-3 text-right font-medium">জমা</th>
                <th className="px-5 py-3 text-right font-medium">বকেয়া</th>
                <th className="px-5 py-3 text-right font-medium">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((t) => {
                const product = products.find((p) => p.id === t.productId);
                const due = t.kind === "payment" ? 0 : t.amount - t.paid;
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3 whitespace-nowrap">{bnDate(t.date)}</td>
                    <td className="px-5 py-3">{kindLabel[t.kind]}</td>
                    <td className="px-5 py-3">
                      {product ? `${product.name}${t.qty ? ` × ${toBn(t.qty)} ${product.unit}` : ""}` : (t.note ?? "—")}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {methodLabel(t.method)}
                    </td>
                    <td className="px-5 py-3 text-right">{t.discount ? taka(t.discount) : "—"}</td>
                    <td className="px-5 py-3 text-right font-medium">{taka(t.amount)}</td>
                    <td className="px-5 py-3 text-right">{taka(t.kind === "payment" ? t.amount : t.paid)}</td>
                    <td className="px-5 py-3 text-right text-destructive">
                      {due ? taka(due) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => actions.removeTxn(t.id)}
                        title="রেকর্ডটি মুছুন"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {history.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">কোনো লেনদেন নেই।</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
