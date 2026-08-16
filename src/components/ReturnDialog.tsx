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
import { actions, payMethods, taka, todayISO, useHishab, type PayMethod, type Txn } from "@/lib/hishab-store";

export function ReturnDialog({
  txn,
  of,
  trigger,
}: {
  txn: Txn;
  of: "sale" | "purchase";
  trigger: ReactNode;
}) {
  const { products, parties } = useHishab();
  const [open, setOpen] = useState(false);
  const product = products.find((p) => p.id === txn.productId);
  const party = parties.find((p) => p.id === txn.partyId);
  const unitRate = txn.qty ? txn.amount / txn.qty : txn.amount;

  const [qty, setQty] = useState(String(txn.qty ?? 1));
  const [amount, setAmount] = useState(String(Math.round(txn.amount)));
  const [mode, setMode] = useState<"cash" | "due">(txn.amount - txn.paid > 0 ? "due" : "cash");
  const [method, setMethod] = useState<PayMethod>((txn.method ?? "cash") as PayMethod);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const isSale = of === "sale";
  const maxQty = txn.qty ?? 0;

  const changeQty = (v: string) => {
    setQty(v);
    const n = Number(v) || 0;
    setAmount(String(Math.round(n * unitRate)));
  };

  const submit = () => {
    const amt = Number(amount) || 0;
    if (!amt) return;
    actions.addReturn({
      of,
      date,
      partyId: txn.partyId,
      productId: txn.productId,
      qty: Number(qty) || 0,
      amount: amt,
      adjustDue: mode === "due",
      method,
      note: note || undefined,
      refId: txn.id,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isSale ? "বিক্রিত মাল ফেরত" : "ক্রয়কৃত মাল ফেরত"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isSale ? "ক্রেতা" : "সরবরাহকারী"}</span>
              <span>{party?.name ?? "—"}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">পণ্য</span>
              <span>{product?.name ?? "—"}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">মূল লেনদেন</span>
              <span>{taka(txn.amount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>ফেরত পরিমাণ {maxQty ? `(সর্বোচ্চ ${maxQty})` : ""}</Label>
              <Input inputMode="decimal" value={qty} onChange={(e) => changeQty(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>ফেরত টাকা</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>নিষ্পত্তির ধরন</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "cash" | "due")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  {isSale ? "টাকা ফেরত দেব (ক্যাশ কমবে)" : "টাকা ফেরত পাব (ক্যাশ বাড়বে)"}
                </SelectItem>
                <SelectItem value="due">বকেয়া থেকে সমন্বয়</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "cash" && (
            <div className="grid gap-2">
              <Label>মাধ্যম</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}>
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>তারিখ</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>মন্তব্য</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ঐচ্ছিক" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isSale
              ? "স্টকে পণ্য যোগ হবে এবং ক্যাশ/পাওনা কমবে।"
              : "স্টক থেকে পণ্য কমবে এবং ক্যাশ বাড়বে/দেনা কমবে।"}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit}>ফেরত সংরক্ষণ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
