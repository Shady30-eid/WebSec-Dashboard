import { Router } from "express";
import { z } from "zod";
import dns from "node:dns/promises";

const router = Router();

const RequestSchema = z.object({
  domain: z.string().min(3),
});

const WORDLIST = [
  "www", "mail", "ftp", "smtp", "pop", "imap", "webmail", "email",
  "ns1", "ns2", "ns3", "ns4", "dns", "dns1", "dns2", "mx", "mx1", "mx2",
  "cpanel", "whm", "webdisk", "autodiscover", "autoconfig",
  "admin", "administrator", "portal", "dashboard", "panel", "control",
  "api", "api2", "api-v1", "api-v2", "rest", "graphql", "gateway",
  "app", "apps", "application", "webapp", "web", "www2", "www1",
  "dev", "dev2", "development", "staging", "stage", "uat", "qa", "test", "testing",
  "demo", "sandbox", "preview", "preprod", "beta", "alpha", "canary",
  "blog", "news", "media", "press", "wiki", "docs", "documentation", "help",
  "support", "helpdesk", "ticket", "kb", "knowledge",
  "shop", "store", "cart", "checkout", "pay", "payment", "billing", "invoice",
  "cdn", "cdn2", "assets", "static", "images", "img", "files", "upload",
  "video", "videos", "stream", "media", "m", "mobile", "wap",
  "vpn", "remote", "rdp", "ssh", "sftp", "git", "svn", "repo", "code",
  "db", "database", "mysql", "postgres", "mongo", "redis", "cache",
  "forum", "community", "social", "chat", "irc", "slack",
  "analytics", "stats", "tracking", "monitor", "metrics", "grafana", "kibana",
  "ci", "cd", "jenkins", "gitlab", "github", "bitbucket", "sonar",
  "intranet", "internal", "extranet", "corporate", "corp",
  "old", "new", "legacy", "backup", "archive", "tmp", "temp",
  "search", "calendar", "map", "maps", "geo", "location",
  "login", "auth", "oauth", "sso", "saml", "id", "identity", "accounts",
  "marketing", "ads", "newsletter", "promo", "events",
  "en", "ar", "fr", "de", "es", "it", "ru", "cn", "jp", "br", "pt",
  "us", "uk", "eu", "asia", "global", "worldwide",
  "aws", "azure", "gcp", "cloud", "k8s", "kubernetes", "docker",
  "proxy", "fw", "firewall", "router", "switch", "gateway", "lb", "loadbalancer",
  "health", "status", "ping", "uptime", "nagios", "zabbix",
  "smtp2", "mail2", "mail3", "relay", "bounce", "noreply", "no-reply",
  "forum2", "store2", "api3", "test2", "dev3", "staging2",
  "office365", "autodiscover2", "lyncdiscover", "sip", "voip",
  "download", "downloads", "update", "updates", "releases",
  "partner", "partners", "affiliates", "reseller",
  "customer", "customers", "client", "clients", "users",
  "admin2", "superadmin", "sysadmin", "webadmin", "manager",
  "crm", "erp", "hr", "finance", "sales", "operations",
  "exchange", "owa", "sharepoint", "teams", "lync", "skype",
  "printer", "scan", "scanner", "copier", "cam", "camera",
  "report", "reports", "reporting", "dashboard2", "bi", "datawarehouse",
  "ftp2", "sftp2", "transfer", "data",
  "dev-api", "api-dev", "staging-api", "api-staging", "test-api",
  "vpn2", "ssl", "secure", "safe",
];

interface SubdomainResult {
  subdomain: string;
  ip: string;
  ipv6?: string;
  httpStatus?: number;
  httpStatusText?: string;
  isWildcard: boolean;
}

async function checkWildcard(domain: string): Promise<string | null> {
  const randomSub = `wildcard-check-${Date.now()}.${domain}`;
  try {
    const ips = await dns.resolve4(randomSub);
    return ips[0] ?? null;
  } catch {
    return null;
  }
}

async function probeSubdomain(sub: string, domain: string, wildcardIp: string | null): Promise<SubdomainResult | null> {
  const full = `${sub}.${domain}`;
  let ip = "";
  let ipv6 = "";

  try {
    const ips4 = await dns.resolve4(full);
    ip = ips4[0] ?? "";
  } catch {
    return null;
  }

  try {
    const ips6 = await dns.resolve6(full);
    ipv6 = ips6[0] ?? "";
  } catch {}

  const isWildcard = wildcardIp !== null && ip === wildcardIp;

  let httpStatus: number | undefined;
  let httpStatusText: string | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`https://${full}`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "SubFinder/1.0" },
      });
      httpStatus = res.status;
      httpStatusText = res.statusText || statusText(res.status);
    } catch {
      try {
        const res2 = await fetch(`http://${full}`, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "SubFinder/1.0" },
        });
        httpStatus = res2.status;
        httpStatusText = res2.statusText || statusText(res2.status);
      } catch {}
    } finally {
      clearTimeout(timeout);
    }
  } catch {}

  return { subdomain: full, ip, ipv6: ipv6 || undefined, httpStatus, httpStatusText, isWildcard };
}

function statusText(code: number): string {
  const map: Record<number, string> = {
    200: "OK", 301: "Moved Permanently", 302: "Found", 303: "See Other",
    307: "Temporary Redirect", 308: "Permanent Redirect", 400: "Bad Request",
    401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
    429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway",
    503: "Service Unavailable", 504: "Gateway Timeout",
  };
  return map[code] ?? "";
}

router.post("/subfinder/scan", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  let domain = parsed.data.domain.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  if (!domain.includes(".")) {
    return res.status(400).json({ error: "Please enter a valid domain name (e.g. example.com)" });
  }

  let mainIp = "";
  try {
    const ips = await dns.resolve4(domain).catch(() => []);
    mainIp = ips[0] ?? "";
  } catch {}

  const wildcardIp = await checkWildcard(domain);

  const batchSize = 20;
  const found: SubdomainResult[] = [];

  for (let i = 0; i < WORDLIST.length; i += batchSize) {
    const batch = WORDLIST.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(sub => probeSubdomain(sub, domain, wildcardIp))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        found.push(r.value);
      }
    }
  }

  found.sort((a, b) => {
    if (!a.isWildcard && b.isWildcard) return -1;
    if (a.isWildcard && !b.isWildcard) return 1;
    return a.subdomain.localeCompare(b.subdomain);
  });

  return res.json({
    domain,
    mainIp,
    wildcardDetected: wildcardIp !== null,
    wildcardIp: wildcardIp ?? null,
    totalFound: found.length,
    realFound: found.filter(f => !f.isWildcard).length,
    subdomains: found,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
