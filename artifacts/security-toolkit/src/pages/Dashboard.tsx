import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Search, Radar, Lock, Zap, Globe, ArrowRight, Terminal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tools = [
  {
    icon: Shield,
    title: "WAF Checker",
    description: "Fire hundreds of attack payloads — SQLi, XSS, command injection, path traversal — and see what gets blocked in real-time.",
    href: "/waf",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "Active Testing",
  },
  {
    icon: Radar,
    title: "Reconnaissance",
    description: "Identify tech stack, detect CMS and frameworks, discover subdomains, and inspect DNS records.",
    href: "/recon",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    badge: "Passive",
  },
  {
    icon: Lock,
    title: "Security Headers",
    description: "Audit HTTP security headers and receive an A+ to F grade with actionable recommendations.",
    href: "/headers",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    badge: "Audit",
  },
  {
    icon: Zap,
    title: "Page Speed",
    description: "Measure Core Web Vitals, Time to First Byte, LCP, FCP and identify performance bottlenecks.",
    href: "/speed",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    badge: "Performance",
  },
  {
    icon: Globe,
    title: "SEO Audit",
    description: "Analyze meta tags, Open Graph, structured data, heading hierarchy, and surface critical issues.",
    href: "/seo",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    badge: "Analysis",
  },
];

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();

  const handleQuickScan = (href: string) => {
    setLocation(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold mb-6 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Security Toolkit
          </div>
          <h1 className="text-5xl font-black text-foreground mb-4 tracking-tight">
            Analyze any website.
            <br />
            <span className="text-emerald-400">Find every weakness.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            A professional-grade security analysis platform. WAF testing, recon, header audits, performance, and SEO — all in one place, all exportable.
          </p>
        </div>

        <div className="flex items-center gap-3 max-w-2xl mx-auto mb-4">
          <div className="relative flex-1">
            <Terminal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="https://target-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10 h-13 bg-card border-border font-mono text-sm focus-visible:ring-primary text-foreground placeholder:text-muted-foreground"
              data-testid="input-dashboard-url"
            />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mb-16">
          Enter a target URL and select a tool below to begin scanning
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card
              key={tool.href}
              className="bg-card border-border hover:border-border/80 cursor-pointer group transition-all duration-200 hover:shadow-lg hover:shadow-black/20 relative overflow-hidden"
              onClick={() => handleQuickScan(tool.href)}
              data-testid={`card-tool-${tool.href.replace("/", "")}`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${tool.bg}`} />
              <CardHeader className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${tool.bg} border ${tool.border} flex items-center justify-center`}>
                    <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <Badge variant="outline" className={`text-xs ${tool.color} border-current/30 bg-current/5`}>
                    {tool.badge}
                  </Badge>
                </div>
                <CardTitle className="text-foreground text-base font-bold">{tool.title}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 pt-0">
                <div className={`flex items-center gap-1 text-xs font-semibold ${tool.color} group-hover:gap-2 transition-all`}>
                  Launch tool <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-amber-400 font-semibold">Authorized use only.</span>{" "}
              Only test websites you own or have explicit written permission to test. Unauthorized security testing is illegal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
