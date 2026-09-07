# Security review — 2026-09-07

Deployment boundary: owner-private Sites gateway. Authentication is supplied by that gateway, not these application routes. Do not publish the Worker directly or change access to public.

Implemented controls: streaming request-size enforcement, strict command envelopes and record schemas, same-origin mutation protection, validated and bounded logo uploads, optimistic database revisions, preserved issued-document snapshots, output escaping through React, no-store responses, and defensive response headers.

The unused `/_vinext/image` and `/_next/image` proxies return 404. Only PNG/JPEG/WebP logos are accepted. No untrusted image files should be added to the build source.

Dependency audit after compatible updates: six findings remain in development dependencies: four moderate findings in the drizzle-kit/esbuild chain, and two high findings in vinext/image-size. The affected legacy esbuild development server is not used by this application. The image proxy is disabled; image-size remains a build dependency. These are mitigations, not a claim that the dependency advisories are resolved. A future compatible framework/tooling update must remove them. Do not use `npm audit fix --force` without reviewing its proposed breaking changes.

The complete automated suite passes 21 checks, including business rules, request validation, invoice rendering, Worker headers and UI component contracts. TypeScript validation and the production build also pass. Interactive browser testing was blocked by the supervised preview service being unavailable. This review is not a complete penetration test or a guarantee of zero vulnerabilities. No multi-user authorization or full legal/accounting certification is supplied.
