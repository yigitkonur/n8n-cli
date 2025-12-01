# mcp2_deep_research

Batch deep research (2-10 questions) with dynamic token allocation.

## Token Budget

32,000 tokens distributed across questions:
- **2 questions**: 16,000 tokens/question (deep dive)
- **5 questions**: 6,400 tokens/question (balanced)
- **10 questions**: 3,200 tokens/question (rapid multi-topic)

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `questions` | array (1-10) | Yes | Array of research questions |

### Question Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string (min 10 chars) | Yes | Structured research question |
| `file_attachments` | array | No | Files to include as context |

### File Attachment Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | **Absolute** file path |
| `start_line` | integer | No | 1-indexed start line |
| `end_line` | integer | No | 1-indexed end line |
| `description` | string | Highly recommended | What file is, why it matters |

## Question Template

```
🎯 WHAT I NEED: [Goal/achievement]

🤔 WHY I'M RESEARCHING THIS: [Context/decision it informs]

📚 WHAT I ALREADY KNOW: [Current understanding]

🔧 HOW I PLAN TO USE THIS: [Practical application]

❓ SPECIFIC QUESTIONS (2-5):
- Question 1
- Question 2

🌐 PRIORITY SOURCES (optional): [Sites/docs to prioritize]

⚡ PRIORITY INFO (optional): [What matters most]
```

## When to Attach Files

**MANDATORY:**
- 🐛 Bug investigation → Attach buggy code
- 🔍 Code review → Attach code to review
- ♻️ Refactoring → Attach current implementation
- ⚡ Performance issues → Attach slow code paths
- 🔐 Security review → Attach security-sensitive code
- 🧪 Testing questions → Attach code AND test files

**NOT NEEDED:**
- General concept questions
- Technology comparisons
- Best practices research (unless about your specific code)
