import { useState, useEffect, useRef } from "react";
import { Shield, CheckCircle, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { URLInputBar } from "@/components/shared/URLInputBar";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useRunWafTest } from "@workspace/api-client-react";
import type { WafTestResult, WafPayloadResult } from "@workspace/api-client-react";

const CATEGORIES = [
  { id: "sqli", label: "SQL Injection", color: "text-red-400" },
  { id: "xss", label: "XSS", color: "text-orange-400" },
  { id: "cmd_injection", label: "Command Injection", color: "text-yellow-400" },
  { id: "path_traversal", label: "Path Traversal", color: "text-violet-400" },
  { id: "xxe", label: "XXE", color: "text-pink-400" },
  { id: "ssrf", label: "SSRF", color: "text-sky-400" },
  { id: "lfi", label: "LFI", color: "text-lime-400" },
  { id: "rfi", label: "RFI", color: "text-emerald-400" },
] as const;

function StatusBadge({ status }: { status: string }) {
  if (status === "blocked") return (
    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-xs">
      <CheckCircle className="w-3 h-3 mr-1" />BLOCKED
    </Badge>
  );
  if (status === "passed") return (
    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs">
      <XCircle className="w-3 h-3 mr-1" />PASSED
    </Badge>
  );
  return (
    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-mono text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />ERROR
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find(c => c.id === category);
  return (
    <Badge variant="outline" className={`text-xs font-mono ${cat?.color ?? "text-muted-foreground"} border-current/30 bg-current/5`}>
      {cat?.label ?? category}
    </Badge>
  );
}

export default function WafChecker() {
  const [result, setResult] = useState<WafTestResult | null>(null);
  const [displayedResults, setDisplayedResults] = useState<WafPayloadResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [showAll, setShowAll] = useState(false);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutation = useRunWafTest();

  useEffect(() => {
    if (result && result.results.length > 0) {
      let idx = 0;
      const total = result.results.length;
      animRef.current = setInterval(() => {
        idx = Math.min(idx + 3, total);
        setDisplayedResults(result.results.slice(0, idx));
        setProgress(Math.round((idx / total) * 100));
        if (idx >= total) {
          if (animRef.current) clearInterval(animRef.current);
        }
      }, 40);
      return () => { if (animRef.current) clearInterval(animRef.current); };
    }
  }, [result]);

  const handleScan = (url: string) => {
    setResult(null);
    setDisplayedResults([]);
    setProgress(0);
    setShowAll(false);
    mutation.mutate(
      { data: { url, categories: selectedCategories as ("sqli" | "xss" | "cmd_injection" | "path_traversal" | "xxe" | "ssrf" | "lfi" | "rfi")[] } },
      { onSuccess: (data) => setResult(data) }
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const visibleResults = showAll ? displayedResults : displayedResults.slice(0, 50);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">WAF Checker</h1>
            <p className="text-sm text-muted-foreground">Fire attack payloads and check what your WAF blocks</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <URLInputBar
            onScan={handleScan}
            isLoading={mutation.isPending}
            placeholder="https://target-website.com"
            buttonText="Launch Attack"
          />
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Payload Categories</p>
            <div className="flex flex-wrap gap-4">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cat.id}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                    data-testid={`checkbox-category-${cat.id}`}
                  />
                  <Label htmlFor={cat.id} className={`text-sm cursor-pointer ${cat.color}`}>
                    {cat.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm text-muted-foreground font-mono">Firing payloads... this takes 20-60 seconds</span>
            </div>
            <Progress value={30} className="h-1.5 bg-secondary" />
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="bg-card border-border col-span-2 md:col-span-1">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Grade</p>
                <GradeBadge grade={result.grade} size="lg" />
              </CardContent>
            </Card>
            {[
              { label: "Total", value: result.totalPayloads, color: "text-foreground" },
              { label: "Blocked", value: result.blocked, color: "text-emerald-400" },
              { label: "Passed", value: result.passed, color: "text-red-400" },
              { label: "Block Rate", value: `${result.blockRate}%`, color: "text-sky-400" },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Payload Results ({displayedResults.length}/{result.totalPayloads})
                </CardTitle>
                <div className="flex items-center gap-3">
                  {progress < 100 && (
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="w-24 h-1.5 bg-secondary" />
                      <span className="text-xs text-muted-foreground font-mono">{progress}%</span>
                    </div>
                  )}
                  <ExportButtons data={result} title="WAF Test Report" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-24">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-36">Category</th>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Payload</th>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-20">Code</th>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-20">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {visibleResults.map((r) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-secondary/30 transition-colors ${r.blocked ? "bg-emerald-500/3" : r.status === "passed" ? "bg-red-500/3" : ""}`}
                        data-testid={`row-payload-${r.id}`}
                      >
                        <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-2.5"><CategoryBadge category={r.category} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-xs truncate" title={r.payload}>{r.payload}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.statusCode ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.responseTime != null ? `${r.responseTime}ms` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {displayedResults.length > 50 && (
                <div className="border-t border-border px-4 py-3">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                    data-testid="button-toggle-show-all"
                  >
                    {showAll ? (
                      <><ChevronUp className="w-3 h-3" />Show less</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" />Show all {displayedResults.length} results</>
                    )}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!result && !mutation.isPending && (
        <div className="text-center py-20 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a target URL and click Launch Attack to begin WAF testing</p>
        </div>
      )}
    </div>
  );
}
