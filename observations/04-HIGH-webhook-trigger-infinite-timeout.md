# Webhook Trigger Has No Timeout (Infinite Hang Risk)

**Severity:** HIGH
**File Ref:** `src/core/api/client.ts:542-555`
**Tags:** #reliability #network #timeout

## 🔍 The Observation

The `triggerWebhook()` method creates a new Axios instance without specifying a timeout:

```typescript
const webhookClient = axios.create({
  baseURL: `${url.protocol}//${url.host}`,
  validateStatus: (status) => status < 500,
  // NO TIMEOUT SPECIFIED
});
```

Axios defaults to `0` (no timeout), meaning webhook triggers can hang indefinitely if:
- The target n8n workflow has long-running operations
- Network issues cause connection to stall
- Target server never responds

This blocks the CLI process forever, requiring manual Ctrl+C intervention.

## 💻 Code Reference
```typescript
// src/core/api/client.ts:542-555
const webhookClient = axios.create({
  baseURL: `${url.protocol}//${url.host}`,
  validateStatus: (status) => status < 500,
});

const response = await webhookClient.request(config);
```

Note: The main API client has a 30-second timeout (line 86), but webhook trigger bypasses it.

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Creating HTTP clients without explicit timeout. Relying on Axios default of infinite wait.

*   **Best Practice:** Always set explicit timeouts. For webhooks that may legitimately take time, use a configurable timeout (default 120s for sync webhooks, 30s for fire-and-forget).

*   **Reference:** [Axios Configuration](https://axios-http.com/docs/req_config), HTTP client best practices

## 🛠️ Fix Plan

1.  Add timeout to webhook client:
    ```typescript
    const webhookClient = axios.create({
      baseURL: `${url.protocol}//${url.host}`,
      validateStatus: (status) => status < 500,
      timeout: waitForResponse ? 120000 : 30000,  // 2min for sync, 30s for async
    });
    ```

2.  Add user feedback for long waits:
    ```typescript
    if (waitForResponse && !opts.quiet) {
      console.log(chalk.dim('Waiting up to 2 minutes for webhook response...'));
    }
    ```

3.  Consider `--timeout <seconds>` CLI option for user override

## 💼 Business Impact

*   **CI/CD Blocking:** Webhook triggers in pipelines hang forever → build timeout (expensive)
*   **User Experience:** CLI appears frozen with no feedback
*   **Resource Waste:** Orphaned processes consume system resources

## 🔗 Evidences

- Axios default timeout is 0 (no timeout): https://axios-http.com/docs/req_config
- n8n webhooks can take 100s+ for long-running workflows
- Similar issues documented in CLI tools like curl (has --max-time flag)
