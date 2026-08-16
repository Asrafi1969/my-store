import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Search, Pencil } from "lucide-react";
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
import { actions, taka, toBn, useHishab, type Product } from "@/lib/hishab-store";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "পণ্য তালিকা — হিসাবপাতি" },
      { name: "description", content: "আনলিমিটেড পণ্য যোগ করুন, স্টক ও ক্রয়-বিক্রয় মূল্য দেখুন।" },
      { property: "og:title", content: "পণ্য তালিকা — হিসাবপাতি" },
      { property: "og:description", content: "পণ্য, স্টক ও মূল্যের সম্পূর্ণ তালিকা।" },
    ],
  }),
  component: ProductsPage,
});

function EditProductDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    unit: product.unit,
    sellPrice: product.sellPrice ? String(product.sellPrice) : "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: product.name,
        unit: product.unit,
        sellPrice: product.sellPrice ? String(product.sellPrice) : "",
      });
    }
  }, [product, open]);

  const submit = () => {
    if (!form.name.trim()) return;
    actions.updateProduct(product.id, {
      name: form.name.trim(),
      unit: form.unit || "পিস",
      sellPrice: Number(form.sellPrice) || 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="সম্পাদনা"
          title="সম্পাদনা করুন (বিক্রয় মূল্য নির্ধারণ)"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"
        >
          <Pencil className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>পণ্য তথ্য ও বিক্রয় মূল্য সম্পাদনা</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>পণ্যের নাম</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>একক</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>বিক্রয় মূল্য (প্রতি {form.unit || "একক"})</Label>
              <Input
                inputMode="numeric"
                placeholder="যেমন: ১৫০"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">সর্বশেষ ক্রয় মূল্য (ক্রয় পেজ থেকে):</span>
              <span className="font-semibold text-foreground">{taka(product.buyPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">বর্তমান স্টক (ক্রয়/বিক্রয় হতে):</span>
              <span className="font-semibold text-foreground">
                {toBn(product.stock)} {product.unit}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="w-full">
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsPage() {
  const { products } = useHishab();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "পিস", sell: "" });

  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const stockValue = products.reduce((a, p) => a + p.stock * p.buyPrice, 0);

  const submit = () => {
    if (!form.name.trim()) return;
    actions.addProduct({
      name: form.name.trim(),
      unit: form.unit || "পিস",
      stock: 0,
      buyPrice: 0,
      sellPrice: Number(form.sell) || 0,
    });
    setForm({ name: "", unit: "পিস", sell: "" });
    setOpen(false);
  };

  return (
    <AppLayout
      title="পণ্য"
      subtitle={`${toBn(products.length)} টি পণ্য • মোট স্টক মূল্য ${taka(stockValue)}`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> নতুন পণ্য যোগ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>নতুন পণ্য ক্যাটালগে যোগ করুন</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                💡 <strong>নির্দেশনা:</strong> এখানে পণ্যের নাম ও একক দিন। ক্রয় মূল্য ও স্টক ম্যানুয়ালি দেওয়ার প্রয়োজন নেই—<strong>'ক্রয়'</strong> পেজ থেকে কেনাকাটা সম্পন্ন করলে ক্রয় মূল্য ও স্টক স্বয়ংক্রিয়ভাবে হিসাব হবে। পণ্য কেনার পর আপনার পছন্দমতো বিক্রয় মূল্য সেট করে নিতে পারবেন।
              </p>

              <div className="grid gap-2">
                <Label>পণ্যের নাম</Label>
                <Input
                  placeholder="যেমন: মিনিকেট চাল"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>একক</Label>
                  <Input
                    placeholder="পিস/কেজি/লিটার"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>বিক্রয় মূল্য (ঐচ্ছিক)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="পণ্য কেনার পরও সেট করতে পারবেন"
                    value={form.sell}
                    onChange={(e) => setForm({ ...form, sell: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button onClick={submit} className="w-full">
                পণ্য সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="পণ্য খুঁজুন..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* মোবাইল প্রোডাক্ট কার্ড তালিকা */}
      <div className="mt-5 space-y-3 sm:hidden">
        {list.length === 0 && (
          <p className="card-surface p-6 text-center text-sm text-muted-foreground">
            কোনো পণ্য পাওয়া যায়নি।
          </p>
        )}
        {list.map((p) => (
          <div key={p.id} className="card-surface p-4 space-y-2 text-base">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground text-lg">{p.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      p.stock <= 0
                        ? "bg-destructive/15 text-destructive"
                        : p.stock <= 15
                        ? "bg-warning/20 text-warning-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    স্টক: {toBn(p.stock)} {p.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <EditProductDialog product={p} />
                <button
                  aria-label="মুছুন"
                  title="মুছুন"
                  onClick={() => actions.removeProduct(p.id)}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">সর্বশেষ ক্রয় মূল্য</span>
                <span className="font-medium text-foreground">{p.buyPrice > 0 ? taka(p.buyPrice) : "—"}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">বিক্রয় মূল্য</span>
                <span className="font-semibold text-primary text-base">
                  {p.sellPrice > 0 ? taka(p.sellPrice) : "নির্ধারিত নয়"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ট্যাবলেট ও ডেস্কটপ টেবিল ভিউ */}
      <div className="card-surface mt-5 hidden overflow-x-auto sm:block">
        <table className="data-table w-full min-w-[620px] text-base">
          <thead className="border-b border-border text-left text-sm text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">পণ্য</th>
              <th className="px-5 py-3 text-right font-medium">স্টক</th>
              <th className="px-5 py-3 text-right font-medium">সর্বশেষ ক্রয় মূল্য</th>
              <th className="px-5 py-3 text-right font-medium">বিক্রয় মূল্য</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-medium">{p.name}</td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={`rounded-md px-2 py-0.5 text-sm ${
                      p.stock <= 0
                        ? "bg-destructive/15 text-destructive font-semibold"
                        : p.stock <= 15
                        ? "bg-warning/25"
                        : "bg-secondary"
                    }`}
                  >
                    {toBn(p.stock)} {p.unit}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {p.buyPrice > 0 ? taka(p.buyPrice) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-5 py-3 text-right font-medium text-primary">
                  {p.sellPrice > 0 ? (
                    taka(p.sellPrice)
                  ) : (
                    <span className="text-xs text-muted-foreground font-normal">নির্ধারিত নয়</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditProductDialog product={p} />
                    <button
                      aria-label="মুছুন"
                      title="মুছুন"
                      onClick={() => actions.removeProduct(p.id)}
                      className="p-2 rounded-lg text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

