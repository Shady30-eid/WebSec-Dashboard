import { Router } from "express";
import { z } from "zod";
import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";

const router = Router();

const RequestSchema = z.object({
  url: z.string().url(),
});

const COMMON_TLDS = [
  "com", "net", "org", "io", "co", "info", "biz", "edu", "gov",
  "co.uk", "co.au", "co.nz", "co.za", "co.in", "co.jp", "co.kr",
  "com.au", "com.br", "com.mx", "com.ar", "com.sg", "com.hk", "com.tw",
  "de", "fr", "es", "it", "nl", "ru", "jp", "cn", "br", "au",
  "ca", "mx", "in", "pl", "se", "no", "dk", "fi", "be", "at",
  "ch", "nz", "sg", "hk", "tw", "kr", "ar", "za", "ie", "pt",
  "gr", "hu", "cz", "ro", "tr", "ua", "pk", "ng", "eg", "ma",
  "app", "dev", "tech", "ai", "cloud", "online", "site", "store",
  "club", "xyz", "me", "us", "uk", "eu", "mobi", "pro",
];

function fetchUrl(targetUrl: string, options: { timeout?: number; maxSize?: number } = {}): Promise<{ status: number; headers: Record<string, string>; body: string; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timeout = options.timeout ?? 12000;
    const maxSize = options.maxSize ?? 500_000;
    let parsedUrl: URL;
    try { parsedUrl = new URL(targetUrl); } catch (e) { return reject(e); }

    const mod = parsedUrl.protocol === "https:" ? https : http;
    const req = mod.get(
      { hostname: parsedUrl.hostname, path: parsedUrl.pathname + parsedUrl.search, port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80), headers: { "User-Agent": "Mozilla/5.0 SecurityToolkit/2.0 Recon", "Accept": "text/html,*/*" } },
      (res) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") headers[k.toLowerCase()] = v;
          else if (Array.isArray(v)) headers[k.toLowerCase()] = v.join(", ");
        }
        let body = "";
        res.on("data", (chunk: Buffer) => { if (body.length < maxSize) body += chunk.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers, body, responseTime: Date.now() - start }));
        res.on("error", reject);
      }
    );
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}

async function detectTechStack(url: string, status: number, responseHeaders: Record<string, string>, htmlContent: string, responseTime: number): Promise<Array<{ name: string; category: string; version?: string; confidence: number; evidence?: string }>> {
  const stack: Array<{ name: string; category: string; version?: string; confidence: number; evidence?: string }> = [];
  const h = responseHeaders;
  const html = htmlContent;
  const htmlLow = html.toLowerCase();
  const add = (name: string, category: string, confidence: number, version?: string, evidence?: string) => {
    if (!stack.find(s => s.name === name)) stack.push({ name, category, version, confidence, evidence });
  };

  // ─── Web Servers ───
  const server = h["server"] ?? "";
  if (/nginx/i.test(server)) add("Nginx", "Web Server", 99, server.match(/nginx\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/apache/i.test(server)) add("Apache", "Web Server", 99, server.match(/apache\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/microsoft-iis|iis/i.test(server)) add("IIS", "Web Server", 99, server.match(/iis\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/litespeed/i.test(server)) add("LiteSpeed", "Web Server", 99, undefined, `Server: ${server}`);
  if (/caddy/i.test(server)) add("Caddy", "Web Server", 95, server.match(/caddy\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/openresty/i.test(server)) add("OpenResty", "Web Server", 99, server.match(/openresty\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/gunicorn/i.test(server)) add("Gunicorn", "Web Server", 95, server.match(/gunicorn\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/tornado/i.test(server)) add("Tornado", "Web Server", 90, undefined, `Server: ${server}`);
  if (/kestrel/i.test(server)) add("Kestrel", "Web Server", 90, undefined, `Server: ${server}`);
  if (/cowboy/i.test(server)) add("Cowboy", "Web Server", 85, undefined, `Server: ${server}`);
  if (/jetty/i.test(server)) add("Jetty", "Web Server", 90, server.match(/jetty\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/tomcat/i.test(server)) add("Tomcat", "Web Server", 95, server.match(/tomcat\/([\d.]+)/i)?.[1], `Server: ${server}`);
  if (/werkzeug/i.test(server)) add("Werkzeug", "Web Server", 90, server.match(/werkzeug\/([\d.]+)/i)?.[1], `Server: ${server}`);

  // ─── CDN / Proxy ───
  if (/cloudflare/i.test(server) || h["cf-ray"]) add("Cloudflare", "CDN", 99, undefined, h["cf-ray"] ? "cf-ray header" : `Server: ${server}`);
  if (h["x-amz-cf-id"] || h["x-amz-cf-pop"] || h["via"]?.includes("CloudFront")) add("AWS CloudFront", "CDN", 99, undefined, "x-amz-cf-id header");
  if (h["x-fastly-request-id"] || h["fastly-restarts"]) add("Fastly", "CDN", 99, undefined, "x-fastly-request-id header");
  if (h["x-akamai-transformed"] || h["x-akamai-request-id"] || h["akamai-origin-hop"]) add("Akamai", "CDN", 99, undefined, "akamai header");
  if (/sucuri/i.test(server) || h["x-sucuri-id"] || h["x-sucuri-cache"]) add("Sucuri WAF", "CDN / WAF", 99, undefined, "sucuri header");
  if (h["bunny-cdn-cache-status"] || h["bunny-request-id"]) add("BunnyCDN", "CDN", 99, undefined, "bunny header");
  if (h["x-cdn"]?.toLowerCase().includes("imperva") || h["x-iinfo"]) add("Imperva Incapsula", "CDN / WAF", 95, undefined, "x-cdn header");
  if (h["x-azure-ref"] || h["x-msedge-ref"]) add("Azure CDN", "CDN", 95, undefined, "x-azure-ref header");
  if (h["x-cache"]?.includes("Google") || h["via"]?.includes("google")) add("Google Cloud CDN", "CDN", 85, undefined, "via header");
  if (h["x-served-by"]?.includes("keycdn") || h["x-edge-location"]) add("KeyCDN", "CDN", 80, undefined, "x-served-by header");
  if (h["x-ar-debug"] || h["x-awex-origin"]) add("Arvancloud", "CDN", 80, undefined, "x-ar header");
  if (/varnish/i.test(h["via"] ?? "") || h["x-varnish"]) add("Varnish Cache", "Cache", 95, undefined, "x-varnish header");
  if (h["x-cache"]?.toLowerCase().includes("squid") || /squid/i.test(h["via"] ?? "")) add("Squid Cache", "Cache", 85, undefined, "x-cache header");

  // ─── Hosting Providers ───
  if (h["x-vercel-id"] || h["x-vercel-cache"]) add("Vercel", "Hosting", 99, undefined, "x-vercel-id header");
  if (h["x-github-request-id"] || h["x-github-backend"]) add("GitHub Pages", "Hosting", 99, undefined, "x-github-request-id header");
  if (h["x-netlify-build-number"] || h["netlify-vary"] || h["x-nf-request-id"]) add("Netlify", "Hosting", 99, undefined, "netlify header");
  if (/herokuapp\.com|heroku/i.test(h["via"] ?? "") || h["x-request-id"]?.includes("heroku") || h["x-runtime"]?.includes("heroku")) add("Heroku", "Hosting", 85, undefined, "heroku via header");
  if (h["x-render-origin-server"]) add("Render", "Hosting", 99, undefined, "x-render header");
  if (h["fly-request-id"]) add("Fly.io", "Hosting", 99, undefined, "fly-request-id header");
  if (h["x-railway-request-id"] || /railway/i.test(h["server"] ?? "")) add("Railway", "Hosting", 95, undefined, "railway header");
  if (h["x-firebase-appcheck"] || h["x-firebase-routing-function"]) add("Firebase Hosting", "Hosting", 95, undefined, "firebase header");
  if (h["x-amz-request-id"] && h["x-amz-id-2"]) add("AWS S3", "Hosting", 90, undefined, "x-amz-request-id header");
  if (h["x-ms-request-id"] && /blob\.core\.windows\.net|azurewebsites/i.test(url)) add("Azure", "Hosting", 90, undefined, "x-ms-request-id header");
  if (/pantheonsite\.io/i.test(url) || h["x-pantheon-styx-hostname"]) add("Pantheon", "Hosting", 95, undefined, "pantheon header");
  if (/kinstacdn\.com|kinsta\.cloud/i.test(url) || h["x-kinsta-cache"]) add("Kinsta", "Hosting", 95, undefined, "x-kinsta-cache header");
  if (/wpengine/i.test(h["x-powered-by"] ?? "") || h["x-cache"]?.includes("wpengine")) add("WP Engine", "Hosting", 95, undefined, "wpengine header");
  if (h["x-wix-request-id"] || /wixsite\.com/i.test(url)) add("Wix", "Hosting / CMS", 99, undefined, "wix header");
  if (/squarespace/i.test(html) || h["x-servedby"]?.includes("squarespace") || /static\.squarespace\.com/i.test(html)) add("Squarespace", "Hosting / CMS", 95, undefined, "squarespace in HTML");
  if (/webflow/i.test(html) || /assets\.website-files\.com|webflow\.io/i.test(html)) add("Webflow", "Hosting / CMS", 95, undefined, "webflow in HTML");
  if (/ghost\.io|content\.ghost\.io/i.test(html) || h["x-ghost-cache-status"]) add("Ghost", "CMS", 95, undefined, "ghost in HTML");

  // ─── CMS ───
  if (html.includes("wp-content") || html.includes("wp-includes") || html.includes("wp-json")) {
    add("WordPress", "CMS", 99, html.match(/wp-emoji-release\.min\.js\?ver=([\d.]+)/)?.[1], "wp-content in HTML");
  }
  if (/\/sites\/default\/files\/|drupal\.org/i.test(html) || html.includes("Drupal")) add("Drupal", "CMS", 90, html.match(/Drupal ([\d.]+)/)?.[1], "drupal in HTML");
  if (/joomla/i.test(html) || html.includes("/media/com_")) add("Joomla", "CMS", 85, undefined, "joomla in HTML");
  if (/typo3/i.test(html) || /EXT:typo3/i.test(html)) add("TYPO3", "CMS", 90, undefined, "typo3 in HTML");
  if (/\.craft\.|craftcms/i.test(html) || /CraftCMS/i.test(html)) add("Craft CMS", "CMS", 80, undefined, "craftcms in HTML");
  if (/contentful/i.test(html) || /cdn\.contentful\.com/i.test(html)) add("Contentful", "CMS", 85, undefined, "contentful in HTML");
  if (/sanity\.io/i.test(html) || /cdn\.sanity\.io/i.test(html)) add("Sanity", "CMS", 85, undefined, "sanity in HTML");
  if (/strapi/i.test(html)) add("Strapi", "CMS", 75, undefined, "strapi in HTML");
  if (/hubspot/i.test(h["x-powered-by"] ?? "") || /hs-scripts\.com|hubspot/i.test(html)) add("HubSpot CMS", "CMS", 85, undefined, "hubspot in HTML");
  if (/sitecore/i.test(html) || /sitecore\.net/i.test(html)) add("Sitecore", "CMS", 85, undefined, "sitecore in HTML");
  if (/kentico/i.test(html)) add("Kentico", "CMS", 80, undefined, "kentico in HTML");
  if (/concrete5|concretecms/i.test(html)) add("Concrete CMS", "CMS", 80, undefined, "concrete5 in HTML");
  if (/\bmodx\b/i.test(html)) add("MODX", "CMS", 75, undefined, "modx in HTML");
  if (/prestashop/i.test(html) || /\/modules\/ps_/i.test(html)) add("PrestaShop", "E-Commerce", 90, undefined, "prestashop in HTML");
  if (/shopify/i.test(html) || /cdn\.shopify\.com|shopifycdn\.com/i.test(html)) add("Shopify", "E-Commerce", 95, undefined, "shopify in HTML");
  if (/woocommerce|wc-session|wc_cart/i.test(html)) add("WooCommerce", "E-Commerce", 95, undefined, "woocommerce in HTML");
  if (/magento|mage\/|Mage\.Cookies/i.test(html)) add("Magento", "E-Commerce", 90, undefined, "magento in HTML");
  if (/bigcommerce|cdn\.bigcommerce\.com/i.test(html)) add("BigCommerce", "E-Commerce", 90, undefined, "bigcommerce in HTML");
  if (/opencart/i.test(html)) add("OpenCart", "E-Commerce", 80, undefined, "opencart in HTML");
  if (/salesforce\.com|force\.com|exacttarget/i.test(html)) add("Salesforce", "CRM / E-Commerce", 80, undefined, "salesforce in HTML");
  if (/oscommerce/i.test(html)) add("osCommerce", "E-Commerce", 80, undefined, "oscommerce in HTML");

  // ─── Programming Languages / Runtimes ───
  const xpb = h["x-powered-by"] ?? "";
  if (/php/i.test(xpb)) add("PHP", "Language", 99, xpb.match(/php\/([\d.]+)/i)?.[1], `x-powered-by: ${xpb}`);
  if (/asp\.net/i.test(xpb) || h["x-aspnet-version"] || h["x-aspnetmvc-version"]) add("ASP.NET", "Language / Framework", 99, h["x-aspnet-version"], "x-aspnet-version header");
  if (/express/i.test(xpb) || (h["server"]?.includes("Express"))) add("Node.js / Express", "Language / Framework", 90, undefined, "express in powered-by");
  if (/ruby|rails|rack/i.test(xpb) || h["x-runtime"]?.match(/\d+\.\d+/)) add("Ruby on Rails", "Language / Framework", 85, undefined, `x-runtime: ${h["x-runtime"]}`);
  if (/django/i.test(xpb) || /django/i.test(h["server"] ?? "") || html.includes("csrfmiddlewaretoken")) add("Django", "Language / Framework", 85, undefined, "csrfmiddlewaretoken");
  if (/flask/i.test(h["server"] ?? "") || /werkzeug/i.test(h["server"] ?? "")) add("Flask", "Language / Framework", 80, undefined, "werkzeug server");
  if (/laravel/i.test(xpb) || h["set-cookie"]?.includes("laravel_session")) add("Laravel", "Language / Framework", 90, undefined, "laravel_session cookie");
  if (/codeigniter/i.test(html)) add("CodeIgniter", "Language / Framework", 80, undefined, "codeigniter in HTML");
  if (/symfony/i.test(html) || /Symfony/i.test(h["x-debug-token-link"] ?? "")) add("Symfony", "Language / Framework", 80, undefined, "symfony in HTML");
  if (/gatsby/i.test(html) || html.includes("gatsby-")) add("Gatsby", "JavaScript Framework", 90, undefined, "gatsby in HTML");
  if (/nuxt/i.test(html) || html.includes("__nuxt") || html.includes("nuxt-link")) add("Nuxt.js", "JavaScript Framework", 90, undefined, "__nuxt in HTML");
  if (html.includes("__NEXT_DATA__") || /next\.js/i.test(html)) add("Next.js", "JavaScript Framework", 95, undefined, "__NEXT_DATA__ in HTML");
  if (html.includes("ng-version") || html.includes("ng-app") || html.includes("[_nghost") || html.includes("ng-reflect")) add("Angular", "JavaScript Framework", 90, undefined, "ng-version in HTML");
  if (/react/i.test(html) || html.includes("__REACT_") || html.includes("data-reactroot") || html.includes("data-reactid")) add("React", "JavaScript Framework", 80, undefined, "react in HTML");
  if (html.includes("__vue__") || html.includes("data-v-app") || /vue\.js/i.test(html)) add("Vue.js", "JavaScript Framework", 85, undefined, "__vue__ in HTML");
  if (/svelte/i.test(html) || html.includes("__svelte")) add("Svelte", "JavaScript Framework", 85, undefined, "svelte in HTML");
  if (/astro/i.test(html) || html.includes("astro-island") || html.includes("astro-root")) add("Astro", "JavaScript Framework", 85, undefined, "astro-island in HTML");
  if (/ember\.js|emberjs/i.test(html)) add("Ember.js", "JavaScript Framework", 80, undefined, "ember.js in HTML");
  if (/backbone\.js|backbonejs/i.test(html)) add("Backbone.js", "JavaScript Framework", 75, undefined, "backbone.js in HTML");
  if (/jquery/i.test(html)) add("jQuery", "JavaScript Library", 90, html.match(/jquery[.-]([\d.]+)(\.min)?\.js/i)?.[1], "jquery in HTML");
  if (/bootstrap/i.test(html) || /bootstrap\.(min\.)?css/i.test(html)) add("Bootstrap", "CSS Framework", 85, html.match(/bootstrap[.-]([\d.]+)/i)?.[1], "bootstrap in HTML");
  if (/tailwind/i.test(html) || /tailwindcss/i.test(html)) add("Tailwind CSS", "CSS Framework", 85, undefined, "tailwind in HTML");
  if (/material-ui|@mui/i.test(html)) add("Material UI", "CSS Framework", 80, undefined, "material-ui in HTML");
  if (/bulma/i.test(html) || /bulma\.min\.css/i.test(html)) add("Bulma", "CSS Framework", 75, undefined, "bulma in HTML");
  if (/foundation/i.test(html) && !/foundation-email/i.test(html)) add("Foundation", "CSS Framework", 75, undefined, "foundation in HTML");

  // ─── Analytics & Tag Management ───
  if (/google-analytics\.com|gtag\/js|ga\('create'/i.test(html) || html.includes("UA-") || html.includes("G-")) add("Google Analytics", "Analytics", 95, undefined, "gtag.js in HTML");
  if (/googletagmanager\.com\/gtm\.js/i.test(html) || html.includes("GTM-")) add("Google Tag Manager", "Analytics", 95, undefined, "GTM in HTML");
  if (/facebook\.net\/en_US\/fbevents|fbq\(/i.test(html)) add("Facebook Pixel", "Analytics", 90, undefined, "fbq in HTML");
  if (/hotjar\.com|hjid:/i.test(html)) add("Hotjar", "Analytics", 90, undefined, "hotjar in HTML");
  if (/cdn\.segment\.com|analytics\.js/i.test(html)) add("Segment", "Analytics", 85, undefined, "segment.js in HTML");
  if (/mixpanel\.com|mixpanel\.init/i.test(html)) add("Mixpanel", "Analytics", 85, undefined, "mixpanel in HTML");
  if (/amplitude\.com|amplitude\.getInstance/i.test(html)) add("Amplitude", "Analytics", 85, undefined, "amplitude in HTML");
  if (/heap\.io|heap\.load/i.test(html)) add("Heap Analytics", "Analytics", 85, undefined, "heap in HTML");
  if (/plausible\.io/i.test(html)) add("Plausible Analytics", "Analytics", 90, undefined, "plausible in HTML");
  if (/matomo|piwik/i.test(html)) add("Matomo", "Analytics", 85, undefined, "matomo/piwik in HTML");
  if (/posthog\.com|posthog\.init/i.test(html)) add("PostHog", "Analytics", 85, undefined, "posthog in HTML");
  if (/clarity\.ms|clarity\.js/i.test(html) || html.includes("WL_")) add("Microsoft Clarity", "Analytics", 85, undefined, "clarity in HTML");
  if (/fullstory\.com|FS\.identify/i.test(html)) add("FullStory", "Analytics", 85, undefined, "fullstory in HTML");
  if (/logrocket\.com/i.test(html)) add("LogRocket", "Analytics", 85, undefined, "logrocket in HTML");
  if (/adobe.*launch|assets\.adobedtm/i.test(html)) add("Adobe Launch", "Tag Management", 85, undefined, "adobe launch in HTML");
  if (/tealium\.com|tealiumiq\.com/i.test(html)) add("Tealium", "Tag Management", 80, undefined, "tealium in HTML");

  // ─── Security / Auth ───
  if (/recaptcha\.net|www\.google\.com\/recaptcha/i.test(html)) add("Google reCAPTCHA", "Security", 95, undefined, "recaptcha in HTML");
  if (/hcaptcha\.com/i.test(html)) add("hCaptcha", "Security", 95, undefined, "hcaptcha in HTML");
  if (/turnstile\.cloudflare\.com/i.test(html)) add("Cloudflare Turnstile", "Security", 95, undefined, "turnstile in HTML");
  if (/auth0\.com|auth0-spa-js/i.test(html)) add("Auth0", "Auth", 90, undefined, "auth0 in HTML");
  if (/okta\.com/i.test(html)) add("Okta", "Auth", 90, undefined, "okta in HTML");
  if (/clerk\.dev|clerk\.browser\.js/i.test(html)) add("Clerk", "Auth", 90, undefined, "clerk in HTML");
  if (/cdn\.jsdelivr\.net\/npm\/@supabase/i.test(html) || /supabase\.io/i.test(html)) add("Supabase", "Backend / Auth", 85, undefined, "supabase in HTML");
  if (/firebase\/app|firebaseapp\.com/i.test(html)) add("Firebase", "Backend", 90, undefined, "firebase in HTML");
  if (/\.sentry\.io|sentry\.init/i.test(html)) add("Sentry", "Monitoring", 90, undefined, "sentry in HTML");
  if (/datadoghq\.com|ddrum/i.test(html)) add("Datadog", "Monitoring", 80, undefined, "datadog in HTML");
  if (/newrelic\.com|NREUM/i.test(html)) add("New Relic", "Monitoring", 85, undefined, "NREUM in HTML");
  if (/dynatrace\.com/i.test(html)) add("Dynatrace", "Monitoring", 80, undefined, "dynatrace in HTML");
  if (/bugsnag\.com/i.test(html)) add("Bugsnag", "Monitoring", 80, undefined, "bugsnag in HTML");
  if (/rollbar\.com/i.test(html)) add("Rollbar", "Monitoring", 80, undefined, "rollbar in HTML");

  // ─── Payment / Commerce ───
  if (/stripe\.com\/v3|js\.stripe\.com/i.test(html)) add("Stripe", "Payments", 95, undefined, "stripe.js in HTML");
  if (/paypal\.com\/sdk|paypalobjects\.com/i.test(html)) add("PayPal", "Payments", 90, undefined, "paypal in HTML");
  if (/squareup\.com|web-sdk\.squarecdn/i.test(html)) add("Square", "Payments", 85, undefined, "square in HTML");
  if (/braintree.*js|braintreegateway/i.test(html)) add("Braintree", "Payments", 85, undefined, "braintree in HTML");
  if (/paddle\.com|paddle\.js/i.test(html)) add("Paddle", "Payments", 80, undefined, "paddle in HTML");
  if (/klarna\.com|klarna-payments/i.test(html)) add("Klarna", "Payments", 80, undefined, "klarna in HTML");

  // ─── Customer Support / Chat ───
  if (/intercom\.io|Intercom\('boot'/i.test(html)) add("Intercom", "Live Chat", 90, undefined, "intercom in HTML");
  if (/zendesk\.com|zopim\.com|ze\.t\(/i.test(html)) add("Zendesk", "Live Chat", 90, undefined, "zendesk in HTML");
  if (/drift\.com|drift\.load/i.test(html)) add("Drift", "Live Chat", 85, undefined, "drift in HTML");
  if (/crisp\.chat|CRISP_WEBSITE_ID/i.test(html)) add("Crisp", "Live Chat", 85, undefined, "crisp in HTML");
  if (/freshchat\.com|fcWidget/i.test(html)) add("Freshchat", "Live Chat", 85, undefined, "fcWidget in HTML");
  if (/tidio\.co|tidioChatApi/i.test(html)) add("Tidio", "Live Chat", 85, undefined, "tidio in HTML");
  if (/hubspot\.com\/conversations|HubSpotConversations/i.test(html)) add("HubSpot Chat", "Live Chat", 85, undefined, "hubspot chat in HTML");
  if (/tawk\.to\/tawk\.min/i.test(html)) add("Tawk.to", "Live Chat", 85, undefined, "tawk in HTML");

  // ─── Marketing ───
  if (/mailchimp\.com|mc\.js/i.test(html)) add("Mailchimp", "Marketing", 85, undefined, "mailchimp in HTML");
  if (/klaviyo\.com/i.test(html)) add("Klaviyo", "Marketing", 85, undefined, "klaviyo in HTML");
  if (/marketo\.net|munchkin\.js/i.test(html)) add("Marketo", "Marketing", 85, undefined, "marketo in HTML");
  if (/convertkit\.com/i.test(html)) add("ConvertKit", "Marketing", 80, undefined, "convertkit in HTML");
  if (/sendgrid\.net/i.test(html)) add("SendGrid", "Email", 80, undefined, "sendgrid in HTML");

  // ─── Maps ───
  if (/maps\.googleapis\.com/i.test(html)) add("Google Maps", "Maps", 95, undefined, "google maps in HTML");
  if (/api\.mapbox\.com|mapboxgl/i.test(html)) add("Mapbox", "Maps", 90, undefined, "mapbox in HTML");
  if (/leafletjs\.com|L\.map/i.test(html)) add("Leaflet.js", "Maps", 85, undefined, "leaflet in HTML");

  // ─── Media / Video ───
  if (/youtube\.com\/embed|youtu\.be/i.test(html)) add("YouTube Embeds", "Video", 90, undefined, "youtube in HTML");
  if (/player\.vimeo\.com|vimeocdn\.com/i.test(html)) add("Vimeo Embeds", "Video", 90, undefined, "vimeo in HTML");
  if (/wistia\.com\/medias|wistia\.net/i.test(html)) add("Wistia", "Video", 85, undefined, "wistia in HTML");
  if (/cloudinary\.com/i.test(html)) add("Cloudinary", "Media CDN", 85, undefined, "cloudinary in HTML");
  if (/imgix\.net/i.test(html)) add("Imgix", "Media CDN", 80, undefined, "imgix in HTML");

  // ─── Fonts ───
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html)) add("Google Fonts", "Fonts", 90, undefined, "google fonts in HTML");
  if (/use\.typekit\.net|use\.typekit\.com/i.test(html)) add("Adobe Fonts (Typekit)", "Fonts", 90, undefined, "typekit in HTML");

  // ─── Testing / Optimization ───
  if (/optimizely\.com|optimizelyx/i.test(html)) add("Optimizely", "A/B Testing", 85, undefined, "optimizely in HTML");
  if (/vwo\.com|\_vwo_code/i.test(html)) add("VWO", "A/B Testing", 85, undefined, "vwo in HTML");
  if (/crazyegg\.com/i.test(html)) add("Crazy Egg", "Analytics", 80, undefined, "crazyegg in HTML");

  // ─── HTTP Response Metadata (always add) ───
  if (responseTime < 300) add("Fast Server Response", "Performance", 99, undefined, `${responseTime}ms`);
  if (status >= 200 && status < 300) add("HTTP OK", "Status", 99, `${status}`, `HTTP ${status}`);
  if (h["content-encoding"]?.includes("gzip") || h["content-encoding"]?.includes("br")) add("Response Compression", "Performance", 95, h["content-encoding"], `content-encoding: ${h["content-encoding"]}`);
  if (h["strict-transport-security"]) add("HSTS", "Security", 99, undefined, "strict-transport-security header");
  if (h["x-frame-options"]) add("Clickjacking Protection (X-Frame-Options)", "Security", 99, undefined, "x-frame-options header");
  if (h["content-security-policy"]) add("Content Security Policy", "Security", 99, undefined, "CSP header present");
  if (h["permissions-policy"] || h["feature-policy"]) add("Permissions Policy", "Security", 90, undefined, "permissions-policy header");

  return stack.sort((a, b) => b.confidence - a.confidence);
}

async function resolveDns(domain: string): Promise<Array<{ type: string; value: string; ttl?: number }>> {
  const records: Array<{ type: string; value: string; ttl?: number }> = [];

  const attempts: Array<[string, () => Promise<void>]> = [
    ["A", async () => {
      const r = await dns.resolve4(domain).catch(() => []);
      r.forEach(ip => records.push({ type: "A", value: ip }));
    }],
    ["AAAA", async () => {
      const r = await dns.resolve6(domain).catch(() => []);
      r.forEach(ip => records.push({ type: "AAAA", value: ip }));
    }],
    ["MX", async () => {
      const r = await dns.resolveMx(domain).catch(() => []);
      r.sort((a, b) => a.priority - b.priority).forEach(mx => records.push({ type: "MX", value: `${mx.priority} ${mx.exchange}` }));
    }],
    ["NS", async () => {
      const r = await dns.resolveNs(domain).catch(() => []);
      r.forEach(ns => records.push({ type: "NS", value: ns }));
    }],
    ["TXT", async () => {
      const r = await dns.resolveTxt(domain).catch(() => []);
      r.forEach(txt => records.push({ type: "TXT", value: txt.join(" ") }));
    }],
    ["CNAME", async () => {
      const r = await dns.resolveCname(domain).catch(() => []);
      r.forEach(cname => records.push({ type: "CNAME", value: cname }));
    }],
    ["SOA", async () => {
      const r = await dns.resolveSoa(domain).catch(() => null);
      if (r) records.push({ type: "SOA", value: `${r.nsname} ${r.hostmaster} serial=${r.serial} refresh=${r.refresh} retry=${r.retry} expire=${r.expire} minttl=${r.minttl}` });
    }],
    ["CAA", async () => {
      const r = await dns.resolveCaa(domain).catch(() => []);
      r.forEach(caa => records.push({ type: "CAA", value: `${caa.critical} ${(caa as Record<string, unknown>)["issue"] ?? (caa as Record<string, unknown>)["issuewild"] ?? ""}` }));
    }],
    ["SRV", async () => {
      for (const service of ["_http._tcp", "_https._tcp", "_sip._tcp", "_sip._udp", "_xmpp-server._tcp"]) {
        const r = await dns.resolveSrv(`${service}.${domain}`).catch(() => []);
        r.forEach(srv => records.push({ type: `SRV (${service})`, value: `${srv.priority} ${srv.weight} ${srv.port} ${srv.name}` }));
      }
    }],
    ["DMARC", async () => {
      const r = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
      r.forEach(txt => records.push({ type: "DMARC", value: txt.join(" ") }));
    }],
    ["DKIM", async () => {
      for (const sel of ["default", "google", "mail", "k1", "k2", "selector1", "selector2", "s1", "s2", "key1", "key2"]) {
        const r = await dns.resolveTxt(`${sel}._domainkey.${domain}`).catch(() => []);
        r.forEach(txt => records.push({ type: `DKIM (${sel})`, value: txt.join(" ").slice(0, 120) + (txt.join(" ").length > 120 ? "..." : "") }));
      }
    }],
    ["ADSP", async () => {
      const r = await dns.resolveTxt(`_adsp._domainkey.${domain}`).catch(() => []);
      r.forEach(txt => records.push({ type: "ADSP", value: txt.join(" ") }));
    }],
    ["BIMI", async () => {
      const r = await dns.resolveTxt(`default._bimi.${domain}`).catch(() => []);
      r.forEach(txt => records.push({ type: "BIMI", value: txt.join(" ") }));
    }],
    ["MTA-STS", async () => {
      const r = await dns.resolveTxt(`_mta-sts.${domain}`).catch(() => []);
      r.forEach(txt => records.push({ type: "MTA-STS", value: txt.join(" ") }));
    }],
  ];

  await Promise.allSettled(attempts.map(([, fn]) => fn()));
  return records;
}

function analyzeEmailSecurity(dnsRecords: Array<{ type: string; value: string }>): Array<{ check: string; status: "pass" | "warn" | "fail"; detail: string }> {
  const results: Array<{ check: string; status: "pass" | "warn" | "fail"; detail: string }> = [];

  const spf = dnsRecords.find(r => r.type === "TXT" && r.value.startsWith("v=spf1"));
  if (spf) {
    const isStrict = spf.value.includes("-all");
    results.push({ check: "SPF", status: isStrict ? "pass" : "warn", detail: isStrict ? spf.value.slice(0, 80) : `Soft policy (~all). Record: ${spf.value.slice(0, 60)}` });
  } else {
    results.push({ check: "SPF", status: "fail", detail: "No SPF TXT record found" });
  }

  const dmarc = dnsRecords.find(r => r.type === "DMARC");
  if (dmarc) {
    const policy = dmarc.value.match(/p=(\w+)/)?.[1] ?? "none";
    results.push({ check: "DMARC", status: policy === "reject" ? "pass" : policy === "quarantine" ? "warn" : "fail", detail: `Policy: ${policy}. ${dmarc.value.slice(0, 80)}` });
  } else {
    results.push({ check: "DMARC", status: "fail", detail: "No DMARC record found at _dmarc." });
  }

  const dkim = dnsRecords.find(r => r.type.startsWith("DKIM"));
  if (dkim) {
    results.push({ check: "DKIM", status: "pass", detail: dkim.value.slice(0, 80) });
  } else {
    results.push({ check: "DKIM", status: "warn", detail: "No common DKIM selector found (checked: default, google, mail, selector1, selector2, s1, s2)" });
  }

  const mtaSts = dnsRecords.find(r => r.type === "MTA-STS");
  results.push({ check: "MTA-STS", status: mtaSts ? "pass" : "warn", detail: mtaSts ? mtaSts.value.slice(0, 80) : "No MTA-STS record found" });

  const bimi = dnsRecords.find(r => r.type === "BIMI");
  results.push({ check: "BIMI", status: bimi ? "pass" : "warn", detail: bimi ? bimi.value.slice(0, 80) : "No BIMI record found (brand logo in email)" });

  return results;
}

function extractBaseDomain(hostname: string): { name: string; currentTld: string } {
  const parts = hostname.split(".");
  if (parts.length <= 1) return { name: hostname, currentTld: "" };
  const secondLevelTlds = ["co.uk", "co.au", "co.nz", "co.za", "co.in", "co.jp", "co.kr", "com.au", "com.br", "com.mx", "com.ar", "com.sg", "com.hk", "com.tw"];
  const last2 = parts.slice(-2).join(".");
  if (secondLevelTlds.includes(last2) && parts.length >= 3) return { name: parts.slice(0, -2).join("."), currentTld: last2 };
  return { name: parts.slice(0, -1).join("."), currentTld: parts[parts.length - 1]! };
}

async function findRelatedDomains(hostname: string): Promise<Array<{ domain: string; ip?: string; registered: boolean; tld: string }>> {
  const { name, currentTld } = extractBaseDomain(hostname);
  const tldsToCheck = COMMON_TLDS.filter(tld => tld !== currentTld);

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
  const found: Array<{ domain: string; ip?: string; registered: boolean; tld: string }> = [];
  for (const r of results) {
    if (r.status === "fulfilled") found.push(r.value);
  }
  return found.sort((a, b) => (a.registered === b.registered ? 0 : a.registered ? -1 : 1));
}

async function fetchRobotsTxt(baseUrl: string): Promise<{ exists: boolean; content?: string; sitemaps?: string[]; disallowedPaths?: string[] }> {
  try {
    const parsed = new URL(baseUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const result = await fetchUrl(robotsUrl, { timeout: 5000, maxSize: 50000 });
    if (result.status === 200 && result.body.toLowerCase().includes("user-agent")) {
      const lines = result.body.split("\n").map(l => l.trim());
      const sitemaps = lines.filter(l => /^sitemap:/i.test(l)).map(l => l.replace(/^sitemap:\s*/i, ""));
      const disallowed = lines.filter(l => /^disallow:/i.test(l)).map(l => l.replace(/^disallow:\s*/i, "")).filter(Boolean).slice(0, 30);
      return { exists: true, content: result.body.slice(0, 2000), sitemaps, disallowedPaths: disallowed };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function fetchSecurityTxt(baseUrl: string): Promise<{ exists: boolean; content?: string; contacts?: string[]; expires?: string }> {
  try {
    const parsed = new URL(baseUrl);
    for (const path of ["/.well-known/security.txt", "/security.txt"]) {
      const secUrl = `${parsed.protocol}//${parsed.host}${path}`;
      const result = await fetchUrl(secUrl, { timeout: 5000, maxSize: 10000 });
      if (result.status === 200 && result.body.includes("Contact:")) {
        const lines = result.body.split("\n").map(l => l.trim());
        const contacts = lines.filter(l => /^contact:/i.test(l)).map(l => l.replace(/^contact:\s*/i, ""));
        const expires = lines.find(l => /^expires:/i.test(l))?.replace(/^expires:\s*/i, "");
        return { exists: true, content: result.body.slice(0, 1000), contacts, expires };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

function analyzeResponseHeaders(headers: Record<string, string>): Array<{ header: string; value: string; category: string }> {
  const info: Array<{ header: string; value: string; category: string }> = [];
  const interesting = [
    ["server", "Server Fingerprint"],
    ["x-powered-by", "Technology Fingerprint"],
    ["x-aspnet-version", "Technology Fingerprint"],
    ["x-aspnetmvc-version", "Technology Fingerprint"],
    ["x-generator", "CMS Fingerprint"],
    ["cf-ray", "CDN"],
    ["x-vercel-id", "Hosting"],
    ["x-nf-request-id", "Hosting"],
    ["x-amz-cf-id", "CDN"],
    ["x-fastly-request-id", "CDN"],
    ["x-cache", "Cache Status"],
    ["age", "Cache Age (seconds)"],
    ["x-runtime", "Response Time"],
    ["x-request-id", "Request Tracing"],
    ["via", "Proxy Chain"],
    ["set-cookie", "Session Cookies"],
    ["strict-transport-security", "Security"],
    ["content-security-policy", "Security"],
    ["x-frame-options", "Security"],
    ["x-content-type-options", "Security"],
    ["referrer-policy", "Security"],
    ["permissions-policy", "Security"],
    ["access-control-allow-origin", "CORS"],
    ["content-encoding", "Compression"],
    ["content-language", "Localization"],
    ["link", "Resource Hints"],
    ["alt-svc", "HTTP/3 / QUIC"],
    ["expect-ct", "Certificate Transparency"],
    ["report-to", "Reporting Endpoint"],
    ["nel", "Network Error Logging"],
  ] as const;

  for (const [header, category] of interesting) {
    const val = headers[header];
    if (val) info.push({ header, value: val.slice(0, 200), category });
  }
  return info;
}

function buildOsintLinks(domain: string, ip: string): Array<{ name: string; url: string; category: string; description: string }> {
  const links = [
    // IP Intelligence
    { name: "Shodan", url: `https://www.shodan.io/host/${ip}`, category: "IP Intelligence", description: "Open ports, services & vulnerabilities" },
    { name: "Censys", url: `https://search.censys.io/hosts/${ip}`, category: "IP Intelligence", description: "Internet-wide scanning database" },
    { name: "VirusTotal (IP)", url: `https://www.virustotal.com/gui/ip-address/${ip}`, category: "IP Intelligence", description: "Malicious activity & reputation" },
    { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${ip}`, category: "IP Intelligence", description: "IP abuse reports & blacklists" },
    { name: "IPinfo", url: `https://ipinfo.io/${ip}`, category: "IP Intelligence", description: "Geolocation, ASN & hosting info" },
    { name: "GreyNoise", url: `https://www.greynoise.io/viz/ip/${ip}`, category: "IP Intelligence", description: "Internet noise & scanner activity" },
    { name: "ThreatBook", url: `https://threatbook.io/ip/${ip}`, category: "IP Intelligence", description: "Threat intelligence & IOCs" },
    { name: "IPVoid", url: `https://www.ipvoid.com/ip-blacklist-check/?ip=${ip}`, category: "IP Intelligence", description: "Multi-blacklist checker" },
    { name: "MXToolbox (IP)", url: `https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${ip}`, category: "IP Intelligence", description: "Blacklist check & network tools" },
    { name: "Talos Intelligence", url: `https://talosintelligence.com/reputation_center/lookup?search=${ip}`, category: "IP Intelligence", description: "Cisco Talos IP reputation" },
    { name: "IBM X-Force", url: `https://exchange.xforce.ibmcloud.com/ip/${ip}`, category: "IP Intelligence", description: "IBM threat intelligence" },
    { name: "Pulsedive", url: `https://pulsedive.com/indicator/?ioc=${ip}`, category: "IP Intelligence", description: "Threat intelligence platform" },

    // Domain Intelligence
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
    { name: "Robtex", url: `https://www.robtex.com/dns-lookup/${domain}`, category: "Domain Intelligence", description: "DNS graph & reverse lookup" },
    { name: "MXToolbox (Domain)", url: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${domain}`, category: "Domain Intelligence", description: "DNS, MX, SPF & email analysis" },
    { name: "HackerTarget DNS", url: `https://hackertarget.com/dns-lookup-online/?q=${domain}`, category: "Domain Intelligence", description: "Free DNS lookup & zone transfer" },
    { name: "ViewDNS.info", url: `https://viewdns.info/whois/?domain=${domain}`, category: "Domain Intelligence", description: "WHOIS, IP history & reverse IP" },
    { name: "DNSlytics", url: `https://dnslytics.com/domain/${domain}`, category: "Domain Intelligence", description: "DNS analytics & reverse IP" },
    { name: "PassiveDNS", url: `https://www.passivedns.com/browse?qtype=A&q=${domain}`, category: "Domain Intelligence", description: "Passive DNS history" },
    { name: "RiskIQ / Defender TI", url: `https://ti.defender.microsoft.com/search?query=${domain}`, category: "Domain Intelligence", description: "Microsoft threat intelligence" },
    { name: "Pulsedive (Domain)", url: `https://pulsedive.com/indicator/?ioc=${domain}`, category: "Domain Intelligence", description: "Domain threat scoring" },

    // Attack Surface
    { name: "Shodan (Domain)", url: `https://www.shodan.io/search?query=hostname%3A${domain}`, category: "Attack Surface", description: "Exposed services linked to domain" },
    { name: "FOFA", url: `https://en.fofa.info/result?qbase64=${Buffer.from(`domain="${domain}"`).toString("base64")}`, category: "Attack Surface", description: "Internet asset search engine" },
    { name: "ZoomEye", url: `https://www.zoomeye.org/searchResult?q=${encodeURIComponent(`site:${domain}`)}`, category: "Attack Surface", description: "Cyberspace search engine" },
    { name: "Censys (Domain)", url: `https://search.censys.io/search?resource=hosts&q=${encodeURIComponent(`parsed.names: ${domain}`)}`, category: "Attack Surface", description: "TLS certificates & host exposure" },
    { name: "Google Dorks", url: `https://www.google.com/search?q=site%3A${domain}`, category: "Attack Surface", description: "All indexed pages on this domain" },
    { name: "Google — Login Pages", url: `https://www.google.com/search?q=site%3A${domain}+inurl%3Alogin`, category: "Attack Surface", description: "Login/admin panels indexed by Google" },
    { name: "Google — Sensitive Files", url: `https://www.google.com/search?q=site%3A${domain}+ext%3Apdf+OR+ext%3Axls+OR+ext%3Aenv`, category: "Attack Surface", description: "Exposed documents & config files" },
    { name: "Bing (Domain)", url: `https://www.bing.com/search?q=site%3A${domain}`, category: "Attack Surface", description: "Bing-indexed pages" },
    { name: "Wayback CDX API", url: `http://web.archive.org/cdx/search/cdx?url=*.${domain}&output=text&fl=original&collapse=urlkey&limit=100`, category: "Attack Surface", description: "All archived URLs via Wayback API" },
    { name: "GitHub Code Search", url: `https://github.com/search?q=%22${domain}%22&type=code`, category: "Attack Surface", description: "Code mentioning this domain on GitHub" },
    { name: "Grep.app", url: `https://grep.app/search?q=${encodeURIComponent(domain)}`, category: "Attack Surface", description: "Code search across 500k+ repos" },
    { name: "TruffleHog (OSS)", url: `https://trufflesecurity.com/`, category: "Attack Surface", description: "Scan for secrets in repos" },
    { name: "OWASP Amass", url: `https://github.com/owasp-amass/amass`, category: "Attack Surface", description: "Advanced subdomain enumeration" },
    { name: "Hunter.io", url: `https://hunter.io/domain-search?domain=${domain}`, category: "Attack Surface", description: "Email addresses on this domain" },

    // Reputation
    { name: "Google Safe Browsing", url: `https://transparencyreport.google.com/safe-browsing/search?url=${domain}`, category: "Reputation", description: "Google malware & phishing check" },
    { name: "Sucuri SiteCheck", url: `https://sitecheck.sucuri.net/results/${domain}`, category: "Reputation", description: "Malware scanner & blacklist check" },
    { name: "Quttera", url: `https://quttera.com/sitescan/${domain}`, category: "Reputation", description: "Web malware detection" },
    { name: "Web of Trust (WOT)", url: `https://www.mywot.com/scorecard/${domain}`, category: "Reputation", description: "Community-based reputation score" },
    { name: "Trend Micro Site Safety", url: `https://global.sitesafety.trendmicro.com/?url=${domain}`, category: "Reputation", description: "Website safety check" },
    { name: "Norton Safe Web", url: `https://safeweb.norton.com/report/show?url=${domain}`, category: "Reputation", description: "Norton safety rating" },

    // SSL / Certificates
    { name: "SSL Labs Test", url: `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`, category: "SSL / Certificates", description: "Full TLS/SSL configuration grading" },
    { name: "Crt.sh (Wildcard)", url: `https://crt.sh/?q=%25.${domain}`, category: "SSL / Certificates", description: "Wildcard cert transparency search" },
    { name: "Certificate Search", url: `https://search.censys.io/certificates?q=parsed.subject_dn%3A${domain}`, category: "SSL / Certificates", description: "Censys certificate database" },
    { name: "Observatory (Mozilla)", url: `https://observatory.mozilla.org/analyze/${domain}`, category: "SSL / Certificates", description: "Mozilla HTTP Observatory security test" },
  ];

  if (!ip) return links.filter(l => l.category !== "IP Intelligence");
  return links;
}

router.post("/recon/scan", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

  const { url } = parsed.data;
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { return res.status(400).json({ error: "Invalid URL" }); }

  const domain = parsedUrl.hostname;

  let ipAddress = "";
  let responseHeaders: Record<string, string> = {};
  let htmlContent = "";
  let httpStatus = 0;
  let responseTime = 0;
  let finalUrl = url;

  try {
    const result = await fetchUrl(url, { timeout: 12000, maxSize: 500_000 });
    responseHeaders = result.headers;
    htmlContent = result.body;
    httpStatus = result.status;
    responseTime = result.responseTime;
    if (responseHeaders["location"]) finalUrl = responseHeaders["location"];
  } catch {}

  try {
    const ips = await dns.resolve4(domain).catch(() => []);
    ipAddress = ips[0] ?? "";
  } catch {}

  const [techStack, dnsRecords, relatedDomains, robotsTxt, securityTxt] = await Promise.all([
    detectTechStack(url, httpStatus, responseHeaders, htmlContent, responseTime),
    resolveDns(domain),
    findRelatedDomains(domain),
    fetchRobotsTxt(url),
    fetchSecurityTxt(url),
  ]);

  const osintLinks = buildOsintLinks(domain, ipAddress);
  const emailSecurity = analyzeEmailSecurity(dnsRecords);
  const headerInfo = analyzeResponseHeaders(responseHeaders);

  return res.json({
    url,
    finalUrl: finalUrl !== url ? finalUrl : undefined,
    domain,
    ipAddress,
    httpStatus,
    responseTime,
    techStack,
    subdomains: [],
    dnsRecords,
    relatedDomains,
    osintLinks,
    emailSecurity,
    headerInfo,
    robotsTxt,
    securityTxt,
    scannedAt: new Date().toISOString(),
  });
});

export default router;
