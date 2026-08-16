import { createFileRoute } from "@tanstack/react-router";
import { TxnPage } from "@/components/TxnPage";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "বিক্রয় — হিসাবপাতি" },
      { name: "description", content: "প্রতিদিনের বিক্রয় লেনদেন যোগ করুন, বকেয়া হিসাব রাখুন।" },
      { property: "og:title", content: "বিক্রয় — হিসাবপাতি" },
      { property: "og:description", content: "বিক্রয় লেনদেন ও বকেয়ার পূর্ণ তালিকা।" },
    ],
  }),
  component: () => <TxnPage kind="sale" />,
});
