# Missing Config File Permission Checks

**Severity:** HIGH
**File Ref:** `src/core/config/loader.ts:57-62`
**Tags:** #Security #Configuration #OWASP-A05

## 🔍 The Observation
The config loader reads `.n8nrc` files without checking file permissions. On shared/multi-user systems (CI/CD runners, shared servers), a world-readable config file (`chmod 644`) exposes API keys to any local user.

The code uses `existsSync` and `readFileSync` without any permission validation:
```typescript
if (existsSync(configPath)) {
  try {
    const content = readFileSync(configPath, 'utf8');
```

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:57-62
function loadConfigFile(): PartialConfig {
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(content);
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Reading sensitive config files without checking Unix permissions allows credential theft on shared systems.
* **Best Practice:** Check file permissions before reading secrets. Warn or refuse to load files with group/world read access (mode & 0o077 !== 0).
* **Reference:** [OWASP A05:2021 Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

## 🛠️ Fix Plan
1. Before `readFileSync`, call `fs.statSync(configPath)` and check `stat.mode & 0o077`
2. If permissions are too permissive, emit a warning: "Config file has insecure permissions (chmod 600 recommended)"
3. Consider refusing to load world-readable files containing API keys (opt-out via env var)

## 💼 Business Impact
Credential theft on shared infrastructure leads to unauthorized n8n API access, workflow manipulation, and potential data exfiltration. High liability in multi-tenant or CI/CD environments.

## 🔗 Evidences
- OWASP A05:2021 explicitly flags misconfigured file permissions
- Node.js best practice: Use `fs.accessSync` with mode checks for sensitive files
- n8n documentation recommends external secrets over file-based credentials
