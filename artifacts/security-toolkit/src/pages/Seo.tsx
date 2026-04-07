import { useState } from "react";
import { Globe, AlertTriangle, Info, CheckCircle, XCircle, Link, Image, Tag } from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRunSeoAudit } from "@workspace/api-client-react";
import type { SeoAuditResult, SeoIssue } from "@workspace/api-client-react";

function IssueBadge({ severity }: { severity: string }) {
  if (severity === "error") return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
      <XCircle className="w-3 h-3 text-red-400" />
      <span className="text-xs text-red-400 font-semibold">Error</span>
    </div>
  );
  if (severity === "warning") return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
      <AlertTriangle className="w-3 h-3 text-yellow-400" />
      <span className="text-xs text-yellow-400 font-semibold">Warning</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
      <Info className="w-3 h-3 text-sky-400" />
      <span className="text-xs text-sky-400 font-semibold">Info</span>
    </div>
  );
}

export default function Seo() {
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const mutation = useRunSeoAudit();

  const handleScan = (url: string) => {
    setResult(null);
    mutation.mutate({ data: { url } }, { onSuccess: (data) => setResult(data) });
  };

  const errors = result?.issues.filter(i => i.severity === "error") ?? [];
  const warnings = result?.issues.filter(i => i.severity === "warning") ?? [];
  const infos = result?.issues.filter(i => i.severity === "info") ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">SEO Audit</h1>
            <p className="text-sm text-muted-foreground">Meta tags, Open Graph, structured data, and issue detection</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <URLInputBar onScan={handleScan} isLoading={mutation.isPending} placeholder="https://example.com" buttonText="Audit SEO" />
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-mono mb-3">Fetching and analyzing page for SEO issues...</p>
            <Progress value={50} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-muted-foreground mb-1">SEO Grade</p>
                <GradeBadge grade={result.grade} size="xl" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="text-4xl font-black text-foreground">{result.score}<span className="text-base text-muted-foreground font-normal">/100</span></p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-red-400">{errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-yellow-400">{warnings.length}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-sky-400">{infos.length}</p>
                  <p className="text-xs text-muted-foreground">Notices</p>
                </div>
              </div>
            </div>
            <ExportButtons data={result} title="SEO Audit Report" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4" />Meta Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Title", value: result.title, maxLen: 60, minLen: 30 },
                  { label: "Description", value: result.description, maxLen: 160, minLen: 70 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-semibold">{item.label}</span>
                      <span className={`text-xs font-mono ${!item.value ? "text-red-400" : item.value.length > item.maxLen || item.value.length < item.minLen ? "text-yellow-400" : "text-emerald-400"}`}>
                        {item.value ? `${item.value.length} chars` : "Missing"}
                      </span>
                    </div>
                    {item.value ? (
                      <p className="text-sm text-foreground bg-secondary/30 px-2.5 py-1.5 rounded border border-border/50 break-all">{item.value}</p>
                    ) : (
                      <p className="text-sm text-red-400/70 italic bg-red-500/5 px-2.5 py-1.5 rounded border border-red-500/20">Not set</p>
                    )}
                  </div>
                ))}
                {result.canonicalUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Canonical URL</p>
                    <p className="text-sm font-mono text-foreground bg-secondary/30 px-2.5 py-1.5 rounded border border-border/50 break-all">{result.canonicalUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Social & Structured Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Open Graph</p>
                  <div className="space-y-1">
                    {["title", "description", "image", "type"].map(key => (
                      <div key={key} className="flex items-center gap-2">
                        {(result.openGraph as Record<string, string | undefined>)[key] ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                        <span className="text-xs font-mono text-muted-foreground">og:{key}</span>
                        {(result.openGraph as Record<string, string | undefined>)[key] && (
                          <span className="text-xs text-foreground/60 truncate">{(result.openGraph as Record<string, string | undefined>)[key]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Twitter Card</p>
                  <div className="space-y-1">
                    {["card", "title", "description"].map(key => (
                      <div key={key} className="flex items-center gap-2">
                        {(result.twitterCard as Record<string, string | undefined>)[key] ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                        <span className="text-xs font-mono text-muted-foreground">twitter:{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-xs px-2 py-1 rounded ${result.structuredData && result.structuredData.length > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-secondary text-muted-foreground border border-border"}`}>
                    JSON-LD: {result.structuredData?.length ?? 0} schemas
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Internal Links", value: result.internalLinks, icon: Link, color: "text-emerald-400" },
              { label: "External Links", value: result.externalLinks, icon: Globe, color: "text-sky-400" },
              { label: "Images w/o Alt", value: result.imagesWithoutAlt, icon: Image, color: result.imagesWithoutAlt > 0 ? "text-red-400" : "text-emerald-400" },
              { label: "H1 Tags", value: (result.headings as Record<string, number> | undefined)?.h1 ?? 0, icon: Tag, color: (result.headings as Record<string, number> | undefined)?.h1 === 1 ? "text-emerald-400" : "text-red-400" },
            ].map((item) => (
              <Card key={item.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <item.icon className={`w-4 h-4 ${item.color} mb-2`} />
                  <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.issues.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Issues ({result.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {[...errors, ...warnings, ...infos].map((issue: SeoIssue, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3" data-testid={`row-issue-${i}`}>
                      <div className="mt-0.5 shrink-0">
                        <IssueBadge severity={issue.severity} />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{issue.message}</p>
                        {issue.element && (
                          <code className="text-xs text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded mt-1 inline-block">{issue.element}</code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a URL to audit its SEO performance</p>
        </div>
      )}
    </div>
  );
}
