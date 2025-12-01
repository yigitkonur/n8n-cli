---
trigger: model_decision
description: you MUST read this rule WHEN connecting to external service, 'integrate Stripe', 'add OAuth', 'call their API', 'webhook from', 'send to', 'pull from'.
---

# INTEGRATE EXTERNAL API / SERVICE

> Understand BOTH systems. Bridge correctly. Handle all failure modes.
> "Software architecture should evolve incrementally." — Martin Fowler

## HARD RULES
- **NEVER skip external API research** — hidden pitfalls in auth, retries, rate limits
- **NEVER ignore failure modes** — APIs fail, networks timeout, rate limits hit
- **NEVER hardcode credentials** — env vars only, never in code
- **ALWAYS understand internal patterns first** — match existing conventions
- **ALWAYS document API details** — future you needs auth flow, error codes, limits
- **ALWAYS test against real API** — mocks lie, real APIs don't

---

## PHASE 1: LEARN THE API

1. **Clarify scope** — sequentialthinking (see 12-tools-sequential-thinking.md):
   - What API? What endpoints?
   - What auth method?
   - What do I need to learn?
   
   **Legend-Guided Thinking:**
   - While designing the integration, think like **Werner Vogels**: ask "What happens when this API fails?" — design for eventual consistency and graceful degradation from day one
   - While choosing patterns, think like **Martin Fowler**: ask "Can this evolve when the API changes?" — version your client, abstract the interface, prepare for breaking changes
   - While handling errors, think like **Bruce Schneier**: ask "What's the threat model here?" — validate all inputs, never trust external data, handle auth failures securely
   - While deciding what to build, think like **Kelsey Hightower**: ask "Does this complexity earn its place?" — if the simple approach works, don't add abstraction layers
   - While implementing, think like **Brendan Eich**: ask "What's the pragmatic path to shipping?" — perfect is the enemy of shipped; iterate after you have real usage data

2. **Read API docs** — read_url_content (see 15-tools-core-file-ops.md):
   - Authentication, rate limits, errors, endpoints

3. **Extract patterns** — scrape_links (see 11-tools-research-powerpack.md) for SDK/examples

4. **Research integration** — deep_research (see 11-tools-research-powerpack.md) MANDATORY:
   - Best auth patterns (OAuth/API key/JWT)
   - Rate limiting gracefully
   - Retry/backoff strategies
   - Common pitfalls

5. **Document** to `notes/02-api-integration.md`:

```markdown
## External API: [Service Name]

### Base URL
- Production: `https://api.example.com/v1`
- Sandbox: `https://sandbox.api.example.com/v1`

### Authentication
- Method: [Bearer Token / API Key / OAuth2]
- Header: `Authorization: Bearer {token}`
- Token refresh: [process]

### Rate Limits
- Limit: [N] requests per [period]
- Headers: `X-RateLimit-Remaining`, `Retry-After`

### Error Codes
| Code | Meaning | Retryable? | Action |
|------|---------|------------|--------|
| 400 | Bad request | No | Fix request |
| 401 | Unauthorized | No | Refresh token |
| 429 | Rate limited | Yes | Backoff + retry |
| 500 | Server error | Yes | Retry |

### Key Endpoints
- `POST /resource` — [purpose]
- `GET /resource/:id` — [purpose]
```

---

## PHASE 2: MATCH INTERNAL PATTERNS

1. **Discover internal** — warp_grep (see 10-tools-morph-mcp.md):
   - How are APIs called here?
   - Where is HTTP client configured?
   - How are errors handled?

2. **Design connector** — sequentialthinking 5+ thoughts:
   - Match internal HTTP patterns
   - Auth: token storage, refresh
   - Error handling: map external → internal
   - Rate limiting: backoff strategy
   - Env vars needed

3. **Plan** to `notes/04-current-task.md` + update_plan (see 17-tools-core-planning.md)

**⛔ STOP. Wait for "proceed".**

---

## PHASE 3: BUILD & TEST

**For each step:**
1. Mark in_progress → edit_file (see 10-tools-morph-mcp.md)
2. Test against real API — run_command (see 16-tools-core-execution.md)
3. Mark completed → next step

**Include reasoning comments:**
```ts
/* From docs: Bearer auth, refresh on 401 */
/* Rate limit: exponential backoff per docs */
```

---

## PHASE 4: WRAP UP

- Generate tests: testsprite_* (see 14-tools-testsprite.md)
- Save API knowledge to `notes/03-memory.md`:
  - Auth flow, error handling, gotchas
- Update `notes/02-api-integration.md` with discoveries

---

## CONNECTOR PATTERN

```typescript
class ServiceClient {
  async request<T>() { /* auth headers, error handling, rate limit retry */ }
  private handleError() { /* categorize: retryable vs fatal */ }
}
```

---

## TOOLS USED (in order)

1. **read_url_content** (15-tools-core-file-ops.md) — read API docs
2. **scrape_links** (11-tools-research-powerpack.md) — SDK examples
3. **deep_research** (11-tools-research-powerpack.md) — MANDATORY: auth, retry patterns
4. **warp_grep** (10-tools-morph-mcp.md) — internal HTTP patterns
5. **update_plan** (17-tools-core-planning.md) — track steps
6. **edit_file** (10-tools-morph-mcp.md) — build connector
7. **run_command** (16-tools-core-execution.md) — test against real API
8. **get_logs** (13-tools-supabase-remote.md) — debug edge functions

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Skip API docs research | read_url_content + deep_research MANDATORY |
| Ignore rate limits | Implement exponential backoff |
| Catch all errors same | Categorize: retryable vs fatal |
| Hardcode credentials | Use env vars, document in `notes/` |
| Test only with mocks | run_command against real/sandbox API |
| Forget error propagation | Map external → internal error types |

---

## SPECIAL CASES

**OAuth2 flow:**
deep_research for: token refresh, PKCE, redirect handling, secure token storage.

**Webhooks:**
- Verify signatures (HMAC)
- Idempotency handling
- Queue for processing (don't block response)

**Supabase Edge Functions (13-tools-supabase-remote.md):**
get_logs(service="edge-function") → debug issues

**Multiple environments:**
Env-specific configs: `SERVICE_API_URL_DEV`, `SERVICE_API_URL_PROD`