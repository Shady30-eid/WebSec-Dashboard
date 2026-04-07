import { Router } from "express";
import { z } from "zod";

const router = Router();

const RequestSchema = z.object({
  url: z.string().url(),
});

interface SeoIssue {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  element?: string;
}

function extractMeta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return m[1];
  }
  return undefined;
}

function extractOg(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return m[1];
  }
  return undefined;
}

function extractTwitter(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return m[1];
  }
  return undefined;
}

router.post("/seo/audit", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { url } = parsed.data;
  let html = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "SecurityToolkit/1.0 SEO-Audit" },
        redirect: "follow",
      });
      html = await response.text();
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch the target URL", details: String(err) });
  }

  const issues: SeoIssue[] = [];

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? "";
  if (!title) {
    issues.push({ type: "missing_title", severity: "error", message: "Page is missing a <title> tag. This is critical for SEO and user experience." });
  } else if (title.length < 30) {
    issues.push({ type: "short_title", severity: "warning", message: `Title is too short (${title.length} chars). Aim for 30-60 characters.`, element: `<title>${title}</title>` });
  } else if (title.length > 60) {
    issues.push({ type: "long_title", severity: "warning", message: `Title is too long (${title.length} chars). Keep it under 60 characters to avoid truncation in search results.`, element: `<title>${title}</title>` });
  }

  const description = extractMeta(html, "description");
  if (!description) {
    issues.push({ type: "missing_description", severity: "error", message: "Page is missing a meta description. Add one to improve click-through rates in search results." });
  } else if (description.length < 70) {
    issues.push({ type: "short_description", severity: "warning", message: `Meta description is too short (${description.length} chars). Aim for 70-160 characters.` });
  } else if (description.length > 160) {
    issues.push({ type: "long_description", severity: "warning", message: `Meta description is too long (${description.length} chars). Keep it under 160 characters.` });
  }

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const canonicalUrl = canonicalMatch?.[1] ?? "";
  if (!canonicalUrl) {
    issues.push({ type: "missing_canonical", severity: "warning", message: "No canonical URL specified. Add <link rel='canonical'> to prevent duplicate content issues." });
  }

  const robotsMeta = extractMeta(html, "robots") ?? "";
  if (robotsMeta.includes("noindex")) {
    issues.push({ type: "noindex", severity: "error", message: "Page has robots meta 'noindex'. This page will not be indexed by search engines.", element: `<meta name="robots" content="${robotsMeta}">` });
  }
  if (robotsMeta.includes("nofollow")) {
    issues.push({ type: "nofollow", severity: "warning", message: "Page has robots meta 'nofollow'. Links on this page will not be followed by search engines." });
  }

  const h1Matches = html.match(/<h1[^>]*>[^<]+<\/h1>/gi) ?? [];
  const h2Count = (html.match(/<h2[^>]*>/gi) ?? []).length;
  const h3Count = (html.match(/<h3[^>]*>/gi) ?? []).length;
  if (h1Matches.length === 0) {
    issues.push({ type: "missing_h1", severity: "error", message: "Page is missing an H1 heading. Every page should have exactly one H1 tag." });
  } else if (h1Matches.length > 1) {
    issues.push({ type: "multiple_h1", severity: "warning", message: `Page has ${h1Matches.length} H1 headings. Use only one H1 per page.` });
  }

  const ogTitle = extractOg(html, "title");
  const ogDesc = extractOg(html, "description");
  const ogImage = extractOg(html, "image");
  const ogUrl = extractOg(html, "url");
  const ogType = extractOg(html, "type");
  if (!ogTitle || !ogDesc || !ogImage) {
    const missing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean);
    issues.push({ type: "missing_og", severity: "warning", message: `Missing Open Graph tags: ${missing.join(", ")}. Add these for better social media sharing.` });
  }

  const twCard = extractTwitter(html, "card");
  const twTitle = extractTwitter(html, "title");
  const twDesc = extractTwitter(html, "description");
  if (!twCard) {
    issues.push({ type: "missing_twitter_card", severity: "info", message: "Missing Twitter Card meta tags. Add them for better Twitter/X sharing previews." });
  }

  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const structuredData = jsonLdMatches.map(m => {
    try { return JSON.parse(m[1]); } catch { return null; }
  }).filter(Boolean);

  const internalLinks = (html.match(/href=["']\//g) ?? []).length + (html.match(new RegExp(`href=["']${url}`, "g")) ?? []).length;
  const externalLinks = (html.match(/href=["']https?:\/\//g) ?? []).length - (html.match(new RegExp(`href=["']${new URL(url).origin}`, "g")) ?? []).length;

  const imgTags = html.match(/<img[^>]+>/gi) ?? [];
  const imgsWithoutAlt = imgTags.filter(img => !img.includes("alt=") || img.match(/alt=["']\s*["']/)).length;
  if (imgsWithoutAlt > 0) {
    issues.push({ type: "images_without_alt", severity: "warning", message: `${imgsWithoutAlt} image(s) are missing alt text. Add descriptive alt attributes for accessibility and SEO.` });
  }

  if (!html.match(/<html[^>]+lang=/i)) {
    issues.push({ type: "missing_lang", severity: "warning", message: "HTML element is missing a 'lang' attribute. Add lang to improve accessibility." });
  }

  const viewportMeta = html.match(/<meta[^>]+name=["']viewport["']/i);
  if (!viewportMeta) {
    issues.push({ type: "missing_viewport", severity: "error", message: "Missing viewport meta tag. Add <meta name='viewport' content='width=device-width, initial-scale=1'> for mobile optimization." });
  }

  if (structuredData.length === 0) {
    issues.push({ type: "no_structured_data", severity: "info", message: "No structured data (JSON-LD) found. Consider adding Schema.org markup to enhance search results." });
  }

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;
  const maxScore = 100;
  const rawScore = maxScore - (errorCount * 15) - (warningCount * 5) - (infoCount * 2);
  const score = Math.max(0, Math.min(100, rawScore));

  function gradeFromScore(s: number): string {
    if (s >= 95) return "A+";
    if (s >= 90) return "A";
    if (s >= 80) return "B";
    if (s >= 70) return "C";
    if (s >= 50) return "D";
    return "F";
  }

  return res.json({
    url,
    score,
    grade: gradeFromScore(score),
    title,
    description: description ?? "",
    canonicalUrl,
    robotsMeta,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      url: ogUrl,
      type: ogType,
    },
    twitterCard: {
      card: twCard,
      title: twTitle,
      description: twDesc,
    },
    structuredData,
    headings: {
      h1: h1Matches.length,
      h2: h2Count,
      h3: h3Count,
    },
    issues,
    internalLinks,
    externalLinks: Math.max(0, externalLinks),
    brokenLinks: 0,
    imagesWithoutAlt: imgsWithoutAlt,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
