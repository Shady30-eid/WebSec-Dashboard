import { useState } from "react";
import { Search, Globe, CheckCircle, AlertTriangle, Loader2, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface SubdomainResult {
  subdomain: string;
  ip: string;
  ipv6?: string;
  httpStatus?: number;
  httpStatusText?: string;
  isWildcard: boolean;
}

interface ScanResult {
  domain: string;
  mainIp: string;
  wildcardDetected: boolean;
  wildcardIp: string | null;
  totalFound: number;
  realFound: number;
  subdomains: SubdomainResult[];
  scannedAt: string;
}

function statusColor(status?: number): string {
  if (!status) return "text-muted-foreground";
  if (status < 300) return "text-emerald-400";
  if (status < 400) return "text-yellow-400";
  if (status < 500) return "text-orange-400";
  return "text-red-400";
}

function statusBg(status?: number): string {
  if (!status) return "bg-secondary/30";
  if (status < 300) return "bg-emerald-500/5 border-emerald-500/20";
  if (status < 400) return "bg-yellow-500/5 border-yellow-500/20";
  if (status < 500) return "bg-orange-500/5 border-orange-500/20";
  return "bg-red-500/5 border-red-500/20";
}

export default function SubFinder() {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterWildcard, setFilterWildcard] = useState(true);

  const handleScan = async () => {
    const input = domain.trim();
    if (!input) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/subfinder/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: input }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Scan failed");
      }

      const data = await res.json() as ScanResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
  };

  const copyAll = () => {
    if (!result) return;
    const lines = visibleSubs.map(s => `${s.subdomain}\t${s.ip}\t${s.httpStatus ?? ""}`).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const visibleSubs = result?.subdomains.filter(s => !filterWildcard || !s.isWildcard) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">SubFinder</h1>
            <p className="text-sm text-muted-foreground">Discover all active subdomains for any domain — like subfinder</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pl-10 font-mono bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              onClick={handleScan}
              disabled={isLoading || !domain.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 shrink-0"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : "Find Subdomains"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Enter the domain without protocol — e.g. <span className="font-mono">google.com</span> or <span className="font-mono">example.co.uk</span></p>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-mono mb-3 animate-pulse">
              Probing {domain} — resolving DNS, checking HTTP status for each subdomain...
            </p>
            <Progress value={undefined} className="h-1.5 animate-pulse" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/5 border-red-500/20 mb-6">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Domain", value: result.domain, color: "text-foreground" },
              { label: "Main IP", value: result.mainIp || "—", color: "text-sky-400" },
              { label: "Subdomains Found", value: result.realFound.toString(), color: "text-teal-400" },
              { label: "Wildcard DNS", value: result.wildcardDetected ? "Detected" : "None", color: result.wildcardDetected ? "text-yellow-400" : "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-sm font-bold font-mono ${color} truncate`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.wildcardDetected && (
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent className="pt-3 pb-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-400">Wildcard DNS detected</p>
                  <p className="text-xs text-muted-foreground">All subdomains resolve to <span className="font-mono">{result.wildcardIp}</span> — results marked as wildcard may be false positives.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Table */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Subdomains
                  <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/5 font-mono">
                    {visibleSubs.length} results
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {result.wildcardDetected && (
                    <button
                      onClick={() => setFilterWildcard(f => !f)}
                      className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${filterWildcard ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-secondary border-border text-muted-foreground"}`}
                    >
                      {filterWildcard ? "Hiding wildcards" : "Showing wildcards"}
                    </button>
                  )}
                  <button
                    onClick={copyAll}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy all"}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6 text-center">No active subdomains found</p>
              ) : (
                <div className="divide-y divide-border/50 max-h-[32rem] overflow-auto">
                  {visibleSubs.map((sub, i) => (
                    <div
                      key={i}
                      className={`px-4 py-3 flex items-center gap-3 border-l-2 ${sub.isWildcard ? "border-l-yellow-500/50 opacity-70" : "border-l-teal-500/50"}`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${sub.isWildcard ? "text-yellow-400" : "text-teal-400"}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-foreground">{sub.subdomain}</span>
                          {sub.isWildcard && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30 bg-yellow-500/5">wildcard</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{sub.ip}</span>
                          {sub.ipv6 && <span className="text-xs font-mono text-muted-foreground/60 hidden sm:block truncate max-w-[160px]">{sub.ipv6}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sub.httpStatus && (
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${statusBg(sub.httpStatus)} ${statusColor(sub.httpStatus)}`}>
                            {sub.httpStatus}
                          </span>
                        )}
                        <a
                          href={`https://${sub.subdomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a domain to discover all active subdomains</p>
          <p className="text-xs mt-1 opacity-60">Probes {150}+ common subdomain names via DNS + HTTP</p>
        </div>
      )}
    </div>
  );
}
