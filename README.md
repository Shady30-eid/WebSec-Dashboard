# WebSec Dashboard

A professional-grade, all-in-one web security analysis platform. Scan any website for vulnerabilities, misconfigurations, and performance issues — all from a single dark-themed dashboard.

![Dashboard](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Node](https://img.shields.io/badge/Node.js-24-green) ![React](https://img.shields.io/badge/React-19-blue)

---

## Features

### WAF Checker (Active Testing)
Fires **140+ attack payloads** across 8 injection categories at a target URL and shows real-time, color-coded results:
- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Command Injection
- Path Traversal
- XML External Entity (XXE)
- Server-Side Request Forgery (SSRF)
- Local File Inclusion (LFI)
- Remote File Inclusion (RFI)

Each payload response is analyzed and marked **BLOCKED** (green), **PASSED** (red), or **ERROR** (yellow). An overall block rate and letter grade are displayed.

### Reconnaissance (Passive)
Perform passive intelligence gathering against any domain:
- **Tech Stack Detection** — identifies frameworks, CMS, CDN, server software, and frontend libraries
- **Subdomain Discovery** — probes common subdomains (www, mail, api, admin, dev, staging, etc.) via DNS
- **DNS Records** — enumerates A, AAAA, MX, NS, TXT, CNAME, and SOA records

### Security Headers Audit
Fetches the HTTP response headers of any URL and grades them from **A+ to F**:
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- X-XSS-Protection
- Cache-Control
- Server header exposure

Each header receives an individual score and actionable recommendation.

### Page Speed Test
Measures real performance metrics simulating Lighthouse / Core Web Vitals:
- Largest Contentful Paint (LCP)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Speed Index
- Time to First Byte (TTFB)

Ratings: **Good / Needs Improvement / Poor** with an overall performance score.

### SEO Audit
Analyzes on-page SEO health and structured data:
- Title tag and meta description presence and length
- Canonical URL
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card meta tags
- JSON-LD structured data
- Heading structure (H1–H6)
- Images missing alt attributes
- Robots meta directives
- Sitemap and robots.txt detection

### Report Export
Every scan result can be exported as:
- **HTML** — a polished, self-contained report ready to share with clients
- **JSON** — raw structured data for integration with other tools or pipelines

---

## Screenshots

| Dashboard | WAF Checker | Security Headers |
|-----------|------------|-----------------|
| Dark-themed landing with tool cards | Real-time payload results | A+ to F graded header audit |

---

## Installation on Kali Linux

### Prerequisites

Make sure you have the following installed:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git nodejs npm -y
```

Install pnpm globally:

```bash
npm install -g pnpm
```

### Clone the Repository

```bash
git clone https://github.com/Shady30-eid/WebSec-Dashboard.git
cd WebSec-Dashboard
```

### Install Dependencies

```bash
pnpm install
```

If you are using any Python-based companion scripts included in this repository:

```bash
pip install -r requirements.txt
```

### Run the Application

Open **two terminals** inside the project folder:

**Terminal 1 — API Server:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend:**
```bash
pnpm --filter @workspace/security-toolkit run dev
```

The dashboard will be available at **`http://localhost:5173`**

> The frontend automatically proxies all `/api` requests to the API server on port 8080, so no extra configuration is needed.

---

## Project Structure

```
WebSec-Dashboard/
├── artifacts/
│   ├── api-server/          # Express API backend
│   │   └── src/routes/
│   │       ├── waf.ts       # WAF testing (140+ payloads)
│   │       ├── recon.ts     # Reconnaissance & DNS
│   │       ├── headers.ts   # Security header grading
│   │       ├── speed.ts     # Performance metrics
│   │       ├── seo.ts       # SEO analysis
│   │       └── report.ts    # HTML/JSON export
│   └── security-toolkit/    # React + Vite frontend
│       └── src/pages/
│           ├── Dashboard.tsx
│           ├── WafChecker.tsx
│           ├── Recon.tsx
│           ├── Headers.tsx
│           ├── Speed.tsx
│           └── Seo.tsx
├── lib/
│   ├── api-spec/            # OpenAPI specification
│   └── api-client-react/    # Auto-generated React Query hooks
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript |
| Styling | Custom CSS (dark theme) |
| State / Data Fetching | TanStack React Query |
| Backend | Express 5, TypeScript, Node.js 24 |
| API Contract | OpenAPI 3.0 (Orval codegen) |
| Package Manager | pnpm workspaces (monorepo) |

---

## Legal Disclaimer

> **For authorized use only.** Only scan websites and services you own or have explicit written permission to test. Unauthorized security scanning may violate computer fraud laws. The authors assume no liability for misuse of this tool.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
