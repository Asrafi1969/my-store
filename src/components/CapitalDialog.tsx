import { useState, type ReactNode } from "react";
import { Trash2, Plus, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  todayISO,
  useHishab,
  type PayMethod,
} from "@/lib/hishab-store";

export function CapitalDialog({ trigger }: { trigger: ReactNode }) {
  const { txns } = useHishab();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"capital" | "drawings">("capital");
  const [form, setForm] = useState({
    amount: "",
    method: "cash" as PayMethod,
    date: todayISO(),
    note: "",
  });

  const ownerTxns = txns.filter((t) => t.kind === "capital" || t.kind === "drawings");
  const totalCapital = txns
    .filter((t) => t.kind === "capital")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDrawings = txns
    .filter((t) => t.kind === "drawings")
    .reduce((sum, t) => sum + t.amount, 0);
  const netEquity = totalCapital - totalDrawings;

  const submit = () => {
    const amount = Number(form.amount) || 0;
    if (!amount) return;

    if (type === "capital") {
      actions.addCapital({
        amount,
        method: form.method,
        date: form.date,
        ...(form.note ? { note: form.note } : {}),
      });
    } else {
      actions.addDrawings({
        amount,
        method: form.method,
        date: form.date,
        ...(form.note ? { note: form.note } : {}),
      });
    }

    setForm({ amount: "", method: "cash", date: todayISO(), note: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>মূলধন ও মালিকের উত্তোলন ব্যবস্থাপনা</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="add" className="mt-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Plus className="size-3.5" /> লেনদেন হিসাব
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <History className="size-3.5" /> ইতিহাস ({ownerTxns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setType("capital")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                  type === "capital"
                    ? "bg-background text-primary shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="size-3.5 text-primary" /> নগদ মূলধন যোগ
              </button>
              <button
                type="button"
                onClick={() => setType("drawings")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                  type === "drawings"
                    ? "bg-background text-destructive shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="size-3.5 text-destructive" /> মালিকের উত্তোলন
              </button>
            </div>

            <p className="rounded-xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
              {type === "capital"
                ? "💡 ব্যবসা শুরুর প্রারম্ভিক নগদ বা পরবর্তীতে যুক্ত করা মূলধন এখানে রেকর্ড করুন।"
                : "💡 মালিকের নিজস্ব বা ব্যক্তিগত প্রয়োজনে ব্যবসায়ের ক্যাশ থেকে নেওয়া টাকা এখানে রেকর্ড করুন। (এটি লাভ-ক্ষতি প্রভাবিত করবে না)।"}
            </p>

            <div className="grid gap-2">
              <Label>টাকার পরিমাণ</Label>
              <Input
                inputMode="decimal"
                placeholder="যেমন: ৫,০০০"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>মাধ্যম</Label>
                <Select
                  value={form.method}
                  onValueChange={(v) => setForm({ ...form, method: v as PayMethod })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payMethods
                      .filter((m) => m.value !== "due")
                      .map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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

            <div className="grid gap-2">
              <Label>বিবরণ</Label>
              <Input
                placeholder={
                  type === "capital"
                    ? "যেমন: প্রারম্ভিক ক্যাশ"
                    : "যেমন: ব্যক্তিগত প্রয়োজন / ঘর খরচ"
                }
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                onClick={submit}
                variant={type === "capital" ? "default" : "destructive"}
                className="w-full"
              >
                {type === "capital" ? "মূলধন হিসাব সংরক্ষণ করুন" : "উত্তোলন হিসাব সংরক্ষণ করুন"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-xs text-center">
              <div>
                <span className="text-muted-foreground block text-[11px]">মোট মূলধন</span>
                <span className="font-semibold text-primary">{taka(totalCapital)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">মোট উত্তোলন</span>
                <span className="font-semibold text-destructive">{taka(totalDrawings)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">নিট মূলধন</span>
                <span className="font-semibold text-foreground">{taka(netEquity)}</span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border">
              {ownerTxns.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  কোনো মূলধন বা উত্তোলনের রেকর্ড নেই।
                </p>
              ) : (
                ownerTxns.map((t) => {
                  const isCap = t.kind === "capital";
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-medium text-foreground">
                          {t.note ?? (isCap ? "নগদ মূলধন" : "মালিকের উত্তোলন")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isCap ? "মূলধন যোগ" : "উত্তোলন"} • {bnDate(t.date)} • {methodLabel(t.method)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            isCap ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {isCap ? "+" : "−"} {taka(t.amount)}
                        </span>
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
                  );
                })
              )}
            </div>

            {ownerTxns.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-destructive hover:bg-destructive/10"
                onClick={() => actions.clearCapitalTxns()}
              >
                <Trash2 className="mr-1.5 size-3.5" /> সব মূলধন ও উত্তোলন রেকর্ড মুছুন
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
