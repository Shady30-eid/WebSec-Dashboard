import { Router } from "express";
import { z } from "zod";
import dns from "node:dns/promises";

const router = Router();

const RequestSchema = z.object({
  url: z.string().url(),
});

const COMMON_SUBDOMAINS = [
  "www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "webdisk",
  "ns2", "cpanel", "whm", "autodiscover", "autoconfig", "m", "imap", "test",
  "ns", "blog", "pop3", "dev", "www2", "admin", "forum", "news", "vpn", "ns3",
  "mail2", "new", "mysql", "old", "lists", "support", "mobile", "mx", "static",
  "docs", "beta", "shop", "sql", "secure", "demo", "cp", "calendar", "wiki",
  "web", "media", "email", "images", "img", "www1", "intranet", "portal", "video",
  "sip", "dns2", "api", "cdn", "app", "staging", "dev2", "uat", "qa",
];

const COMMON_TLDS = [
  "com", "net", "org", "io", "co", "info", "biz", "edu", "gov", "int",
  "co.uk", "co.au", "co.nz", "co.za", "co.in", "co.jp", "co.kr",
  "de", "fr", "es", "it", "nl", "ru", "jp", "cn", "br", "au",
  "ca", "mx", "in", "pl", "se", "no", "dk", "fi", "be", "at",
  "ch", "nz", "sg", "hk", "tw", "kr", "ar", "za", "ie", "pt",
  "gr", "hu", "cz", "ro", "tr", "ua", "pk", "ng", "eg", "ma",
  "app", "dev", "tech", "ai", "cloud", "online", "site", "store",
];

async function detectTechStack(url: string, responseHeaders: Record<string, string>, htmlContent: string): Promise<Array<{name: string; category: string; version?: string; confidence: number}>> {
  const stack: Array<{name: string; category: string; version?: string; confidence: number}> = [];
  const headersLower = Object.fromEntries(Object.entries(responseHeaders).map(([k,v]) => [k.toLowerCase(), v.toLowerCase()]));
  const htmlLower = htmlContent.toLowerCase();

  const server = headersLower["server"] || "";
  if (server.includes("nginx")) {
    const v = server.match(/nginx\/([\d.]+)/)?.[1];
    stack.push({ name: "Nginx", category: "Web Server", version: v, confidence: 99 });
  }
  if (server.includes("apache")) {
    const v = server.match(/apache\/([\d.]+)/)?.[1];
    stack.push({ name: "Apache", category: "Web Server", version: v, confidence: 99 });
  }
  if (server.includes("microsoft-iis") || server.includes("iis")) {
    const v = server.match(/iis\/([\d.]+)/)?.[1];
    stack.push({ name: "IIS", category: "Web Server", version: v, confidence: 99 });
  }
  if (server.includes("cloudflare")) {
    stack.push({ name: "Cloudflare", category: "CDN", confidence: 95 });
  }
  if (headersLower["cf-ray"]) {
    if (!stack.find(s => s.name === "Cloudflare")) {
      stack.push({ name: "Cloudflare", category: "CDN", confidence: 99 });
    }
  }
  if (headersLower["x-powered-by"]?.includes("php")) {
    const v = headersLower["x-powered-by"].match(/php\/([\d.]+)/)?.[1];
    stack.push({ name: "PHP", category: "Programming Language", version: v, confidence: 99 });
  }
  if (headersLower["x-powered-by"]?.includes("asp.net")) {
    stack.push({ name: "ASP.NET", category: "Framework", confidence: 99 });
  }
  if (htmlContent.includes("wp-content") || htmlContent.includes("wp-includes")) {
    const v = htmlContent.match(/wp-emoji-release\.min\.js\?ver=([\d.]+)/)?.[1];
    stack.push({ name: "WordPress", category: "CMS", version: v, confidence: 95 });
  }
  if (htmlContent.includes("Drupal") || htmlContent.includes("/sites/default/files/")) {
    stack.push({ name: "Drupal", category: "CMS", confidence: 85 });
  }
  if (htmlLower.includes("joomla")) {
    stack.push({ name: "Joomla", category: "CMS", confidence: 80 });
  }
  if (htmlLower.includes("shopify")) {
    stack.push({ name: "Shopify", category: "E-Commerce", confidence: 90 });
  }
  if (htmlLower.includes("react") || htmlContent.includes("__REACT_")) {
    stack.push({ name: "React", category: "JavaScript Framework", confidence: 75 });
  }
  if (htmlContent.includes("ng-version") || htmlContent.includes("ng-app")) {
    stack.push({ name: "Angular", category: "JavaScript Framework", confidence: 80 });
  }
  if (htmlLower.includes("vue.js") || htmlContent.includes("__vue__")) {
    stack.push({ name: "Vue.js", category: "JavaScript Framework", confidence: 80 });
  }
  if (htmlLower.includes("next.js") || htmlContent.includes("__NEXT_DATA__")) {
    stack.push({ name: "Next.js", category: "JavaScript Framework", confidence: 90 });
  }
  if (headersLower["x-vercel-id"] || headersLower["x-vercel-cache"]) {
    stack.push({ name: "Vercel", category: "Hosting", confidence: 99 });
  }
  if (headersLower["x-amz-cf-id"] || headersLower["x-amz-cf-pop"]) {
    stack.push({ name: "AWS CloudFront", category: "CDN", confidence: 95 });
  }
  if (headersLower["x-github-request-id"]) {
    stack.push({ name: "GitHub Pages", category: "Hosting", confidence: 95 });
  }
  if (headersLower["x-fastly-request-id"]) {
    stack.push({ name: "Fastly", category: "CDN", confidence: 95 });
  }

  return stack;
}

async function resolveDns(domain: string): Promise<Array<{type: string; value: string; ttl?: number}>> {
  const records: Array<{type: string; value: string; ttl?: number}> = [];

  const attempts: Array<[string, () => Promise<void>]> = [
    ["A", async () => {
      try {
        const r = await dns.resolve4(domain);
        r.forEach(ip => records.push({ type: "A", value: ip }));
      } catch {}
    }],
    ["AAAA", async () => {
      try {
        const r = await dns.resolve6(domain);
        r.forEach(ip => records.push({ type: "AAAA", value: ip }));
      } catch {}
    }],
    ["MX", async () => {
      try {
        const r = await dns.resolveMx(domain);
        r.forEach(mx => records.push({ type: "MX", value: `${mx.priority} ${mx.exchange}` }));
      } catch {}
    }],
    ["NS", async () => {
      try {
        const r = await dns.resolveNs(domain);
        r.forEach(ns => records.push({ type: "NS", value: ns }));
      } catch {}
    }],
    ["TXT", async () => {
      try {
        const r = await dns.resolveTxt(domain);
        r.forEach(txt => records.push({ type: "TXT", value: txt.join(" ") }));
      } catch {}
    }],
    ["CNAME", async () => {
      try {
        const r = await dns.resolveCname(domain);
        r.forEach(cname => records.push({ type: "CNAME", value: cname }));
      } catch {}
    }],
    ["SOA", async () => {
      try {
        const r = await dns.resolveSoa(domain);
        records.push({ type: "SOA", value: `${r.nsname} ${r.hostmaster} ${r.serial}` });
      } catch {}
    }],
  ];

  await Promise.all(attempts.map(([, fn]) => fn()));
  return records;
}

async function discoverSubdomains(domain: string): Promise<Array<{subdomain: string; ip?: string; status: string}>> {
  const results: Array<{subdomain: string; ip?: string; status: string}> = [];

  const checks = COMMON_SUBDOMAINS.map(async (sub) => {
    const full = `${sub}.${domain}`;
    try {
      const addresses = await dns.resolve4(full);
      return { subdomain: full, ip: addresses[0], status: "active" };
    } catch {
      return null;
    }
  });

  const resolved = await Promise.allSettled(checks);
  for (const result of resolved) {
    if (result.status === "fulfilled" && result.value !== null) {
      results.push(result.value);
    }
  }

  return results;
}

function extractBaseDomain(hostname: string): { name: string; currentTld: string } {
  const parts = hostname.split(".");
  if (parts.length <= 1) return { name: hostname, currentTld: "" };

  const secondLevelTlds = ["co.uk", "co.au", "co.nz", "co.za", "co.in", "co.jp", "co.kr",
    "com.au", "com.br", "com.mx", "com.ar", "com.sg", "com.hk", "com.tw"];

  const last2 = parts.slice(-2).join(".");
  if (secondLevelTlds.includes(last2) && parts.length >= 3) {
    return { name: parts.slice(0, -2).join("."), currentTld: last2 };
  }

  return { name: parts.slice(0, -1).join("."), currentTld: parts[parts.length - 1]! };
}

async function findRelatedDomains(hostname: string): Promise<Array<{domain: string; ip?: string; registered: boolean; tld: string}>> {
  const { name, currentTld } = extractBaseDomain(hostname);

  const tldsToCheck = COMMON_TLDS.filter(tld => tld !== currentTld).slice(0, 40);

  const checks = tldsToCheck.map(async (tld) => {
    const candidate = `${name}.${tld}`;
    try {
      const addresses = await dns.resolve4(candidate);
      return { domain: candidate, ip: addresses[0], registered: true, tld };
    } catch {
      return { domain: candidate, registered: false, tld };
    }
  });

  const results = await Promise.allSettled(checks);
  const found: Array<{domain: string; ip?: string; registered: boolean; tld: string}> = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      found.push(r.value);
    }
  }

  return found.sort((a, b) => {
    if (a.registered && !b.registered) return -1;
    if (!a.registered && b.registered) return 1;
    return 0;
  });
}

function buildOsintLinks(domain: string, ip: string): Array<{name: string; url: string; category: string; description: string}> {
  const links = [
    { name: "Shodan", url: `https://www.shodan.io/host/${ip}`, category: "IP Intelligence", description: "Open ports, services & vulnerabilities" },
    { name: "Censys", url: `https://search.censys.io/hosts/${ip}`, category: "IP Intelligence", description: "Internet-wide scanning database" },
    { name: "VirusTotal (IP)", url: `https://www.virustotal.com/gui/ip-address/${ip}`, category: "IP Intelligence", description: "Malicious activity & reputation" },
    { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${ip}`, category: "IP Intelligence", description: "IP abuse reports & blacklists" },
    { name: "IPinfo", url: `https://ipinfo.io/${ip}`, category: "IP Intelligence", description: "Geolocation, ASN & hosting info" },
    { name: "GreyNoise", url: `https://www.greynoise.io/viz/ip/${ip}`, category: "IP Intelligence", description: "Internet noise & scanner activity" },
    { name: "ThreatBook", url: `https://threatbook.io/ip/${ip}`, category: "IP Intelligence", description: "Threat intelligence & IOCs" },
    { name: "IPVoid", url: `https://www.ipvoid.com/ip-blacklist-check/?ip=${ip}`, category: "IP Intelligence", description: "Multi-blacklist checker" },

    { name: "WHOIS", url: `https://who.is/whois/${domain}`, category: "Domain Intelligence", description: "Registrar, owner & registration dates" },
    { name: "VirusTotal (Domain)", url: `https://www.virustotal.com/gui/domain/${domain}`, category: "Domain Intelligence", description: "Malicious URLs & domain reputation" },
    { name: "SecurityTrails", url: `https://securitytrails.com/domain/${domain}/dns`, category: "Domain Intelligence", description: "Historical DNS & subdomain data" },
    { name: "Crt.sh", url: `https://crt.sh/?q=${domain}`, category: "Domain Intelligence", description: "SSL certificate transparency logs" },
    { name: "DNSDumpster", url: `https://dnsdumpster.com/`, category: "Domain Intelligence", description: "DNS recon & host discovery" },
    { name: "URLScan.io", url: `https://urlscan.io/search/#domain%3A${domain}`, category: "Domain Intelligence", description: "Website scan history & screenshots" },
    { name: "Wayback Machine", url: `https://web.archive.org/web/*/${domain}`, category: "Domain Intelligence", description: "Historical snapshots of the site" },
    { name: "BuiltWith", url: `https://builtwith.com/${domain}`, category: "Domain Intelligence", description: "Detailed tech stack fingerprinting" },
    { name: "Netcraft", url: `https://sitereport.netcraft.com/?url=${domain}`, category: "Domain Intelligence", description: "Hosting history & site report" },
    { name: "DomainTools", url: `https://www.domaintools.com/research/whois/?query=${domain}`, category: "Domain Intelligence", description: "Domain history & WHOIS analysis" },

    { name: "Shodan (Domain)", url: `https://www.shodan.io/search?query=hostname%3A${domain}`, category: "Attack Surface", description: "Exposed services linked to domain" },
    { name: "FOFA", url: `https://en.fofa.info/result?qbase64=${Buffer.from(`domain="${domain}"`).toString("base64")}`, category: "Attack Surface", description: "Internet asset search engine" },
    { name: "ZoomEye", url: `https://www.zoomeye.org/searchResult?q=${encodeURIComponent(`site:${domain}`)}`, category: "Attack Surface", description: "Cyberspace search engine" },
    { name: "Google Dorks", url: `https://www.google.com/search?q=site%3A${domain}`, category: "Attack Surface", description: "Indexed pages & exposed content" },
  ];

  if (!ip) {
    return links.filter(l => l.category !== "IP Intelligence");
  }

  return links;
}

router.post("/recon/scan", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { url } = parsed.data;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const domain = parsedUrl.hostname;

  let ipAddress = "";
  let responseHeaders: Record<string, string> = {};
  let htmlContent = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "SecurityToolkit/1.0 Recon" },
      });
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });
      htmlContent = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    const ips = await dns.resolve4(domain).catch(() => []);
    ipAddress = ips[0] ?? "";
  } catch {}

  const [techStack, dnsRecords, relatedDomains] = await Promise.all([
    detectTechStack(url, responseHeaders, htmlContent),
    resolveDns(domain),
    findRelatedDomains(domain),
  ]);

  const osintLinks = buildOsintLinks(domain, ipAddress);

  return res.json({
    url,
    domain,
    ipAddress,
    techStack,
    subdomains: [],
    dnsRecords,
    relatedDomains,
    osintLinks,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
