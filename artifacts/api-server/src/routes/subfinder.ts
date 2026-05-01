import { Router } from "express";
import { z } from "zod";
import dns from "node:dns/promises";
import https from "node:https";

const router = Router();

const RequestSchema = z.object({
  domain: z.string().min(3),
});

const WORDLIST = [
  // Infrastructure
  "www", "www1", "www2", "www3", "www4", "web", "web1", "web2",
  "mail", "mail1", "mail2", "mail3", "smtp", "smtp1", "smtp2", "pop", "pop3", "imap",
  "webmail", "email", "mx", "mx1", "mx2", "mx3", "relay", "bounce",
  "ns1", "ns2", "ns3", "ns4", "ns5", "dns", "dns1", "dns2", "dns3",
  "ftp", "ftp1", "ftp2", "sftp", "ftps",
  "cpanel", "whm", "webdisk", "cPanel", "plesk", "directadmin",
  "autodiscover", "autoconfig", "lyncdiscover",

  // API & Backend
  "api", "api1", "api2", "api3", "api4", "api-v1", "api-v2", "api-v3",
  "rest", "graphql", "grpc", "rpc", "gateway", "gw", "proxy",
  "backend", "server", "service", "services", "microservice",
  "webhook", "hooks", "events", "queue", "worker",

  // Applications
  "app", "app1", "app2", "apps", "application", "webapp", "web-app",
  "portal", "dashboard", "panel", "control", "console", "admin",
  "admin1", "admin2", "admin3", "administrator", "superadmin",
  "manager", "manage", "management", "cp",

  // Development environments
  "dev", "dev1", "dev2", "dev3", "development", "develop",
  "staging", "stage", "stage1", "staging1", "staging2",
  "uat", "qa", "qa1", "qa2", "test", "test1", "test2", "testing",
  "demo", "demo1", "demo2", "sandbox", "sandbox1",
  "preview", "preprod", "pre-prod", "pre", "beta", "beta1", "beta2",
  "alpha", "canary", "lab", "labs", "experimental", "rc",
  "int", "integration", "local",

  // Content
  "blog", "blog1", "news", "press", "media", "content",
  "wiki", "docs", "documentation", "help", "faq", "kb", "knowledge",
  "forum", "forums", "community", "social", "bbs", "discuss",
  "support", "helpdesk", "ticket", "tickets", "desk",
  "chat", "irc", "slack", "teams", "messaging",
  "video", "videos", "stream", "live", "tv", "radio", "podcast",
  "images", "img", "image", "photo", "photos", "gallery", "media1",
  "files", "upload", "uploads", "download", "downloads",

  // E-commerce
  "shop", "shop1", "store", "market", "marketplace",
  "cart", "checkout", "order", "orders", "product", "products",
  "pay", "payment", "payments", "billing", "invoice", "receipt",
  "checkout2", "buy", "purchase",

  // CDN & Static
  "cdn", "cdn1", "cdn2", "cdn3", "assets", "asset",
  "static", "static1", "static2", "resources", "res", "s3",
  "object", "storage", "bucket", "edge",

  // Mobile
  "m", "mobile", "mob", "wap", "touch", "pwa",

  // VPN & Remote
  "vpn", "vpn1", "vpn2", "remote", "rdp", "citrix",
  "sso", "auth", "oauth", "login", "signin", "signup",
  "id", "identity", "accounts", "account",

  // DevOps & Monitoring
  "git", "gitlab", "github", "bitbucket", "svn", "repo", "code",
  "ci", "cd", "jenkins", "travis", "drone", "build",
  "monitor", "monitoring", "metrics", "grafana", "kibana", "elk",
  "logs", "log", "logging", "syslog",
  "prometheus", "alertmanager", "zabbix", "nagios", "datadog",
  "health", "status", "uptime", "ping",
  "docker", "kubernetes", "k8s", "registry", "harbor",
  "sonar", "sonarqube", "nexus", "artifactory",

  // Databases
  "db", "db1", "db2", "database", "mysql", "postgres", "postgresql",
  "mongo", "mongodb", "redis", "elastic", "elasticsearch",
  "oracle", "mssql", "mariadb", "cassandra", "influx",
  "phpmyadmin", "adminer", "pgadmin",

  // Communication
  "smtp2", "noreply", "no-reply", "postmaster", "hostmaster", "abuse",
  "newsletter", "mailing", "campaign", "mailchimp",

  // Analytics & Marketing
  "analytics", "stats", "statistics", "tracking", "track",
  "marketing", "ads", "ad", "advertising", "promo", "promotions",
  "events", "event", "webinar", "conference",
  "seo", "search",

  // Business
  "crm", "erp", "hr", "hrm", "hris", "finance", "accounting",
  "sales", "operations", "ops", "legal", "compliance",
  "intranet", "extranet", "internal", "corporate", "corp",
  "office", "workspace",
  "partner", "partners", "affiliate", "affiliates", "reseller",
  "customer", "customers", "client", "clients",
  "vendor", "vendors", "supplier",

  // Microsoft / Office365
  "owa", "exchange", "sharepoint", "outlook",
  "lync", "skype", "office365",

  // Hosting infrastructure
  "aws", "azure", "gcp", "cloud", "cluster",
  "lb", "loadbalancer", "ha", "failover",
  "fw", "firewall", "router", "switch",
  "scan", "scanner", "printer", "cam", "camera",

  // Geographic
  "us", "eu", "uk", "asia", "global", "worldwide",
  "us1", "us2", "eu1", "eu2", "ap", "ap1",
  "east", "west", "north", "south",

  // Languages / Regions
  "en", "ar", "fr", "de", "es", "it", "ru", "cn", "jp",
  "br", "pt", "nl", "pl", "tr", "ko", "hi",

  // Archive / Backup
  "old", "old1", "legacy", "archive", "backup", "backup1",
  "new", "new1", "tmp", "temp", "staging-old",

  // Security
  "ssl", "secure", "safe", "waf", "security",
  "vpn2", "bastion", "jump", "jumphost",
  "siem", "ids", "ips", "threat",

  // Misc common
  "sitemap", "robots", "crossdomain", "clientaccesspolicy",
  "socket", "ws", "wss", "mqtt", "broker",
  "mobile-api", "public", "private", "open", "test-api",
  "report", "reports", "reporting", "bi", "datawarehouse",
  "map", "maps", "geo", "location", "places",
  "pay2", "stripe", "paypal",
  "cdn-assets", "assets2", "media2",
  "api-docs", "swagger", "openapi",
  "relay2", "data", "data1", "data2",
  "connect", "integrations", "webhooks",
  "v1", "v2", "v3", "version",
  "home", "index", "main", "default",
  "live", "prod", "production", "prd",
  "test3", "dev4", "stage2", "uat2",
  "cdn4", "cdn5", "assets3",
  "api4", "api5", "api6",
  "admin4", "admin5",
];

interface SubdomainResult {
  subdomain: string;
  ip: string;
  ipv6?: string;
  httpStatus?: number;
  httpStatusText?: string;
  isWildcard: boolean;
  source: "dns-bruteforce" | "hackertarget";
}

function httpsGet(url: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "SecurityToolkit/1.0" } }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => { data += chunk; });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error("timeout")); });
  });
}

async function fetchHackerTarget(domain: string): Promise<string[]> {
  try {
    const body = await httpsGet(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
    if (!body || body.includes("error") || body.includes("API count exceeded")) return [];
    const found = new Set<string>();
    for (const line of body.split("\n")) {
      const [host] = line.split(",");
      const clean = host?.trim().toLowerCase();
      if (clean && clean.endsWith(`.${domain}`) && !clean.startsWith("*")) {
        found.add(clean);
      }
    }
    return Array.from(found);
  } catch {
    return [];
  }
}

async function checkWildcard(domain: string): Promise<string | null> {
  const random = `wildcard-xxxxcheck-${Date.now()}.${domain}`;
  try {
    const ips = await dns.resolve4(random);
    return ips[0] ?? null;
  } catch {
    return null;
  }
}

async function resolveSubdomain(
  host: string,
  wildcardIp: string | null,
  source: SubdomainResult["source"]
): Promise<SubdomainResult | null> {
  let ip = "";
  let ipv6 = "";

  try {
    const ips4 = await dns.resolve4(host);
    ip = ips4[0] ?? "";
  } catch {
    return null;
  }

  try {
    const ips6 = await dns.resolve6(host);
    ipv6 = ips6[0] ?? "";
  } catch {}

  const isWildcard = wildcardIp !== null && ip === wildcardIp;

  let httpStatus: number | undefined;
  let httpStatusText: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`https://${host}`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "SecurityToolkit/1.0" },
      });
      httpStatus = res.status;
      httpStatusText = statusLabel(res.status);
    } catch {
      try {
        const res2 = await fetch(`http://${host}`, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "SecurityToolkit/1.0" },
        });
        httpStatus = res2.status;
        httpStatusText = statusLabel(res2.status);
      } catch {}
    } finally {
      clearTimeout(timer);
    }
  } catch {}

  return { subdomain: host, ip, ipv6: ipv6 || undefined, httpStatus, httpStatusText, isWildcard, source };
}

function statusLabel(code: number): string {
  const m: Record<number, string> = {
    200: "OK", 201: "Created", 204: "No Content",
    301: "Moved Permanently", 302: "Found", 303: "See Other",
    307: "Temporary Redirect", 308: "Permanent Redirect",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
    404: "Not Found", 405: "Not Allowed", 429: "Too Many Requests",
    500: "Server Error", 502: "Bad Gateway", 503: "Unavailable", 504: "Timeout",
  };
  return m[code] ?? String(code);
}

router.post("/subfinder/scan", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  let domain = parsed.data.domain.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  if (!domain.includes(".")) {
    return res.status(400).json({ error: "Please enter a valid domain (e.g. example.com)" });
  }

  const [mainIps, wildcardIp, htSubs] = await Promise.all([
    dns.resolve4(domain).catch(() => [] as string[]),
    checkWildcard(domain),
    fetchHackerTarget(domain),
  ]);

  const mainIp = mainIps[0] ?? "";

  // Build deduplicated candidate list
  const candidates = new Map<string, SubdomainResult["source"]>();

  // From HackerTarget passive recon (highest quality source)
  for (const sub of htSubs) {
    if (sub !== domain) candidates.set(sub, "hackertarget");
  }

  // From wordlist brute-force
  for (const word of WORDLIST) {
    const host = `${word}.${domain}`;
    if (!candidates.has(host)) candidates.set(host, "dns-bruteforce");
  }

  // Resolve all candidates in parallel batches
  const BATCH = 30;
  const entries = Array.from(candidates.entries());
  const found: SubdomainResult[] = [];

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(([host, source]) => resolveSubdomain(host, wildcardIp, source))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        found.push(r.value);
      }
    }
  }

  // Sort: HackerTarget sources first, then by subdomain name
  found.sort((a, b) => {
    if (a.source === "hackertarget" && b.source !== "hackertarget") return -1;
    if (a.source !== "hackertarget" && b.source === "hackertarget") return 1;
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
    ctFound: found.filter(f => f.source === "hackertarget").length,
    bruteFound: found.filter(f => f.source === "dns-bruteforce").length,
    subdomains: found,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
