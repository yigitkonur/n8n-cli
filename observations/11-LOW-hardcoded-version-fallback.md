# Hardcoded Version Fallback in CLI Entry Point

**Severity:** LOW
**File Ref:** `src/cli.ts:16-22`
**Tags:** #maintenance #versioning #developer-experience

## 🔍 The Observation

The CLI has a hardcoded fallback version `'1.5.0'` used when `package.json` cannot be read. This can lead to:
1. Version mismatch if fallback isn't updated with releases
2. Misleading version output in error scenarios
3. Silent failures in package.json parsing

## 💻 Code Reference
```typescript
// cli.ts:16-22
let version = '1.5.0';  // Hardcoded fallback
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkg.version;
} catch {
  // Use default version - SILENT FAILURE
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Hardcoded version strings that drift from actual package version. Silent catch blocks that hide errors.
*   **Best Practice:** Single source of truth for version (package.json only). Fail loudly if version cannot be determined, or use build-time injection.
*   **Reference:** [Semantic Versioning](https://semver.org/) - Version should accurately reflect the code

## 🛠️ Fix Plan

1.  Remove hardcoded fallback - let it fail if package.json is unreadable.
2.  Or: Inject version at build time using `tsup` define feature.
3.  At minimum: Log warning when using fallback version.

```typescript
// Option A: Fail if package.json unreadable
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;  // Will throw if unreadable

// Option B: Build-time injection (tsup.config.ts)
// define: { '__VERSION__': JSON.stringify(pkg.version) }
```

## 💼 Business Impact

**Support Impact:** Users reporting version "1.5.0" when actually running different version causes confusion in bug reports.

**Maintenance:** Developers must remember to update hardcoded version (they won't).

**Effort:** ~15 minutes. Consider build-time injection for cleaner solution.

## 🔗 Evidences

- tsup supports `define` for build-time constants
- npm/yarn provide package version at runtime via `process.env.npm_package_version`
- Many CLIs fail on missing package.json (it's a broken install anyway)
