import type React from "react";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HandCoins, Phone, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  actions,
  bnDate,
  methodLabel,
  taka,
  toBn,
  useHishab,
  type Party,
} from "@/lib/hishab-store";

export const Route = createFileRoute("/dues")({
  head: () => ({
    meta: [
      { title: "বকেয়া — হিসাবপাতি" },
      {
        name: "description",
        content: "ক্রয় ও বিক্রয়ের সব বকেয়া, পরিশোধের ইতিহাস ও ছাড়সহ বকেয়া আদায়-পরিশোধের ব্যবস্থা।",
      },
      { property: "og:title", content: "বকেয়া — হিসাবপাতি" },
      { property: "og:description", content: "বকেয়া ও পরিশোধের সম্পূর্ণ হিসাব এক পেজে।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DuesPage,
});

function DueRow({ p }: { p: Party; key?: React.Key }) {
  return (
    <div className="card-surface flex items-center gap-4 p-4">
      <Link to="/party/$id" params={{ id: p.id } as any} className="flex min-w-0 flex-1 items-center gap-4">
        <span className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-primary-foreground">
          {p.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium hover:underline">{p.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" /> {toBn(p.phone)}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className={`font-semibold ${p.due > 0 ? "text-primary" : "text-destructive"}`}>
            {taka(Math.abs(p.due))}
          </p>
          <p className="text-xs text-muted-foreground">{p.due > 0 ? "পাবো" : "দেবো"}</p>
        </div>
      </Link>
      <PaymentDialog
        party={p}
        trigger={
          <Button size="sm" variant="outline" className="h-10 px-3 min-w-[70px] text-xs sm:text-sm">
            <HandCoins className="size-4" />
            {p.due > 0 ? "আদায়" : "পরিশোধ"}
          </Button>
        }
      />
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-3 max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DuesPage() {
  const { parties, txns } = useHishab();
  const [qRecv, setQRecv] = useState("");
  const [qPay, setQPay] = useState("");
  const [qUnpaid, setQUnpaid] = useState("");
  const [qHistory, setQHistory] = useState("");

  const matchParty = (p: { name: string; phone: string }, q: string) =>
    `${p.name} ${p.phone}`.toLowerCase().includes(q.trim().toLowerCase());

  const receivables = parties
    .filter((p) => p.due > 0 && matchParty(p, qRecv))
    .sort((a, b) => b.due - a.due);
  const payables = parties
    .filter((p) => p.due < 0 && matchParty(p, qPay))
    .sort((a, b) => a.due - b.due);
  const totalReceivable = parties.filter((p) => p.due > 0).reduce((a, p) => a + p.due, 0);
  const totalPayable = parties.filter((p) => p.due < 0).reduce((a, p) => a - p.due, 0);

  const unpaidTxns = txns
    .filter((t) => (t.kind === "sale" || t.kind === "purchase") && t.amount - t.paid > 0)
    .filter((t) => {
      const q = qUnpaid.trim().toLowerCase();
      if (!q) return true;
      const name = parties.find((p) => p.id === t.partyId)?.name ?? "";
      return `${name} ${t.kind === "sale" ? "বিক্রয়" : "ক্রয়"} ${t.date} ${t.amount}`
        .toLowerCase()
        .includes(q);
    });
  const allPayments = txns.filter((t) => t.kind === "payment");
  const payments = allPayments.filter((t) => {
    const q = qHistory.trim().toLowerCase();
    if (!q) return true;
    const name = parties.find((p) => p.id === t.partyId)?.name ?? "";
    return `${name} ${methodLabel(t.method)} ${t.note ?? ""} ${t.date} ${t.amount}`
      .toLowerCase()
      .includes(q);
  });
  const totalDiscount = allPayments.reduce((a, t) => a + (t.discount ?? 0), 0);


  return (
    <AppLayout title="বকেয়া" subtitle="ক্রয়-বিক্রয়ের সব বকেয়া ও পরিশোধের হিসাব">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট পাবো</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{taka(totalReceivable)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{toBn(receivables.length)} জন ক্রেতা</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট দেবো</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">{taka(totalPayable)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {toBn(payables.length)} জন সরবরাহকারী
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">মোট ছাড়</p>
          <p className="mt-2 text-2xl font-semibold">{taka(totalDiscount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {toBn(allPayments.length)} টি পরিশোধ লেনদেন
          </p>
        </div>
      </div>

      <Tabs defaultValue="receivable" className="mt-6">
        <TabsList className="flex w-full justify-start overflow-x-auto h-auto p-1 border border-border/50 bg-muted/40 rounded-xl gap-1">
          <TabsTrigger value="receivable" className="py-2.5 px-3.5 text-sm">পাবো</TabsTrigger>
          <TabsTrigger value="payable" className="py-2.5 px-3.5 text-sm">দেবো</TabsTrigger>
          <TabsTrigger value="unpaid" className="py-2.5 px-3.5 text-sm">বাকিতে লেনদেন</TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 px-3.5 text-sm">পরিশোধের ইতিহাস</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable" className="mt-4">
          <SearchBox value={qRecv} onChange={setQRecv} placeholder="ক্রেতার নাম বা নম্বর খুঁজুন" />
          <div className="grid gap-3 md:grid-cols-2">
            {receivables.length === 0 ? (
              <p className="card-surface p-6 text-sm text-muted-foreground">কিছু পাওয়া যায়নি।</p>
            ) : (
              receivables.map((p) => <DueRow key={p.id} p={p} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="payable" className="mt-4">
          <SearchBox
            value={qPay}
            onChange={setQPay}
            placeholder="সরবরাহকারীর নাম বা নম্বর খুঁজুন"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {payables.length === 0 ? (
              <p className="card-surface p-6 text-sm text-muted-foreground">কিছু পাওয়া যায়নি।</p>
            ) : (
              payables.map((p) => <DueRow key={p.id} p={p} />)
            )}
          </div>
        </TabsContent>


        <TabsContent value="unpaid" className="mt-4">
          <SearchBox value={qUnpaid} onChange={setQUnpaid} placeholder="নাম, ধরন বা টাকা খুঁজুন" />
          <div className="card-surface overflow-hidden">

            {unpaidTxns.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">বাকিতে কোনো লেনদেন নেই।</p>
            ) : (
              <div className="divide-y divide-border">
                {unpaidTxns.map((t) => {
                  const party = parties.find((p) => p.id === t.partyId);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{party?.name ?? "সাধারণ"}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.kind === "sale" ? "বিক্রয়" : "ক্রয়"} • {bnDate(t.date)} • মোট{" "}
                          {taka(t.amount)} • জমা {taka(t.paid)}
                        </p>
                      </div>
                      <span className="ml-auto shrink-0 font-semibold text-destructive">
                        বাকি {taka(t.amount - t.paid)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SearchBox
            value={qHistory}
            onChange={setQHistory}
            placeholder="নাম, মাধ্যম বা টাকা খুঁজুন"
          />
          <div className="card-surface overflow-hidden">

            {payments.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">এখনো কোনো পরিশোধ হয়নি।</p>
            ) : (
              <div className="divide-y divide-border">
                {payments.map((t) => {
                  const party = parties.find((p) => p.id === t.partyId);
                  const isCustomer = party?.type === "customer";
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{party?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {bnDate(t.date)} • {methodLabel(t.method)}
                          {t.discount ? ` • ছাড় ${taka(t.discount)}` : ""}
                          {t.note ? ` • ${t.note}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-semibold ${isCustomer ? "text-primary" : "text-destructive"}`}
                      >
                        {isCustomer ? "+" : "−"}
                        {taka(t.amount)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => actions.removeTxn(t.id)}
                        title="পরিশোধের রেকর্ডটি মুছুন"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
