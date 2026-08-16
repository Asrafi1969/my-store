import { useState, type ReactNode } from "react";
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
import { actions, payMethods, taka, todayISO, type Party, type PayMethod } from "@/lib/hishab-store";

export function PaymentDialog({ party, trigger }: { party: Party; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isCustomer = party.type === "customer";
  const outstanding = Math.abs(party.due);
  const [form, setForm] = useState({
    amount: "",
    discount: "",
    method: "cash" as PayMethod,
    date: todayISO(),
    note: "",
  });

  const amount = Number(form.amount) || 0;
  const discount = Number(form.discount) || 0;
  const remaining = Math.max(0, outstanding - amount - discount);

  const submit = () => {
    if (!amount && !discount) return;
    actions.addPayment({
      partyId: party.id,
      amount,
      discount,
      method: form.method,
      date: form.date,
      ...(form.note ? { note: form.note } : {}),
    });
    setForm({ amount: "", discount: "", method: "cash", date: todayISO(), note: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCustomer ? "বকেয়া আদায়" : "বকেয়া পরিশোধ"} — {party.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">বর্তমান বকেয়া</span>
              <span className="font-semibold">{taka(outstanding)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>টাকার পরিমাণ</Label>
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
            <Label>মন্তব্য</Label>
            <Input
              placeholder="ঐচ্ছিক"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">পরিশোধের পর বকেয়া</span>
            <span className="font-semibold">{taka(remaining)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>সংরক্ষণ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
