import { useState } from "react";
import { Lock, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRunHeadersAudit } from "@workspace/api-client-react";
import type { HeadersAuditResult } from "@workspace/api-client-react";

export default function Headers() {
  const [result, setResult] = useState<HeadersAuditResult | null>(null);
  const mutation = useRunHeadersAudit();

  const handleScan = (url: string) => {
    setResult(null);
    mutation.mutate({ data: { url } }, { onSuccess: (data) => setResult(data) });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Security Headers Audit</h1>
            <p className="text-sm text-muted-foreground">Audit HTTP security headers and receive a grade from A+ to F</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <URLInputBar onScan={handleScan} isLoading={mutation.isPending} placeholder="https://example.com" buttonText="Audit Headers" />
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-mono mb-3">Fetching and analyzing security headers...</p>
            <Progress value={60} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall Grade</p>
                <GradeBadge grade={result.grade} size="xl" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="text-3xl font-black text-foreground">{result.score}<span className="text-base text-muted-foreground font-normal">/{result.maxScore}</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Headers Analyzed</p>
                <p className="text-3xl font-black text-foreground">{result.headers.length}</p>
              </div>
            </div>
            <ExportButtons data={result} title="Security Headers Report" />
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Header Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {result.headers.map((header, i) => (
                  <div key={i} className="px-4 py-4" data-testid={`row-header-${i}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {header.present && header.score >= header.maxScore * 0.8 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : header.present ? (
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className="text-sm font-bold text-foreground font-mono">{header.name}</span>
                          <Badge variant="outline" className={`text-xs ${
                            header.grade.startsWith("A") ? "text-emerald-400 border-emerald-500/30" :
                            header.grade.startsWith("B") ? "text-lime-400 border-lime-500/30" :
                            header.grade.startsWith("C") ? "text-yellow-400 border-yellow-500/30" :
                            header.grade.startsWith("D") ? "text-orange-400 border-orange-500/30" :
                            "text-red-400 border-red-500/30"
                          } bg-current/5`}>
                            {header.grade}
                          </Badge>
                          {!header.present && (
                            <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/5">Missing</Badge>
                          )}
                        </div>
                        {header.value && (
                          <p className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded mb-2 break-all border border-border/50">
                            {header.value}
                          </p>
                        )}
                        <div className="flex items-start gap-2">
                          <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{header.recommendation}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">{header.score}/{header.maxScore}</span>
                        <Progress value={(header.score / header.maxScore) * 100} className="w-20 h-1.5 mt-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a URL to audit its HTTP security headers</p>
        </div>
      )}
    </div>
  );
}
