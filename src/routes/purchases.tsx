import { createFileRoute } from "@tanstack/react-router";
import { TxnPage } from "@/components/TxnPage";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "ক্রয় — হিসাবপাতি" },
      { name: "description", content: "সরবরাহকারীর কাছ থেকে পণ্য ক্রয়ের হিসাব ও বকেয়া ট্র্যাক করুন।" },
      { property: "og:title", content: "ক্রয় — হিসাবপাতি" },
      { property: "og:description", content: "পণ্য ক্রয়ের সম্পূর্ণ হিসাব এক জায়গায়।" },
    ],
  }),
  component: () => <TxnPage kind="purchase" />,
});
