import { useState } from "react";
import { Zap, TrendingUp, TrendingDown, Minus, HardDrive } from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRunSpeedTest } from "@workspace/api-client-react";
import type { SpeedTestResult } from "@workspace/api-client-react";

function RatingIcon({ rating }: { rating: string }) {
  if (rating === "good") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (rating === "needs_improvement") return <Minus className="w-4 h-4 text-yellow-400" />;
  return <TrendingDown className="w-4 h-4 text-red-400" />;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 90 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const pct = score / 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-black" style={{ color }}>{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

export default function Speed() {
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const mutation = useRunSpeedTest();

  const handleScan = (url: string) => {
    setResult(null);
    mutation.mutate({ data: { url } }, { onSuccess: (data) => setResult(data) });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Page Speed Test</h1>
            <p className="text-sm text-muted-foreground">Core Web Vitals, performance metrics, and resource analysis</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <URLInputBar onScan={handleScan} isLoading={mutation.isPending} placeholder="https://example.com" buttonText="Test Speed" />
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-mono mb-3">Fetching page and measuring performance metrics...</p>
            <Progress value={55} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <ScoreCircle score={result.overallScore} />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Performance Grade</p>
                <GradeBadge grade={result.grade} size="lg" />
              </div>
            </div>
            <ExportButtons data={result} title="Page Speed Report" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {result.metrics.map((metric, i) => (
              <Card key={i} className="bg-card border-border" data-testid={`card-metric-${i}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-semibold leading-tight">{metric.name}</p>
                    <RatingIcon rating={metric.rating} />
                  </div>
                  <p className="text-2xl font-black text-foreground mb-1">
                    {metric.value}{metric.unit && <span className="text-sm text-muted-foreground font-normal ml-1">{metric.unit}</span>}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      metric.rating === "good" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" :
                      metric.rating === "needs_improvement" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" :
                      "text-red-400 border-red-500/30 bg-red-500/5"
                    }`}
                  >
                    {metric.rating === "needs_improvement" ? "Needs Work" : metric.rating.charAt(0).toUpperCase() + metric.rating.slice(1)}
                  </Badge>
                  <Progress
                    value={metric.score}
                    className="mt-3 h-1"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4" />Resource Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Total Requests", value: result.resourceSummary.totalRequests },
                  { label: "Total Size", value: formatBytes(result.resourceSummary.totalSize) },
                  { label: "HTML", value: formatBytes(result.resourceSummary.htmlSize) },
                  { label: "CSS", value: formatBytes(result.resourceSummary.cssSize) },
                  { label: "JavaScript", value: formatBytes(result.resourceSummary.jsSize) },
                  { label: "Images", value: formatBytes(result.resourceSummary.imageSize) },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-lg font-black text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a URL to test its page speed and performance</p>
        </div>
      )}
    </div>
  );
}
