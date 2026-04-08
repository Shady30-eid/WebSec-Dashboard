import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shield, Radar, Lock, Zap, Globe, LayoutDashboard, Menu, X, Search } from "lucide-react";
import { useState } from "react";
import Dashboard from "@/pages/Dashboard";
import WafChecker from "@/pages/WafChecker";
import Recon from "@/pages/Recon";
import SubFinder from "@/pages/SubFinder";
import Headers from "@/pages/Headers";
import Speed from "@/pages/Speed";
import Seo from "@/pages/Seo";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-foreground" },
  { href: "/waf", label: "WAF Checker", icon: Shield, color: "text-emerald-400" },
  { href: "/recon", label: "Recon", icon: Radar, color: "text-sky-400" },
  { href: "/subfinder", label: "Subdomains", icon: Search, color: "text-teal-400" },
  { href: "/headers", label: "Security Headers", icon: Lock, color: "text-violet-400" },
  { href: "/speed", label: "Page Speed", icon: Zap, color: "text-yellow-400" },
  { href: "/seo", label: "SEO Audit", icon: Globe, color: "text-rose-400" },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">SecTK</p>
            <p className="text-xs text-muted-foreground leading-none">Security Toolkit</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : "text-muted-foreground"}`} />
              {item.label}
              {isActive && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${item.color.replace("text-", "bg-")}`} />}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">For authorized use only</p>
      </div>
    </div>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-sidebar shrink-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-sidebar border-r border-border z-10">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black">Security Toolkit</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/waf" component={WafChecker} />
            <Route path="/recon" component={Recon} />
            <Route path="/subfinder" component={SubFinder} />
            <Route path="/headers" component={Headers} />
            <Route path="/speed" component={Speed} />
            <Route path="/seo" component={Seo} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
