# No SSL Certificate Override for Self-Signed Certificates

**Severity:** MEDIUM
**File Ref:** `src/core/api/client.ts:71-78`
**Tags:** #configuration #developer-experience #security

## 🔍 The Observation

The API client uses Node.js default HTTPS settings which reject self-signed certificates. There's no configuration option to bypass certificate validation for development/internal n8n instances with self-signed certs.

Users with self-hosted n8n behind self-signed certificates must use the environment variable workaround `NODE_TLS_REJECT_UNAUTHORIZED=0`, which is:
1. A global setting affecting all Node.js HTTPS
2. Not documented prominently
3. A security anti-pattern when forgotten in production

## 💻 Code Reference
```typescript
// client.ts:71-78 - No httpsAgent configuration
this.client = axios.create({
  baseURL: apiUrl,
  timeout,
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
  // MISSING: httpsAgent for custom certificate handling
});
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Forcing global environment variable workarounds that disable security broadly.
*   **Best Practice:** Provide a scoped configuration option (`--insecure` flag or config key) that applies only to n8n connections, with clear warnings.
*   **Reference:** [curl --insecure flag](https://curl.se/docs/manpage.html#-k) - Industry standard for CLI tools

## 🛠️ Fix Plan

1.  Add `insecureHttps?: boolean` to `CliConfig` type.
2.  Add `--insecure` global flag or `N8N_INSECURE_HTTPS` env var.
3.  When enabled, create axios with custom `httpsAgent`:

```typescript
import https from 'node:https';

const httpsAgent = config.insecureHttps 
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

this.client = axios.create({
  baseURL: apiUrl,
  timeout,
  headers: { ... },
  httpsAgent,
});
```

4.  Log warning when insecure mode is active.
5.  Document in help text with security warning.

## 💼 Business Impact

**Developer Experience:** Self-hosted n8n users with internal CAs or self-signed certs cannot use the CLI without global workarounds, limiting adoption.

**Security Note:** This is intentionally MEDIUM not LOW because:
- Enabling should require explicit opt-in
- Default must remain secure (reject invalid certs)
- Warning must be visible when used

**Effort:** ~1 hour including config, flag, and documentation.

## 🔗 Evidences

- Help text mentions `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround (cli.ts:163)
- kubectl, helm, and docker CLI all have `--insecure-skip-tls-verify` flags
- axios supports custom httpsAgent out of the box
