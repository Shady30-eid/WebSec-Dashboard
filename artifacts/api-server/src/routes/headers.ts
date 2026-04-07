import { Router } from "express";
import { z } from "zod";

const router = Router();

const RequestSchema = z.object({
  url: z.string().url(),
});

interface HeaderDef {
  name: string;
  maxScore: number;
  evaluate: (value: string | undefined) => { score: number; grade: string; recommendation: string };
}

const SECURITY_HEADERS: HeaderDef[] = [
  {
    name: "Content-Security-Policy",
    maxScore: 25,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add a Content-Security-Policy header to prevent XSS and data injection attacks. Start with: default-src 'self'" };
      if (v.includes("unsafe-inline") && v.includes("unsafe-eval")) return { score: 10, grade: "D", recommendation: "CSP present but contains 'unsafe-inline' and 'unsafe-eval' which significantly weaken its protection. Remove these directives." };
      if (v.includes("unsafe-inline") || v.includes("unsafe-eval")) return { score: 15, grade: "C", recommendation: "CSP present but contains 'unsafe-inline' or 'unsafe-eval'. Remove these directives to strengthen protection." };
      if (v.includes("*")) return { score: 18, grade: "B", recommendation: "CSP uses wildcards. Replace with specific origins for stronger protection." };
      return { score: 25, grade: "A", recommendation: "Strong CSP in place. Review periodically to keep it up to date." };
    },
  },
  {
    name: "Strict-Transport-Security",
    maxScore: 20,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload to enforce HTTPS." };
      const maxAge = parseInt(v.match(/max-age=(\d+)/)?.[1] ?? "0");
      if (maxAge < 86400) return { score: 8, grade: "D", recommendation: "HSTS max-age is too short. Set to at least 31536000 (1 year)." };
      if (!v.includes("includeSubDomains")) return { score: 14, grade: "C", recommendation: "HSTS is missing includeSubDomains directive. Add it to protect all subdomains." };
      if (!v.includes("preload")) return { score: 17, grade: "B", recommendation: "Consider adding 'preload' to HSTS to get added to browser preload lists." };
      return { score: 20, grade: "A", recommendation: "Excellent HSTS configuration." };
    },
  },
  {
    name: "X-Frame-Options",
    maxScore: 10,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking attacks." };
      if (v.toUpperCase() === "DENY") return { score: 10, grade: "A", recommendation: "Excellent. DENY provides maximum protection against clickjacking." };
      if (v.toUpperCase().startsWith("SAMEORIGIN")) return { score: 9, grade: "A", recommendation: "Good. SAMEORIGIN allows framing only from the same origin." };
      return { score: 5, grade: "C", recommendation: "X-Frame-Options value is non-standard. Use DENY or SAMEORIGIN." };
    },
  },
  {
    name: "X-Content-Type-Options",
    maxScore: 10,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing attacks." };
      if (v.toLowerCase() === "nosniff") return { score: 10, grade: "A", recommendation: "Correct configuration. nosniff prevents MIME-type sniffing." };
      return { score: 5, grade: "C", recommendation: "X-Content-Type-Options should be set to 'nosniff'." };
    },
  },
  {
    name: "Referrer-Policy",
    maxScore: 10,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add Referrer-Policy: no-referrer or strict-origin-when-cross-origin to control referrer information." };
      const strict = ["no-referrer", "strict-origin", "no-referrer-when-downgrade", "strict-origin-when-cross-origin"];
      const medium = ["same-origin", "origin"];
      const weak = ["unsafe-url", "origin-when-cross-origin"];
      if (strict.some(p => v.toLowerCase().includes(p))) return { score: 10, grade: "A", recommendation: "Good referrer policy configuration." };
      if (medium.some(p => v.toLowerCase().includes(p))) return { score: 7, grade: "B", recommendation: "Consider using a stricter referrer policy like strict-origin-when-cross-origin." };
      if (weak.some(p => v.toLowerCase().includes(p))) return { score: 3, grade: "D", recommendation: "Referrer-Policy is too permissive. Switch to strict-origin-when-cross-origin or no-referrer." };
      return { score: 5, grade: "C", recommendation: "Review your Referrer-Policy value." };
    },
  },
  {
    name: "Permissions-Policy",
    maxScore: 10,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add Permissions-Policy header to restrict access to browser features like camera, microphone, and geolocation." };
      if (v.includes("camera") && v.includes("microphone") && v.includes("geolocation")) {
        return { score: 10, grade: "A", recommendation: "Good Permissions-Policy controlling key browser features." };
      }
      return { score: 6, grade: "C", recommendation: "Permissions-Policy present but doesn't cover all sensitive features. Add restrictions for camera, microphone, geolocation." };
    },
  },
  {
    name: "X-XSS-Protection",
    maxScore: 5,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add X-XSS-Protection: 1; mode=block. Note: modern browsers rely more on CSP." };
      if (v.includes("1") && v.includes("mode=block")) return { score: 5, grade: "A", recommendation: "X-XSS-Protection is configured correctly. Supplement with a strong CSP." };
      if (v.startsWith("1")) return { score: 3, grade: "B", recommendation: "Add mode=block to X-XSS-Protection." };
      if (v === "0") return { score: 2, grade: "D", recommendation: "X-XSS-Protection is disabled. Enable with: 1; mode=block" };
      return { score: 3, grade: "C", recommendation: "Review X-XSS-Protection configuration." };
    },
  },
  {
    name: "Cache-Control",
    maxScore: 5,
    evaluate: (v) => {
      if (!v) return { score: 0, grade: "F", recommendation: "Add Cache-Control header to prevent sensitive data caching. For sensitive pages: no-store, no-cache" };
      if (v.includes("no-store")) return { score: 5, grade: "A", recommendation: "no-store ensures sensitive data is not cached." };
      if (v.includes("no-cache")) return { score: 4, grade: "B", recommendation: "no-cache is good. Consider using no-store for sensitive pages." };
      return { score: 2, grade: "C", recommendation: "Review Cache-Control to prevent sensitive data caching." };
    },
  },
  {
    name: "Server",
    maxScore: 5,
    evaluate: (v) => {
      if (!v) return { score: 5, grade: "A", recommendation: "Server header is hidden. This is the ideal configuration." };
      if (v.match(/\d+\.\d+/)) return { score: 0, grade: "F", recommendation: `Server header reveals version information: "${v}". Remove version numbers to prevent fingerprinting.` };
      return { score: 3, grade: "C", recommendation: `Server header discloses server type: "${v}". Consider removing this header entirely.` };
    },
  },
];

function overallGrade(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 50) return "D";
  return "F";
}

router.post("/headers/audit", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { url } = parsed.data;
  let responseHeaders: Record<string, string> = {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "SecurityToolkit/1.0 HeadersAudit" },
        redirect: "follow",
      });
      response.headers.forEach((v, k) => { responseHeaders[k.toLowerCase()] = v; });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch the target URL", details: String(err) });
  }

  let totalScore = 0;
  let totalMax = 0;
  const headers = SECURITY_HEADERS.map((def) => {
    const value = responseHeaders[def.name.toLowerCase()];
    const { score, grade, recommendation } = def.evaluate(value);
    totalScore += score;
    totalMax += def.maxScore;
    return {
      name: def.name,
      present: value !== undefined,
      value: value ?? "",
      score,
      maxScore: def.maxScore,
      grade,
      recommendation,
    };
  });

  return res.json({
    url,
    grade: overallGrade(totalScore, totalMax),
    score: totalScore,
    maxScore: totalMax,
    headers,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
