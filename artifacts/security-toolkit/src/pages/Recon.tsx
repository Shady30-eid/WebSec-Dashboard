import { useState } from "react";
import {
  Radar, Server, Globe, Database, ExternalLink, Search, Shield, Target,
  CheckCircle, XCircle, AlertTriangle, Lock, FileText, Info, Clock, Zap, Mail,
} from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRunReconScan } from "@workspace/api-client-react";
import type { ReconResult } from "@workspace/api-client-react";

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  "Web Server": { color: "text-sky-400", bg: "bg-sky-500/10" },
  "CMS": { color: "text-violet-400", bg: "bg-violet-500/10" },
  "Hosting / CMS": { color: "text-violet-400", bg: "bg-violet-500/10" },
  "Framework": { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Language / Framework": { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Language": { color: "text-lime-400", bg: "bg-lime-500/10" },
  "JavaScript Framework": { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  "JavaScript Library": { color: "text-amber-400", bg: "bg-amber-500/10" },
  "CSS Framework": { color: "text-pink-400", bg: "bg-pink-500/10" },
  "CDN": { color: "text-orange-400", bg: "bg-orange-500/10" },
  "CDN / WAF": { color: "text-red-400", bg: "bg-red-500/10" },
  "Cache": { color: "text-slate-400", bg: "bg-slate-500/10" },
  "Hosting": { color: "text-rose-400", bg: "bg-rose-500/10" },
  "E-Commerce": { color: "text-green-400", bg: "bg-green-500/10" },
  "Analytics": { color: "text-cyan-400", bg: "bg-cyan-500/10" },
  "Tag Management": { color: "text-teal-400", bg: "bg-teal-500/10" },
  "Security": { color: "text-red-400", bg: "bg-red-500/10" },
  "Auth": { color: "text-indigo-400", bg: "bg-indigo-500/10" },
  "Backend / Auth": { color: "text-indigo-400", bg: "bg-indigo-500/10" },
  "Backend": { color: "text-indigo-400", bg: "bg-indigo-500/10" },
  "Monitoring": { color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  "Payments": { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Live Chat": { color: "text-blue-400", bg: "bg-blue-500/10" },
  "Marketing": { color: "text-orange-400", bg: "bg-orange-500/10" },
  "Email": { color: "text-orange-400", bg: "bg-orange-500/10" },
  "Maps": { color: "text-sky-400", bg: "bg-sky-500/10" },
  "Video": { color: "text-rose-400", bg: "bg-rose-500/10" },
  "Media CDN": { color: "text-orange-400", bg: "bg-orange-500/10" },
  "Fonts": { color: "text-muted-foreground", bg: "bg-secondary" },
  "A/B Testing": { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  "Performance": { color: "text-teal-400", bg: "bg-teal-500/10" },
  "Status": { color: "text-muted-foreground", bg: "bg-secondary" },
  "CRM / E-Commerce": { color: "text-green-400", bg: "bg-green-500/10" },
};

const OSINT_CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: typeof Shield }> = {
  "IP Intelligence": { color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Target },
  "Domain Intelligence": { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: Search },
  "Attack Surface": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: Shield },
  "Reputation": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle },
  "SSL / Certificates": { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Lock },
};

type OsintLink = { name: string; url: string; category: string; description: string };
type RelatedDomain = { domain: string; ip?: string; registered: boolean; tld: string };
type EmailSec = { check: string; status: "pass" | "warn" | "fail"; detail: string };
type HeaderInfo = { header: string; value: string; category: string };
type RobotsTxt = { exists: boolean; content?: string; sitemaps?: string[]; disallowedPaths?: string[] };
type SecurityTxt = { exists: boolean; content?: string; contacts?: string[]; expires?: string };
type TechEntry = { name: string; category: string; version?: string; confidence: number; evidence?: string };

type ExtendedReconResult = ReconResult & {
  finalUrl?: string;
  httpStatus?: number;
  responseTime?: number;
  techStack: TechEntry[];
  osintLinks?: OsintLink[];
  relatedDomains?: RelatedDomain[];
  emailSecurity?: EmailSec[];
  headerInfo?: HeaderInfo[];
  robotsTxt?: RobotsTxt;
  securityTxt?: SecurityTxt;
};

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

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

  const headerByCategory = result?.headerInfo?.reduce<Record<string, HeaderInfo[]>>((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category]!.push(h);
    return acc;
  }, {}) ?? {};

  const techByCategory = result?.techStack.reduce<Record<string, TechEntry[]>>((acc, t) => {
    if (t.category === "Status" || t.category === "Performance") return acc;
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category]!.push(t);
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
            <p className="text-sm text-muted-foreground">Tech stack · DNS · Email security · OSINT · Robots.txt · Headers · Related domains</p>
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
            <p className="text-sm text-muted-foreground font-mono mb-3">Performing deep reconnaissance — DNS, tech stack, email security, robots.txt, OSINT links...</p>
            <Progress value={45} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Header summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.domain}</h2>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {result.ipAddress && <span className="text-sm text-muted-foreground font-mono">{result.ipAddress}</span>}
                {result.httpStatus && (
                  <Badge variant="outline" className={`text-xs font-mono ${result.httpStatus < 400 ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}>
                    HTTP {result.httpStatus}
                  </Badge>
                )}
                {result.responseTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />{result.responseTime}ms
                  </span>
                )}
              </div>
            </div>
            <ExportButtons data={result} title="Reconnaissance Report" />
          </div>

          {/* Tech Stack — grouped by category */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4" />Tech Stack
                <span className="text-xs font-normal normal-case text-muted-foreground ml-1">({result.techStack.filter(t => t.category !== "Status" && t.category !== "Performance").length} detected)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(techByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">No technologies detected</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(techByCategory).map(([category, techs]) => {
                    const style = CATEGORY_COLORS[category] ?? { color: "text-muted-foreground", bg: "bg-secondary" };
                    return (
                      <div key={category}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${style.color}`}>{category}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {techs.map((tech, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/50" title={tech.evidence}>
                              <div className={`w-7 h-7 rounded-md ${style.bg} flex items-center justify-center shrink-0`}>
                                <Globe className={`w-3.5 h-3.5 ${style.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-foreground truncate">{tech.name}</span>
                                  {tech.version && <span className="text-xs text-muted-foreground font-mono shrink-0">v{tech.version}</span>}
                                </div>
                                {tech.evidence && <p className="text-xs text-muted-foreground/60 truncate">{tech.evidence}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs text-muted-foreground">{tech.confidence}%</span>
                                <Progress value={tech.confidence} className="w-12 h-1 mt-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Security */}
          {result.emailSecurity && result.emailSecurity.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4" />Email Security (SPF · DMARC · DKIM · MTA-STS · BIMI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.emailSecurity.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${item.status === "pass" ? "bg-emerald-500/5 border-emerald-500/20" : item.status === "warn" ? "bg-yellow-500/5 border-yellow-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                    <StatusIcon status={item.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-foreground">{item.check}</span>
                        <Badge variant="outline" className={`text-xs ${item.status === "pass" ? "text-emerald-400 border-emerald-500/30" : item.status === "warn" ? "text-yellow-400 border-yellow-500/30" : "text-red-400 border-red-500/30"}`}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono break-all">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
                      <Badge variant="outline" className="text-xs font-mono text-sky-400 border-sky-500/30 bg-sky-500/5 shrink-0 mt-0.5 whitespace-nowrap">
                        {record.type}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground break-all">{record.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* HTTP Response Headers */}
          {Object.keys(headerByCategory).length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4" />HTTP Response Headers
                  <span className="text-xs font-normal normal-case ml-1">({result.headerInfo?.length} interesting headers)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(headerByCategory).map(([category, headers]) => (
                  <div key={category}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{category}</p>
                    <div className="space-y-1.5">
                      {headers.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/20 border border-border/30">
                          <span className="text-xs font-mono text-sky-400 shrink-0 mt-0.5">{h.header}:</span>
                          <span className="text-xs font-mono text-muted-foreground break-all">{h.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Robots.txt */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />Robots.txt
                {result.robotsTxt?.exists
                  ? <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30 ml-1">Found</Badge>
                  : <Badge variant="outline" className="text-xs text-muted-foreground border-border ml-1">Not Found</Badge>
                }
              </CardTitle>
            </CardHeader>
            {result.robotsTxt?.exists && (
              <CardContent className="space-y-3">
                {result.robotsTxt.sitemaps && result.robotsTxt.sitemaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sitemaps</p>
                    <div className="space-y-1">
                      {result.robotsTxt.sitemaps.map((s, i) => (
                        <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-mono text-sky-400 hover:underline">
                          <ExternalLink className="w-3 h-3 shrink-0" />{s}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {result.robotsTxt.disallowedPaths && result.robotsTxt.disallowedPaths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Disallowed Paths ({result.robotsTxt.disallowedPaths.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.robotsTxt.disallowedPaths.map((p, i) => (
                        <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/5 border border-red-500/20 text-red-400">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Security.txt */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" />Security.txt (RFC 9116)
                {result.securityTxt?.exists
                  ? <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30 ml-1">Found</Badge>
                  : <Badge variant="outline" className="text-xs text-muted-foreground border-border ml-1">Not Found</Badge>
                }
              </CardTitle>
            </CardHeader>
            {result.securityTxt?.exists && (
              <CardContent className="space-y-2">
                {result.securityTxt.contacts && result.securityTxt.contacts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Contact</p>
                    {result.securityTxt.contacts.map((c, i) => (
                      <p key={i} className="text-sm font-mono text-emerald-400">{c}</p>
                    ))}
                  </div>
                )}
                {result.securityTxt.expires && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />Expires: {result.securityTxt.expires}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* OSINT Links */}
          {Object.keys(osintByCategory).length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4" />OSINT & Intelligence Links
                  <span className="text-xs font-normal normal-case ml-1">({result.osintLinks?.length} links)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {Object.entries(osintByCategory).map(([category, links]) => {
                  const style = OSINT_CATEGORY_STYLES[category] ?? { color: "text-muted-foreground", bg: "bg-secondary", border: "border-border", icon: Globe };
                  const Icon = style.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-3.5 h-3.5 ${style.color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>{category}</span>
                        <span className="text-xs text-muted-foreground">({links.length})</span>
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

          {/* Related Domains */}
          {result.relatedDomains && result.relatedDomains.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />Related Domains — TLD Variations
                  <span className="text-xs font-normal normal-case text-muted-foreground ml-1">
                    ({registeredDomains.length} registered · {unregisteredDomains.length} unregistered)
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
          <p className="text-sm">Enter a target URL to begin deep reconnaissance scanning</p>
          <p className="text-xs mt-1 opacity-60">Tech stack · DNS · Email security · OSINT links · Robots.txt · Security.txt · Related domains</p>
        </div>
      )}
    </div>
  );
}
