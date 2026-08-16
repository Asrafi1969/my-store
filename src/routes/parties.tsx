import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, Phone, HandCoins, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { actions, taka, toBn, useHishab, type Party } from "@/lib/hishab-store";

export const Route = createFileRoute("/parties")({
  head: () => ({
    meta: [
      { title: "পার্টি — হিসাবপাতি" },
      { name: "description", content: "ক্রেতা ও সরবরাহকারীর তালিকা, দেনা-পাওনার হিসাব এক নজরে।" },
      { property: "og:title", content: "পার্টি — হিসাবপাতি" },
      { property: "og:description", content: "কাস্টমার ও সাপ্লায়ারের বকেয়া হিসাব।" },
    ],
  }),
  component: PartiesPage,
});

function PartyList({ items }: { items: Party[] }) {
  if (items.length === 0)
    return <p className="card-surface p-6 text-sm text-muted-foreground">কোনো পার্টি নেই।</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((p) => (
        <div key={p.id} className="card-surface flex items-center gap-4 p-4">
          <Link
            to="/party/$id"
            params={{ id: p.id } as any}
            className="flex min-w-0 flex-1 items-center gap-4"
          >
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
              <p
                className={`font-semibold ${p.due > 0 ? "text-primary" : p.due < 0 ? "text-destructive" : ""}`}
              >
                {taka(Math.abs(p.due))}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.due > 0 ? "পাবো" : p.due < 0 ? "দেবো" : "পরিশোধিত"}
              </p>
            </div>
          </Link>
          <PaymentDialog
            party={p}
            trigger={
              <Button size="icon" variant="outline" aria-label="বকেয়া পরিশোধ">
                <HandCoins className="size-4" />
              </Button>
            }
          />
          <button
            aria-label="মুছুন"
            onClick={() => actions.removeParty(p.id)}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}


function PartiesPage() {
  const { parties } = useHishab();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", type: "customer", due: "" });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? parties.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q))
    : parties;


  const submit = () => {
    if (!form.name.trim()) return;
    actions.addParty({
      name: form.name.trim(),
      phone: form.phone,
      type: form.type as Party["type"],
      due: Number(form.due) || 0,
    });
    setForm({ name: "", phone: "", type: "customer", due: "" });
    setOpen(false);
  };

  return (
    <AppLayout
      title="পার্টি"
      subtitle={`মোট ${toBn(parties.length)} জন ক্রেতা ও সরবরাহকারী`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> নতুন পার্টি
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন পার্টি যোগ করুন</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>নাম</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>মোবাইল নম্বর</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>ধরন</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">ক্রেতা</SelectItem>
                      <SelectItem value="supplier">সরবরাহকারী</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>শুরুর বকেয়া</Label>
                  <Input
                    inputMode="numeric"
                    value={form.due}
                    onChange={(e) => setForm({ ...form, due: e.target.value })}
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
      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="mt-4">
        <TabsList>
          <TabsTrigger value="all">সবাই</TabsTrigger>
          <TabsTrigger value="customer">ক্রেতা</TabsTrigger>
          <TabsTrigger value="supplier">সরবরাহকারী</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-5">
          <PartyList items={filtered} />
        </TabsContent>
        <TabsContent value="customer" className="mt-5">
          <PartyList items={filtered.filter((p) => p.type === "customer")} />
        </TabsContent>
        <TabsContent value="supplier" className="mt-5">
          <PartyList items={filtered.filter((p) => p.type === "supplier")} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

