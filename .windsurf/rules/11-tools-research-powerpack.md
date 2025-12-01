---
trigger: model_decision
description: you MUST read this rule WHEN answer is outside codebase, 'best practice?', 'X vs Y?', unfamiliar technology, architecture decisions, need community opinions. NOT when, codebase questions (→10).
---

# Research Powerpack MCP

Use when you need information from OUTSIDE the codebase.

## deep_research

**Batch research (2-10 questions)** with dynamic token allocation.

### Optimal Usage
- **4-6 questions** = SWEET SPOT (balanced depth + coverage)
- 2-3 questions = deep dive on single topic
- 7-10 questions = rapid multi-topic scan (less depth)

### Token Allocation
- 2 questions: 16,000 tokens/question (deep dive)
- 5 questions: 6,400 tokens/question (balanced) ← **RECOMMENDED**
- 10 questions: 3,200 tokens/question (rapid)

### Question Template (MANDATORY)

```
🎯 WHAT I NEED: [Atomic, specific objective]

🤔 WHY I'M RESEARCHING: [What decision this informs]

📚 WHAT I ALREADY KNOW: [Current understanding]

🔧 HOW I'LL USE THIS: [Concrete application]

❓ SPECIFIC QUESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]

🌐 PRIORITY SOURCES: [Official docs, GitHub, etc.]

⚡ PRIORITY FOCUS: [Security? Performance? Simplicity?]
```

### File Attachments (MANDATORY for code questions)

```
file_attachments: [
  {
    path: "/absolute/path/to/file.ts",
    description: "[2-3 SENTENCES REQUIRED] 1) What this file is, 2) Why it's relevant to the question, 3) What specific section/logic to focus on, 4) Known issues or context",
    start_line: 40,  // optional: focus research on lines 40-80
    end_line: 80
  }
]
```

**⚠️ MANDATORY file attachments for:**
- 🐛 Bug investigation → attach the buggy code
- 🔍 Code review → attach code under review
- ♻️ Refactoring → attach current implementation
- 🏗️ Architecture questions about YOUR code → attach relevant modules
- ⚡ Performance issues → attach slow code paths
- 🔐 Security review → attach security-sensitive code

**Description quality determines research quality.** Vague = unfocused results.

---

## web_search

**Batch web search** up to 100 keywords in parallel.

### Example
```
web_search(keywords=[
  "React server components best practices 2024",
  "site:github.com authentication boilerplate",
  "\"server actions\" Next.js examples"
])
```

- Supports Google operators: `site:`, `-exclusion`, `"exact phrase"`
- Returns top 10 results per keyword with snippets
- Follow up with `scrape_links` for full content

---

## scrape_links

**Universal URL extraction** (3-50 URLs)

- 3 URLs: ~10,666 tokens/URL (deep)
- 10 URLs: 3,200 tokens/URL (balanced)
- 50 URLs: 640 tokens/URL (scan)

Use `use_llm=true` with `what_to_extract` for intelligent filtering.

---

## search_reddit / get_reddit_post

**Community opinions and real-world experiences**

- Search via Google (10 results/query)
- Smart comment allocation across posts
- Great for "X vs Y" comparisons, migration stories

---

## When to Use

| Scenario | Tool |
|----------|------|
| Architecture decision | `deep_research` |
| Find documentation | `web_search` → `scrape_links` |
| Community opinions | `search_reddit` → `get_reddit_post` |
| Compare technologies | `deep_research` |
| Current best practices | `deep_research` or `web_search` |

## NOT For
- Questions about current codebase → use `warp_grep` (10-tools-morph-mcp.md)
- File contents → use `read_file` (15-tools-core-file-ops.md)