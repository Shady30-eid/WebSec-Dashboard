# Security Toolkit

## Overview

A professional-grade web security analysis dashboard built with React + Vite frontend and Express backend in a pnpm monorepo.

## Features

- **WAF Checker** — fires 140+ attack payloads (SQLi, XSS, command injection, path traversal, XXE, SSRF, LFI, RFI) against a target URL and shows real-time results with color-coded blocked/passed/error status
- **Reconnaissance** — tech stack detection, subdomain discovery via DNS, DNS record enumeration
- **Security Headers Audit** — grades HTTP security headers A+ to F (CSP, HSTS, X-Frame-Options, Referrer-Policy, etc.)
- **Page Speed Test** — Core Web Vitals (LCP, FCP, TTI, TBT, CLS, Speed Index, TTFB) with scores
- **SEO Audit** — meta tags, Open Graph, Twitter Card, structured data, heading analysis
- **Report Export** — HTML and JSON export for all scan results

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/security-toolkit)
- **API framework**: Express 5 (artifacts/api-server)
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (CJS bundle for API)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `artifacts/security-toolkit/` — React + Vite frontend, serves at `/`
- `artifacts/api-server/` — Express API server, serves at `/api`
- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod validation schemas

## API Routes

- `POST /api/waf/test` — WAF payload testing
- `POST /api/recon/scan` — Reconnaissance (tech stack, DNS, subdomains)
- `POST /api/headers/audit` — Security headers grading
- `POST /api/speed/test` — Page performance metrics
- `POST /api/seo/audit` — SEO analysis
- `POST /api/report/export` — HTML/JSON report generation

## Notes

- Frontend uses dark mode exclusively (security tool aesthetic)
- All scans make real outbound HTTP requests to target URLs
- WAF tests fire payloads as GET parameters and check for 403/406 status codes indicating WAF blocking
- Export generates downloadable HTML or JSON files client-side via Blob
