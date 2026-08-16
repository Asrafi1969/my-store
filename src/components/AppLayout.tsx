import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  ShoppingBag,
  Wallet,
  BarChart3,
  HandCoins,
  Menu,
  X,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  PackageX,
} from "lucide-react";
import { hydrateStore, useHishab } from "@/lib/hishab-store";
import { FileToolbar } from "@/components/FileToolbar";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { to: "/products", label: "পণ্য", icon: Package },
  { to: "/parties", label: "পার্টি", icon: Users },
  { to: "/sales", label: "বিক্রয়", icon: ShoppingCart },
  { to: "/purchases", label: "ক্রয়", icon: ShoppingBag },
  { to: "/dues", label: "বকেয়া", icon: HandCoins },
  { to: "/expenses", label: "খরচ", icon: Wallet },
  { to: "/wastage", label: "ওয়েস্টেজ", icon: PackageX },
  { to: "/reports", label: "রিপোর্ট", icon: BarChart3 },
] as const;

const COLLAPSE_KEY = "hishabpati-sidebar-collapsed";

const bottomNav = [
  { to: "/", label: "হোম", icon: LayoutDashboard },
  { to: "/sales", label: "বিক্রয়", icon: ShoppingCart },
  { to: "/purchases", label: "ক্রয়", icon: ShoppingBag },
  { to: "/dues", label: "বকেয়া", icon: HandCoins },
  { to: "/products", label: "পণ্য", icon: Package },
] as const;

export function AppLayout({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { shopName } = useHishab();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    hydrateStore();
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {open && (
        <button
          aria-label="মেনু বন্ধ করুন"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shadow-none lg:transition-all",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-64",
        )}
      >
        <div className={cn("flex items-center gap-3 px-5 py-5", collapsed && "lg:px-4")}>
          <span className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Store className="size-5 text-sidebar-primary-foreground" />
          </span>
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="text-xl font-semibold leading-tight">হিসাবপাতি</p>
            <p className="truncate text-sm text-sidebar-foreground/70">{shopName}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent lg:hidden"
            aria-label="বন্ধ করুন"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              title={item.label}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs",
              }}
              className={cn(
                "flex min-h-[44px] items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-base text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/70 active:scale-[0.98]",
                collapsed && "lg:justify-center lg:px-0",
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "সাইডবার খুলুন" : "সাইডবার গুটান"}
          className="mx-3 mt-2 hidden min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-base text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/70 lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5 shrink-0" />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" />
          )}
          <span className={cn(collapsed && "hidden")}>গুটিয়ে নিন</span>
        </button>

        <div
          className={cn(
            "m-3 rounded-xl bg-sidebar-accent/60 p-3.5 text-xs text-sidebar-foreground/80 leading-relaxed",
            collapsed && "lg:hidden",
          )}
        >
          <span className="font-semibold text-sidebar-foreground">ডেস্কটপ সংস্করণ</span> — আপনার হিসাব PC-তে নিরাপদ SQLite .db ফাইলে সংরক্ষিত থাকে।
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/90 px-3.5 py-3 backdrop-blur-md lg:px-8 lg:py-4">
          <button
            onClick={() => setOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-foreground transition-colors hover:bg-muted active:scale-95 lg:hidden"
            aria-label="মেনু খুলুন"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold lg:text-xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">{action}</div>
        </header>

        <FileToolbar />

        <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>

      {/* মোবাইল বটম নেভিগেশন বার (Smartphones & Tablets Dock) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-border/80 bg-card/95 px-1 py-1 shadow-lg backdrop-blur-lg lg:hidden pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {bottomNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{
              className: "text-primary font-medium bg-primary/10",
            }}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 text-[11px] text-muted-foreground transition-all active:scale-95"
          >
            <item.icon className="size-5" />
            <span className="mt-0.5 truncate">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 text-[11px] text-muted-foreground transition-all active:scale-95"
          aria-label="আরও মেনু"
        >
          <Menu className="size-5" />
          <span className="mt-0.5 truncate">মেনু</span>
        </button>
      </nav>
    </div>
  );
}
