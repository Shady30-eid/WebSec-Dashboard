import { useState } from "react";
import { Radar, Server, Globe, Database, CheckCircle, XCircle, ExternalLink, Search, Shield, Target } from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRunReconScan } from "@workspace/api-client-react";
import type { ReconResult } from "@workspace/api-client-react";

const CATEGORY_ICONS: Record<string, { color: string; bg: string }> = {
  "Web Server": { color: "text-sky-400", bg: "bg-sky-500/10" },
  CMS: { color: "text-violet-400", bg: "bg-violet-500/10" },
  Framework: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "JavaScript Framework": { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  CDN: { color: "text-orange-400", bg: "bg-orange-500/10" },
  Hosting: { color: "text-rose-400", bg: "bg-rose-500/10" },
  "Programming Language": { color: "text-lime-400", bg: "bg-lime-500/10" },
  "E-Commerce": { color: "text-pink-400", bg: "bg-pink-500/10" },
};

const OSINT_CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: typeof Shield }> = {
  "IP Intelligence": { color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Target },
  "Domain Intelligence": { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: Search },
  "Attack Surface": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: Shield },
};

type OsintLink = { name: string; url: string; category: string; description: string };
type RelatedDomain = { domain: string; ip?: string; registered: boolean; tld: string };

type ExtendedReconResult = ReconResult & {
  osintLinks?: OsintLink[];
  relatedDomains?: RelatedDomain[];
};

export default function Recon() {
  const [result, setResult] = useState<ExtendedReconResult | null>(null);
  const mutation = useRunReconScan();

  const handleScan = (url: string) => {
    setResult(null);
    mutation.mutate({ data: { url } }, { onSuccess: (data) => setResult(data as ExtendedReconResult) });
  };

  const osintByCategory = result?.osintLinks?.reduce<Record<string, OsintLink[]>>((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category]!.push(link);
    return acc;
  }, {}) ?? {};

  const registeredDomains = result?.relatedDomains?.filter(d => d.registered) ?? [];
  const unregisteredDomains = result?.relatedDomains?.filter(d => !d.registered) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Radar className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Reconnaissance</h1>
            <p className="text-sm text-muted-foreground">Tech stack, subdomains, DNS records, related domains & OSINT links</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <URLInputBar onScan={handleScan} isLoading={mutation.isPending} placeholder="https://example.com" buttonText="Scan" />
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-mono mb-3">Performing reconnaissance... DNS, tech stack, subdomains, related domains...</p>
            <Progress value={45} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.domain}</h2>
              <p className="text-sm text-muted-foreground font-mono">{result.ipAddress || "IP not resolved"}</p>
            </div>
            <ExportButtons data={result} title="Reconnaissance Report" />
          </div>

          {/* OSINT Links */}
          {Object.keys(osintByCategory).length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4" />OSINT & Intelligence Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(osintByCategory).map(([category, links]) => {
                  const style = OSINT_CATEGORY_STYLES[category] ?? { color: "text-muted-foreground", bg: "bg-secondary", border: "border-border", icon: Globe };
                  const Icon = style.icon;
                  return (
                    <div key={category}>
                      <div className={`flex items-center gap-2 mb-2`}>
                        <Icon className={`w-3.5 h-3.5 ${style.color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>{category}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {links.map((link) => (
                          <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-start gap-2.5 p-3 rounded-lg border ${style.border} ${style.bg} hover:opacity-90 transition-opacity group`}
                          >
                            <ExternalLink className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${style.color} group-hover:scale-110 transition-transform`} />
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${style.color} leading-none mb-0.5`}>{link.name}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{link.description}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Tech Stack */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4" />Tech Stack ({result.techStack.length} detected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.techStack.length === 0 ? (
                <p className="text-sm text-muted-foreground">No technologies detected</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.techStack.map((tech, i) => {
                    const style = CATEGORY_ICONS[tech.category] ?? { color: "text-muted-foreground", bg: "bg-secondary" };
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div className={`w-8 h-8 rounded-md ${style.bg} flex items-center justify-center shrink-0`}>
                          <Globe className={`w-4 h-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{tech.name}</span>
                            {tech.version && <span className="text-xs text-muted-foreground font-mono">v{tech.version}</span>}
                          </div>
                          <Badge variant="outline" className={`text-xs ${style.color} border-current/30 bg-current/5 mt-0.5`}>
                            {tech.category}
                          </Badge>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-muted-foreground">{tech.confidence}%</span>
                          <Progress value={tech.confidence} className="w-16 h-1 mt-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DNS Records */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4" />DNS Records ({result.dnsRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {result.dnsRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-3">No DNS records found</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {result.dnsRecords.map((record, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                        <Badge variant="outline" className="text-xs font-mono text-sky-400 border-sky-500/30 bg-sky-500/5 shrink-0 mt-0.5">
                          {record.type}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground break-all">{record.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subdomains */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />Subdomains ({result.subdomains.length} active)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {result.subdomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-3">No active subdomains discovered</p>
                ) : (
                  <div className="divide-y divide-border/50 max-h-64 overflow-auto">
                    {result.subdomains.map((sub, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-mono text-foreground">{sub.subdomain}</span>
                          {sub.ip && <span className="text-xs text-muted-foreground ml-2 font-mono">({sub.ip})</span>}
                        </div>
                        {sub.status === "active" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Related Domains */}
          {result.relatedDomains && result.relatedDomains.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />Related Domains — TLD Variations
                  <span className="text-xs font-normal normal-case text-muted-foreground ml-1">
                    ({registeredDomains.length} registered, {unregisteredDomains.length} unregistered)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {registeredDomains.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Registered & Resolving
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {registeredDomains.map((d, i) => (
                        <a
                          key={i}
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-mono text-foreground">{d.domain}</p>
                            {d.ip && <p className="text-xs text-muted-foreground font-mono">{d.ip}</p>}
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {unregisteredDomains.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Not Registered / Not Resolving
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unregisteredDomains.map((d, i) => (
                        <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-secondary/50 border border-border/50 text-muted-foreground">
                          .{d.tld}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <Radar className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a target URL to begin reconnaissance scanning</p>
        </div>
      )}
    </div>
  );
}
