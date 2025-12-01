# Incomplete POSIX sysexits.h Exit Code Coverage

**Severity:** MEDIUM
**File Ref:** `src/utils/exit-codes.ts:7-37`
**Tags:** #compatibility #cli #standards

## 🔍 The Observation

The exit codes enum covers most common cases but misses several POSIX sysexits.h codes:

```typescript
export enum ExitCode {
  SUCCESS = 0,
  GENERAL = 1,
  USAGE = 64,
  DATAERR = 65,
  NOINPUT = 66,
  IOERR = 70,
  TEMPFAIL = 71,
  PROTOCOL = 72,
  NOPERM = 73,
  CONFIG = 78,
}
```

Missing codes from sysexits.h:
- **NOUSER (67):** User doesn't exist
- **NOHOST (68):** Host name not found
- **UNAVAIL (69):** Service unavailable
- **SOFTWARE (70):** Internal software error (conflicts with IOERR!)
- **OSERR (71):** OS error (conflicts with TEMPFAIL!)
- **OSFILE (72):** OS file missing (conflicts with PROTOCOL!)
- **CANTCREAT (73):** Can't create output file (conflicts with NOPERM!)

The conflicts suggest non-standard code assignments.

## 💻 Code Reference
```typescript
// src/utils/exit-codes.ts:7-37
export enum ExitCode {
  SUCCESS = 0,
  GENERAL = 1,
  USAGE = 64,      // Correct: EX_USAGE
  DATAERR = 65,    // Correct: EX_DATAERR
  NOINPUT = 66,    // Correct: EX_NOINPUT
  IOERR = 70,      // Wrong: Should be 74 (EX_IOERR). 70 is EX_SOFTWARE
  TEMPFAIL = 71,   // Wrong: Should be 75 (EX_TEMPFAIL). 71 is EX_OSERR
  PROTOCOL = 72,   // Wrong: Should be 76 (EX_PROTOCOL). 72 is EX_OSFILE
  NOPERM = 73,     // Wrong: Should be 77 (EX_NOPERM). 73 is EX_CANTCREAT
  CONFIG = 78,     // Correct: EX_CONFIG
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Custom exit code assignments that conflict with POSIX standard.

*   **Best Practice:** Use exact POSIX sysexits.h values for shell script compatibility:
    ```
    EX_USAGE=64, EX_DATAERR=65, EX_NOINPUT=66, EX_NOUSER=67, EX_NOHOST=68,
    EX_UNAVAIL=69, EX_SOFTWARE=70, EX_OSERR=71, EX_OSFILE=72, EX_CANTCREAT=73,
    EX_IOERR=74, EX_TEMPFAIL=75, EX_PROTOCOL=76, EX_NOPERM=77, EX_CONFIG=78
    ```

*   **Reference:** `man 3 sysexits` or `/usr/include/sysexits.h`

## 🛠️ Fix Plan

1.  Correct the exit code values:
    ```typescript
    export enum ExitCode {
      SUCCESS = 0,
      GENERAL = 1,
      USAGE = 64,
      DATAERR = 65,
      NOINPUT = 66,
      NOHOST = 68,      // Add: Host not found
      UNAVAIL = 69,     // Add: Service unavailable
      SOFTWARE = 70,    // Internal error
      OSERR = 71,       // OS error
      IOERR = 74,       // Fix: Was 70, should be 74
      TEMPFAIL = 75,    // Fix: Was 71, should be 75
      PROTOCOL = 76,    // Fix: Was 72, should be 76
      NOPERM = 77,      // Fix: Was 73, should be 77
      CONFIG = 78,
    }
    ```

2.  Update error code mapping to use corrected values

3.  Add NOHOST for DNS errors, UNAVAIL for service down

## 💼 Business Impact

*   **CI/CD Scripts:** Shell scripts using `$?` get wrong semantics
*   **Monitoring:** Alerting based on exit codes may miscategorize errors
*   **Cross-Tool Compatibility:** Other tools expect POSIX codes

## 🔗 Evidences

- POSIX sysexits.h: https://man.openbsd.org/sysexits.3
- Commander.js recommends standard exit codes
- FreeBSD/Linux man pages document canonical values
