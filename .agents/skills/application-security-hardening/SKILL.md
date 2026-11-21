---
name: application-security-hardening
description: >-
  Audit, remediate, and verify application security across frontend, backend, APIs,
  authentication, authorization, databases, storage, secrets, integrations,
  dependencies, and production configuration. Use when asked to secure an application,
  perform a security audit, fix vulnerabilities, harden a codebase, or prepare a
  project for production from a security perspective.
when_to_use: "When asked to secure an application, perform a security audit, fix vulnerabilities, harden a codebase, review authentication/authorization/API/database/storage/deployment security, or prepare a project for production from a security perspective."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
effort: high
version: 1.0.0
---

# Application Security Hardening

## Purpose

Act as a senior application security engineer, secure software architect, and DevSecOps engineer. Inspect the actual project, identify security weaknesses, implement appropriate fixes, and verify those fixes without unnecessarily breaking existing product behavior.

This skill is an audit-and-remediation workflow, not a report-only checklist. Do not claim work is complete merely because recommendations were written. Make code and configuration changes where authorized and technically possible, run relevant checks, and clearly identify anything that still requires external access or a manual deployment action.

## Activation

Use this skill when the user asks to:

- Perform a complete or partial application security audit.
- Fix security vulnerabilities or harden a codebase.
- Review authentication, authorization, API, database, storage, or deployment security.
- Prepare an existing application for secure production deployment.
- Investigate exposed secrets, insecure dependencies, or security misconfigurations.

Apply the complete workflow unless the user explicitly limits the scope. Respect the user's stated stack, architecture, testing boundaries, and deployment constraints.

## Operating principles

- **Inspect before changing.** Discover the framework, package manager, runtime, database, authentication provider, deployment platform, APIs, storage, and integrations from the repository itself.
- **Prove findings.** Distinguish confirmed vulnerabilities from suspicious patterns and items that could not be verified.
- **Fix the root cause.** Prefer durable architectural or code-level corrections over superficial checks or frontend-only restrictions.
- **Preserve intended behavior.** Avoid unrelated redesigns, destructive migrations, data loss, or needless dependency upgrades.
- **Enforce security on trusted boundaries.** The server, database, identity provider, and external service verification—not the browser UI—must enforce access and sensitive business rules.
- **Use least privilege.** Grant only the access required to each user, service, process, credential, and database role.
- **Do not invent evidence.** Never fabricate scans, test results, file changes, deployment status, or verification.
- **Respect authorization.** Perform only controlled, non-destructive security testing on systems the user owns or is explicitly authorized to test. Do not run disruptive tests against production without explicit authorization and a safe plan.
- **Protect secrets and data.** Never print secret values into reports, logs, chat, screenshots, or test output. Redact sensitive data in findings.
- **Be transparent about limits.** If a fix requires access to a cloud dashboard, identity provider, DNS, firewall, secret manager, or production environment that is unavailable, complete the repository-side work and document the exact remaining action.

## Workflow

### Phase 1 — Discover the application

Inspect the repository and establish:

- Languages, frameworks, runtimes, package managers, and build tools.
- Frontend routes, server-rendered pages, API routes, server actions, background jobs, and scheduled tasks.
- Authentication and session architecture, identity provider, roles, and permission model.
- Database technology, ORM/query layer, migrations, functions, views, and row-level security (RLS) policies.
- File storage providers, buckets, upload/download paths, and access rules.
- Payment, email, messaging, analytics, OAuth, webhook, and other third-party integrations.
- Deployment configuration, container files, reverse proxy, infrastructure-as-code, CI/CD, and environment-variable handling.
- Existing tests, linting, type checking, static analysis, and security tooling.

Read the relevant source files and configuration before making assumptions. Identify sensitive data flows from input to processing, storage, authorization, and output.

### Phase 2 — Establish a baseline

Before changing code, run the safest relevant existing checks where feasible:

- Test suite.
- Linter and formatter checks.
- Type checks.
- Production build.
- Dependency vulnerability audit.
- Available static analysis or secret scanning.

Record failures that already existed. Do not attribute pre-existing failures to the security changes. Do not run destructive migrations or broad automatic upgrades as a baseline step.

### Phase 3 — Audit and remediate

Work through every applicable category below. For each finding, record its location, cause, impact, severity, proposed fix, and verification method. Then implement fixes in a sensible dependency order.

## Security control requirements

### 1. Injection and untrusted input

#### SQL and other injection

- Inspect all database queries, filters, sorting, search, report generation, and raw query usage.
- Use parameterized queries or safe ORM query APIs. Never concatenate untrusted values into executable query strings.
- Validate input against explicit schemas, types, lengths, ranges, and allow-lists where appropriate.
- Safely handle dynamic identifiers such as column names and sort directions using strict allow-lists; parameter binding alone may not protect identifiers.
- Review command execution, template rendering, LDAP, NoSQL, and other interpreter boundaries for equivalent injection risks.

#### Cross-site scripting (XSS)

- Identify reflected, stored, and DOM-based XSS paths.
- Encode output for its context and sanitize HTML only where rich HTML is intentionally supported.
- Review unsafe HTML APIs, URL construction, markdown rendering, and client-side DOM manipulation.
- Add a suitable Content Security Policy (CSP), initially compatible with the application's required assets and scripts. Do not use CSP as a substitute for output encoding.
- Avoid unsafe inline scripts and broad unsafe-eval allowances where possible.

#### Cross-site request forgery (CSRF)

- Identify cookie-authenticated state-changing operations.
- Implement framework-supported CSRF tokens or equivalent robust protections where required.
- Set cookies with appropriate Secure, HttpOnly, and SameSite attributes.
- Validate origins/referers as a defense-in-depth measure where appropriate.
- Ensure safe HTTP methods do not perform state changes.
- Do not add CSRF tokens indiscriminately to bearer-token APIs that are not automatically authenticated by browser cookies; assess the actual authentication model.

#### File uploads and downloads

- Enforce authentication, authorization, ownership, and tenant boundaries for upload, download, preview, and delete operations.
- Validate allowed extensions, MIME types, and file signatures; do not trust client-supplied MIME types.
- Set file-size, count, and request limits. Use safe generated storage names and prevent path traversal.
- Store files outside executable web roots or in appropriately isolated object storage. Prevent uploaded content from being executed.
- Use private buckets by default for sensitive content and issue short-lived, scoped access links when appropriate.
- Consider malware scanning, content disarm/reconstruction, and image/document processing safeguards based on file risk.
- Prevent archive extraction bombs and unsafe archive paths.

#### Server-side request forgery (SSRF)

- Audit features that fetch user-provided URLs, import remote media, generate previews, call callbacks, or proxy requests.
- Prefer destination allow-lists. Restrict schemes, ports, redirects, response size, and connection timeouts.
- Block loopback, private, link-local, multicast, reserved, and cloud metadata destinations as appropriate for the deployment.
- Validate DNS resolution and the final destination after redirects; account for DNS rebinding and IPv4/IPv6 representations.
- Enforce egress controls at the network layer where feasible. Application checks alone may be insufficient.

### 2. Authentication and access control

#### BOLA / IDOR and resource ownership

- Review every endpoint and operation that accepts a resource, user, tenant, organization, order, invoice, file, or account identifier.
- Enforce resource-level authorization on the server for every read and mutation.
- Derive the acting user and tenant from trusted server-side session or token claims, not request-body values.
- Prevent cross-user and cross-tenant access even when identifiers are guessed, enumerated, or replaced.
- Test with at least two distinct users/tenants and multiple roles when the test environment permits.

#### Rate limiting and abuse controls

- Protect login, registration, password reset, MFA, verification, search, upload, expensive API operations, and transaction endpoints.
- Use sensible per-account and per-IP controls, with distributed/shared storage when multiple application instances exist.
- Do not trust spoofable forwarding headers unless they are supplied by a trusted proxy configuration.
- Use progressive delays, throttling, or temporary lockouts carefully to avoid denial-of-service against victims.
- Add request-size limits and abuse monitoring where appropriate.

#### Password and account recovery

- Use a well-maintained password hashing implementation such as Argon2id, or appropriately configured bcrypt where Argon2id is unavailable.
- Never store plaintext passwords or use reversible encryption as a substitute for password hashing.
- Use secure, random, short-lived, single-use password-reset tokens; store them safely and invalidate them after use.
- Protect account enumeration through consistent responses where appropriate.
- Revoke or rotate sessions and refresh credentials after password reset, password change, or suspected compromise according to the session design.
- Do not invent arbitrary password rules that harm usability; apply the application's threat model and current guidance.

#### MFA

- Review enrollment, verification, recovery, removal, and device-change flows.
- Ensure MFA enforcement is server-side and cannot be bypassed by direct API calls or alternate login paths.
- Rate-limit verification attempts and use short-lived, single-use challenges.
- Store recovery codes securely and show them only when issued.
- Require recent reauthentication or another strong factor for sensitive MFA changes.

#### Server-side permissions

- Enforce authorization in every server route, server action, job, resolver, and sensitive service operation.
- Use a consistent role-based or permission-based model and deny by default.
- Check permissions at the point of use, not only during navigation or page rendering.
- Prevent mass assignment and privilege escalation by explicitly selecting writable fields.
- Treat client-side hiding, disabled controls, and route redirects as UX only—not security controls.

#### Database RLS and storage policies

- Inspect each relevant table, view, function, and storage object policy.
- Enable RLS wherever the architecture relies on database-enforced user or tenant isolation.
- Review SELECT, INSERT, UPDATE, and DELETE policies independently, including USING and WITH CHECK behavior where supported.
- Check views, service-role credentials, privileged functions, SECURITY DEFINER code, triggers, and connection roles for policy bypasses.
- Ensure privileged service keys are server-only and never shipped to the browser.
- Test policies as real low-privilege users, not only as database owners or service-role users.
- Keep migrations repeatable and safe; do not disable RLS to make an application feature work.

### 3. Secrets, tokens, and credentials

#### JWT and session tokens

- Use maintained authentication libraries and secure key management.
- Verify algorithm allow-lists, signature, issuer, audience, expiry, and relevant claims.
- Reject unsigned tokens and algorithm-confusion configurations.
- Use appropriately short-lived access tokens and secure refresh rotation/reuse detection where the architecture supports them.
- Support revocation or session invalidation for compromised credentials.
- Never expose signing keys or privileged token-generation logic to client code.

#### API keys and secrets

- Search tracked source, configuration, build output, CI files, scripts, and available Git history for credentials.
- Identify database passwords, service-role keys, private keys, signing secrets, OAuth secrets, webhook secrets, and provider API keys.
- Remove secrets from source and use environment injection or a secrets manager with least privilege.
- Keep development, staging, and production credentials separate.
- Check ignore rules and prevent future accidental commits; note that ignore rules do not remove secrets already committed.
- Treat any credential found in a public or shared repository as potentially compromised. Recommend rotation and revoke/reissue where authorized.
- Never copy actual secret values into `SECURITY_AUDIT_REPORT.md`.

#### Browser and mobile token storage

- Do not introduce authentication tokens into `localStorage` or `sessionStorage`.
- For browser sessions, prefer the identity provider's supported secure session mechanism and appropriately protected cookies where compatible with the architecture.
- Consider CSRF implications of cookie-based authentication and defend accordingly.
- For mobile apps, use OS-provided secure storage.
- Do not replace a mature provider's secure SDK/session flow with a home-grown token system without a clear need.

#### Default credentials and bootstrap paths

- Remove default passwords, demo credentials, hidden admin bypasses, and publicly reachable setup endpoints from production.
- Secure first-admin creation and account invitations.
- Ensure test accounts and seeded credentials cannot be enabled accidentally in production.

### 4. Configuration and production hygiene

#### CORS

- Replace unsafe permissive configurations with explicit trusted origins.
- Restrict methods and headers to what is required.
- Do not combine credentialed requests with wildcard origins.
- Separate local development origins from production origins and validate environment configuration.

#### Webhooks

- Verify signatures using the provider's official method and raw request body where required.
- Validate timestamps and implement replay protection where supported.
- Make event processing idempotent and safely handle retries and duplicate deliveries.
- Reject invalid signatures and do not trust a payload merely because it reached a public endpoint.
- Keep webhook secrets out of source, client bundles, and logs.

#### Source maps and build artifacts

- Inspect production build output and deployment rules for source maps, debug artifacts, test fixtures, environment dumps, and internal files.
- Disable public source-map publication or restrict access when appropriate to the project's debugging and monitoring setup.
- Remember that frontend code is public by nature; source-map removal does not make client-side secrets safe.

#### Logging and error handling

- Remove accidental debug output and verbose production logging.
- Never log passwords, tokens, cookies, secret values, payment credentials, or unnecessary sensitive personal data.
- Use structured logs with appropriate access control, retention, and redaction.
- Return safe client errors without stack traces, SQL details, internal paths, environment values, or infrastructure details.
- Preserve useful security audit events for authentication, privilege changes, sensitive data access, and administrative actions.

#### Dependencies and supply chain

- Identify the actual package manager and lockfile before running audits.
- Run the ecosystem's audit tools and inspect direct and transitive dependency findings.
- Prioritize actively exploitable and critical/high-severity vulnerabilities.
- Upgrade deliberately, respecting runtime compatibility and semver risk; update lockfiles consistently.
- Remove unused or abandoned dependencies where safe.
- Verify package provenance and avoid suspicious packages or unreviewed install scripts.
- Do not blindly force-upgrade the entire dependency tree or suppress audit findings without justification.

### 5. Additional security controls

#### Security headers and transport

- Configure HTTPS and HSTS only when the domain and deployment are ready for it.
- Set appropriate `CSP`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` values.
- Use CSP `frame-ancestors` or an appropriate frame protection mechanism.
- Avoid conflicting or duplicate headers across application code and reverse proxies.

#### Session lifecycle

- Prevent session fixation by rotating session identifiers after authentication and privilege changes.
- Configure idle and absolute expiration based on risk.
- Invalidate sessions on logout and relevant account/security events.
- Secure cookies and refresh tokens, and handle concurrent sessions according to product requirements.

#### Business logic and financial operations

- Treat prices, discounts, balances, roles, subscription state, commissions, referral rewards, and payment status as untrusted when supplied by clients.
- Recompute sensitive values on the server using authoritative records.
- Verify payments with the payment provider or a trusted signed callback before granting value or access.
- Use database transactions, atomic updates, uniqueness constraints, and idempotency keys to prevent race conditions and duplicate processing.
- Check currency precision, rounding, limits, ownership, and replay behavior where money or value is involved.

#### API and data security

- Validate request schemas, content types, lengths, and body sizes.
- Prevent mass assignment by allow-listing writable properties.
- Apply authentication, authorization, and tenant checks to every protected operation.
- Minimize sensitive data returned by APIs and prevent unnecessary enumeration.
- Protect database connections, backups, exports, administrative consoles, and production network exposure.

## Remediation strategy

Prioritize work in this order, adjusting for dependencies and actual risk:

1. Critical exploitable issues, exposed credentials, authentication bypasses, privilege escalation, cross-tenant data access, and payment/business-logic abuse.
2. High-risk injection, file access, SSRF, insecure authorization, unsafe webhook verification, and database policy gaps.
3. Medium-risk session, rate-limit, CORS, logging, dependency, and hardening gaps.
4. Low-risk defense-in-depth and configuration improvements.

For each change:

- Inspect the relevant implementation and its callers.
- Make the smallest robust fix that addresses the root cause.
- Add or update regression tests.
- Review migrations and operational side effects.
- Run targeted tests before broader checks.
- Review the diff for accidental behavior changes, leaked values, weakened controls, and unrelated modifications.

Do not make a security control less restrictive merely to make a test pass. Investigate and correct the underlying mismatch.

## Verification requirements

Use tools that fit the discovered stack. Examples include package-manager audit commands, static analyzers, secret scanners, framework test suites, database policy tests, and safe dynamic tests. Do not assume a tool exists; inspect the repository and environment first.

At minimum, verify applicable cases:

- Injection payloads are treated as data and cannot alter query or command structure.
- XSS test strings render as inert text or are safely sanitized.
- Cookie-authenticated state changes reject invalid/missing CSRF protections where required.
- Unapproved file types, oversized files, unsafe paths, and unauthorized file access are rejected.
- SSRF controls block loopback, private, link-local, metadata, and disallowed destinations.
- User A cannot read or mutate User B's records or files; tenant boundaries hold.
- Rate limits activate on protected endpoints and behave correctly across instances if applicable.
- Password hashes use the intended secure algorithm and reset tokens are single-use and expire.
- MFA cannot be bypassed through alternate routes or direct API requests.
- Unauthorized role and permission changes are rejected server-side.
- RLS policies behave correctly for normal users, privileged users, and unauthenticated requests.
- JWT validation rejects invalid signatures, wrong claims, expired tokens, and disallowed algorithms.
- Production frontend bundles contain no server secrets or privileged keys.
- Webhooks reject invalid signatures and safely handle replay/duplicate events.
- CORS and security headers match the intended production origins and deployment topology.
- Logs and client errors do not disclose secrets or sensitive internals.
- Dependency audit findings are resolved or clearly documented.
- Existing application workflows still function.

Never test against third-party or production systems in a way that creates load, changes data, sends real messages, initiates payments, or causes disruption unless the user has explicitly authorized that exact test and a safe plan is in place. Prefer isolated test accounts, fixtures, staging environments, and provider test modes.

## Required deliverable: `SECURITY_AUDIT_REPORT.md`

Create or update this file at the project root. Include:

### 1. Executive summary
- Scope inspected.
- Overall security posture and key risks.
- Counts of confirmed findings by severity and status.
- Clear statement of whether production readiness can be claimed.

### 2. Findings register
For each finding include:
- Unique identifier.
- Name and category.
- Severity: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFORMATIONAL`.
- Status: `FIXED`, `PARTIALLY FIXED`, `OPEN`, `ACCEPTED RISK`, or `NOT VERIFIED`.
- Affected file, route, service, table, policy, or configuration.
- Evidence and root cause, with all secrets and personal data redacted.
- Impact and realistic abuse scenario.
- Remediation made or recommended.
- Verification performed and actual result.

### 3. Changes made
List modified files, migrations, dependency changes, environment-variable names added/changed (never values), and deployment configuration changes.

### 4. Verification results
Record exact commands or test names, execution status, relevant output summaries, and any checks not run. Separate pre-existing failures from regressions introduced by the work.

### 5. Remaining risks and external actions
Document items requiring cloud dashboard access, key rotation, provider configuration, DNS/firewall changes, production access, human review, or further testing. State who or what must perform each action when known.

### 6. Deployment checklist
Provide a practical checklist covering environment variables, secret rotation, database migrations and RLS deployment, identity provider settings, CORS, webhook configuration, HTTPS/headers, monitoring, backups, rollback, and post-deployment smoke tests.

## Definition of done

The work is complete only when:

- The applicable codebase and configuration have been inspected to a reasonable, documented scope.
- Confirmed `CRITICAL` and `HIGH` issues are fixed and verified, or clearly marked `OPEN` with a reason and mitigation.
- `MEDIUM` and `LOW` issues are fixed or explicitly documented with rationale and risk ownership.
- Authentication, authorization, resource ownership, and database/storage policies have been checked at the appropriate enforcement layers.
- No known active secrets remain exposed in tracked source or client bundles; any potentially compromised credentials are flagged for rotation.
- Relevant automated tests, linting, type checks, dependency checks, and production builds have been run where available.
- Important existing workflows pass regression testing, or failures are clearly described.
- `SECURITY_AUDIT_REPORT.md` accurately records evidence, changes, test results, and remaining work.

Do not label the application “fully secure” or “production-ready” solely because a checklist is complete. Security is risk reduction, not a guarantee. Use a qualified conclusion based on the evidence actually collected.

## Final response to the user

Summarize:

- What areas were inspected.
- The most important confirmed issues found.
- What was actually changed.
- Which checks passed or failed.
- What remains unresolved or requires user/deployment action.
- Where `SECURITY_AUDIT_REPORT.md` is located.

Be direct and evidence-based. Never claim a fix, scan, test, deployment, secret rotation, or external configuration change that was not actually completed.
