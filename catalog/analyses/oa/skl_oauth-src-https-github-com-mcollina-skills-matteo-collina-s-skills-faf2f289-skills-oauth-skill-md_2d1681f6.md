---
schema_version: 1
skill_id: skl_oauth-src-https-github-com-mcollina-skills-matteo-collina-s-skills-faf2f289-skills-oauth-skill-md_2d1681f6
source_hash: sha256:dd39a54b63d303e1f94b2d81e1f38cfe685f18f5
analysis_version: 1
confidence: high
updated_at: "2026-07-10T22:00:00+08:00"
---

# oauth (mcollina/skills)

A tightly scoped, Fastify-specific OAuth 2.0 implementation guide with working TypeScript code for authorization code + PKCE flow, JWT validation middleware, and refresh token rotation. If you are using Fastify and need OAuth, this skill gives you a 30-line-per-file implementation you can copy, adapt, and have running in minutes. If you are using any other Node.js framework, this skill is decorative.

## What makes it genuinely useful

The code is real, not placeholder. Every snippet imports actual `@fastify/oauth2` functions, uses `FastifyInstance` types, registers plugins with `fastify-plugin`, and handles error cases explicitly. The `verifyToken` hook doesn't just call `request.jwtVerify()` and call it done — it validates `exp`, `iss`, and `aud` separately with proper RFC 7519 references. Most OAuth tutorials skip these checks; this skill makes them required.

The security checklist with RFC references is the skill's best feature. "Validate redirect URI against allowlist (RFC 6749 §3.1.2)," "PKCE (S256) for all public clients (RFC 7636 §4.2)," "Validate state to prevent CSRF (RFC 6749 §10.12)" — these are concrete, verifiable requirements, not vague "be secure" advice. An agent that follows this checklist produces an OAuth implementation that passes a competent security review.

The anti-patterns section is short but punches above its weight: "storing tokens in localStorage," "skipping audience validation," "using implicit flow," "accepting response_type=token in browser apps" — these are real, common mistakes that lead to token theft and account takeover. The skill doesn't just say "don't do this" — it says WHY and WHAT to do instead.

The skill references four additional documents (`DEVICE_FLOW.md`, `TOKEN_VALIDATION.md`, `CLIENT_CREDENTIALS.md`, `MOBILE_OAUTH.md`) for other OAuth flows. These are not included in the SKILL.md body and must be fetched separately. If they exist and contain similar code quality, the skill's coverage expands significantly. If they don't, the skill covers only authorization code flow.

## Where it helps, where it hurts

**Best-case scenario**: You are building a Fastify API from scratch or adding authentication to an existing one. You've never used `@fastify/oauth2` before. You follow the skill's 6 steps in order: install, register plugin, handle callback, create JWT middleware, protect routes, add refresh rotation. You get a functional OAuth implementation with proper PKCE, state validation, JWT claim checking, and secure cookie handling. The security checklist catches the redirect URI validation you would have forgotten. The anti-pattern warnings prevent you from using HS256 for third-party tokens. You ship something secure on the first attempt.

**Worst-case scenario**: You are not using Fastify. The entire skill is dead code to you. The `@fastify/oauth2` plugin registration pattern, the `FastifyInstance` types, the `fastify.addHook('onRequest', ...)` route protection — none of it transfers to Express, Koa, Hono, or raw Node.js `http`. The JWT validation logic is portable (it's mostly standard `jsonwebtoken` patterns), but the OAuth plugin setup accounts for half the skill and is framework-locked.

Another failure mode: your OAuth provider has a non-standard configuration — custom token endpoint paths, no PKCE support, a different grant type, or a token format that isn't JWT. The skill assumes a standard OAuth 2.0/2.1 authorization server with `/authorize` and `/token` endpoints, PKCE support, and JWT-format access tokens. If your provider deviates, the step-by-step instructions don't apply and the skill provides no adaptation guidance.

A subtle failure: the skill's logout route (`request.session.destroy()`) lacks CSRF protection. A logout CSRF attack can force a user into a logged-out state. The checklist covers login CSRF but not logout CSRF.

## What it quietly assumes

Fastify, first and foremost. The skill title says "oauth" generically but the content says "Fastify" on every line. This isn't a hidden assumption — it's stated — but it's more constraining than the skill's name suggests. Fastify has roughly 5-10% of the Node.js framework market share.

TypeScript everywhere. The code uses `FastifyInstance`, `FastifyRequest`, `FastifyReply`, and type assertions like `request.user as Record<string, unknown>`. If you're writing plain JavaScript, the type annotations are noise and `as` assertions may break parsers.

Environment variables for secrets (`process.env.CLIENT_ID!`, `process.env.CLIENT_SECRET!`). If you use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler), the code needs restructuring. The non-null assertions (`!`) also mean TypeScript won't catch missing environment variables at compile time — they'll fail at runtime with an unhelpful `undefined` error.

`@fastify/cookie` and `@fastify/session` are listed as dependencies in the install step but their configuration (cookie secret, session store, cookie options) is never shown. The skill assumes you already have sessions set up or know how to do it. If you don't, the callback handler's `request.session.set()` calls will fail silently or throw.

HTTPS is in the checklist but not enforced. The code runs identically on `localhost:3000` over HTTP during development, where token interception is trivially possible. The skill should warn about this but doesn't.

These assumptions hold for experienced Fastify developers setting up authentication. For someone new to Fastify who needs session configuration and HTTPS setup too, the skill is incomplete.

## What could go wrong

Shell execution: `npm install @fastify/oauth2 @fastify/cookie @fastify/session fastify-plugin` — standard, low risk.

Filesystem writes: creating `plugins/oauth.ts`, `routes/auth.ts`, `hooks/verifyToken.ts`, `routes/api.ts`. Low risk, all in project source directories.

The real risk is misconfiguration that creates a security vulnerability. If the agent copies the code but skips the security checklist (which is in prose, not enforced by code), the OAuth implementation will accept tokens without issuer validation, skip audience checking, or fail to validate state parameters. The code has the hooks for these checks but the agent must wire them in by setting `EXPECTED_ISSUER` and `EXPECTED_AUDIENCE` environment variables and implementing the state check function. The skill tells you to do this but can't verify you did.

The `request.session.destroy()` call is destructive and lacks confirmation. If the logout route is mounted at a path that gets called accidentally, all session data is lost.

No credential access is required for the skill itself — the application it builds will handle OAuth tokens, but the skill is code generation, not runtime execution.

## Bottom line

This is a well-executed, narrowly useful OAuth skill for Fastify. The code quality and security checklist are above average for this class of skill. But the Fastify lock-in means 90% of Node.js developers can't use it directly. The skill's name ("oauth") promises general OAuth knowledge; the content delivers Fastify-specific implementation. In a tight catalog, I'd keep this only if there isn't a broader Node.js OAuth skill — or if the catalog specifically needs Fastify ecosystem coverage. The skill earns its spot through quality, not breadth.

## Confidence: high

I read the full source, understand OAuth 2.0/2.1 flows and the Fastify ecosystem, and have formed concrete judgments about every aspect.
