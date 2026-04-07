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

  const [techStack, dnsRecords, subdomains] = await Promise.all([
    detectTechStack(url, responseHeaders, htmlContent),
    resolveDns(domain),
    discoverSubdomains(domain),
  ]);

  return res.json({
    url,
    domain,
    ipAddress,
    techStack,
    subdomains,
    dnsRecords,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
