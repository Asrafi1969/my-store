import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Search } from "lucide-react";
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
import { actions, bnDate, taka, toBn, todayISO, useHishab, withinDays } from "@/lib/hishab-store";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "খরচ — হিসাবপাতি" },
      { name: "description", content: "দোকান ভাড়া, বিল, বেতনসহ সব ব্যবসায়িক খরচের হিসাব রাখুন।" },
      { property: "og:title", content: "খরচ — হিসাবপাতি" },
      { property: "og:description", content: "ব্যবসায়িক খরচের পূর্ণ তালিকা ও মাসিক সারসংক্ষেপ।" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { txns } = useHishab();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ note: "", amount: "", date: todayISO() });

  const all = txns.filter((t) => t.kind === "expense");
  const q = query.trim().toLowerCase();
  const list = q
    ? all.filter((t) => `${t.note ?? ""} ${t.date} ${t.amount}`.toLowerCase().includes(q))
    : all;
  const monthTotal = all.filter((t) => withinDays(t.date, 30)).reduce((a, t) => a + t.amount, 0);


  const submit = () => {
    const amount = Number(form.amount) || 0;
    if (!amount) return;
    actions.addTxn({
      kind: "expense",
      date: form.date,
      amount,
      paid: amount,
      note: form.note || "সাধারণ খরচ",
    });
    setForm({ note: "", amount: "", date: todayISO() });
    setOpen(false);
  };

  return (
    <AppLayout
      title="খরচ"
      subtitle={`গত ৩০ দিনে ${taka(monthTotal)}`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> নতুন খরচ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন খরচ যোগ করুন</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>খরচের খাত</Label>
                <Input
                  placeholder="যেমন: দোকান ভাড়া"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>টাকার পরিমাণ</Label>
                  <Input
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
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
            </div>
            <DialogFooter>
              <Button onClick={submit}>সংরক্ষণ করুন</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="খরচের খাত বা টাকার পরিমাণ খুঁজুন"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="card-surface divide-y divide-border overflow-hidden">
        {list.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">কোনো খরচ পাওয়া যায়নি।</p>
        )}
        {list.slice(0, 60).map((t) => (

          <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 text-base">
            <div className="min-w-0">
              <p className="truncate font-medium">{t.note}</p>
              <p className="text-xs text-muted-foreground">{bnDate(t.date)}</p>
            </div>
            <span className="ml-auto font-semibold text-destructive">−{taka(t.amount)}</span>
            <button
              aria-label="মুছুন"
              onClick={() => actions.removeTxn(t.id)}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">মোট {toBn(list.length)} টি খরচের রেকর্ড</p>
    </AppLayout>
  );
}
