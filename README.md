# Shams Bakery Manager

German / Arabic bakery administration for a single company: customers, employees, stock, orders, draft and issued invoices, payments and cancellations. Starts without example business records. Company details must be entered before issuing an invoice.

## Hosting and access

This application requires the owner-private Sites authentication gateway. Application routes do not implement standalone authentication. Do not deploy this source to a public host, disable the gateway, or expose the Worker origin directly. Employee records are a directory, not login accounts or access roles. Multi-user access requires a separate authorization implementation and review.

Data uses the `DB` D1 binding and logos use `BUCKET` R2. Apply the tracked migrations when provisioning a new environment. Never commit access tokens, real business exports or personal data.

## Development

Node 22.13+ is required. Install from package-lock.json using the Sites dependency installer, then use `npm run build`. Run `node --test tests/bakery-domain.test.mjs tests/security.test.mjs tests/print-output.test.mjs` for business, request-validation and invoice-rendering checks. Supervised Sites preview is required for interactive browser QA.

## Invoice scope

Amounts are stored in cents; line totals are rounded before VAT is grouped by rate. Issuance assigns sequential numbers and freezes seller and buyer details. Issued invoices cannot be edited or deleted; corrections preserve both original and cancellation documents. Payments have reversal records.

Print output is a German paper invoice / ordinary PDF, not structured XRechnung or ZUGFeRD. The application checks required fields for its supported domestic invoice workflow and blocks unsupported cases. It does not certify legal compliance, replace tax advice, implement a fiscal cash register/TSE, or provide full GoBD accounting and archival controls. Tax rates and company details must be verified for the actual business. Backups and restoration need an operational policy.

## Security review

Requests have streamed size limits, schema validation, same-origin mutation checks, safe error messages and optimistic concurrency protection. Logos are restricted by signature, dimensions and size. Dynamic responses prohibit caching. Unused image-proxy endpoints are disabled. These controls complement the private hosting gateway; they do not guarantee absolute security.

Automated checks are not a penetration test. Browser QA must be repeated when the supervised preview service becomes available. Dependency advisories must be monitored; audit findings and framework upgrades need review before broadening access.
