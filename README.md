<h1 align="center">🤖 n8n-cli 🤖</h1>
<h3 align="center">The AI-first CLI for n8n. Because MCP shouldn't be this hard.</h3>

<p align="center">
  <strong>
    <em>Built for AI agents that need to create, validate, and deploy n8n workflows. Not another CLI for humans—this is infrastructure for your autonomous coding assistant.</em>
  </strong>
</p>

<p align="center">
  <!-- Package Info -->
  <a href="https://www.npmjs.com/package/n8n-cli"><img alt="npm" src="https://img.shields.io/npm/v/n8n-cli.svg?style=flat-square&color=4D87E6"></a>
  <a href="#"><img alt="node" src="https://img.shields.io/badge/node-18+-4D87E6.svg?style=flat-square"></a>
  <a href="#"><img alt="typescript" src="https://img.shields.io/badge/TypeScript-first-4D87E6.svg?style=flat-square"></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <!-- Features -->
  <a href="https://opensource.org/licenses/MIT"><img alt="license" src="https://img.shields.io/badge/License-MIT-F9A825.svg?style=flat-square"></a>
  <a href="#"><img alt="platform" src="https://img.shields.io/badge/platform-macOS_|_Linux_|_Windows-2ED573.svg?style=flat-square"></a>
</p>

<p align="center">
  <img alt="agent first" src="https://img.shields.io/badge/🤖_agent_first-built_for_ai_workflows-2ED573.svg?style=for-the-badge">
  <img alt="schema hints" src="https://img.shields.io/badge/💡_schema_hints-fix_errors_instantly-2ED573.svg?style=for-the-badge">
</p>

<div align="center">

### 🧭 Quick Navigation

[**⚡ Get Started**](#-get-started-in-30-seconds) •
[**✨ Key Features**](#-feature-breakdown-the-secret-sauce) •
[**🎮 CLI Usage**](#-cli-usage) •
[**🤖 Agent Workflow**](#-the-agent-workflow-why-this-exists) •
[**🆚 CLI vs MCP**](#-why-cli-beats-mcp-for-agents)

</div>

---

**`n8n-cli`** is the missing piece for AI agents building n8n automations. While MCP servers try to do everything through complex tool calls, we take a different approach: **simple CLI commands that any agent can execute**.

Your AI assistant writes a workflow JSON locally → validates it → gets schema-aware error hints → iterates until valid → pushes to n8n. No streaming hallucinations. No complex MCP gymnastics. Just solid, predictable infrastructure.

<div align="center">
<table>
<tr>
<td align="center">
<h3>🤖</h3>
<b>Agent-First Design</b><br/>
<sub>Built for AI, usable by humans</sub>
</td>
<td align="center">
<h3>💡</h3>
<b>Schema Hints</b><br/>
<sub>Fix errors with actual guidance</sub>
</td>
<td align="center">
<h3>📦</h3>
<b>544 Nodes Bundled</b><br/>
<sub>Offline node search & validation</sub>
</td>
<td align="center">
<h3>🔧</h3>
<b>Auto-Fix Mode</b><br/>
<sub>Repairs common mistakes</sub>
</td>
</tr>
</table>
</div>

How it slaps:
- **Agent:** Creates `workflow.json` locally
- **Agent:** `npx n8n-cli workflows validate workflow.json --json`
- **CLI:** Returns structured errors with schema hints
- **Agent:** Fixes issues, re-validates, iterates
- **Agent:** `npx n8n-cli workflows create --file workflow.json`
- **Result:** Clean workflow deployed. Zero hallucinations. ☕

---

## 💥 Why CLI Beats MCP for Agents

MCP is powerful, but it's overkill for many agent workflows. Here's the reality:

<table align="center">
<tr>
<td align="center"><b>❌ The MCP Way (Complexity)</b></td>
<td align="center"><b>✅ The CLI Way (Simplicity)</b></td>
</tr>
<tr>
<td>
<ol>
  <li>Configure MCP server connection</li>
  <li>Stream large workflow JSON through tool calls</li>
  <li>LLM hallucinates mid-stream on big payloads</li>
  <li>Debug cryptic MCP protocol errors</li>
  <li>Add Filepad just to write temp files</li>
  <li>Overcomplicated for what should be simple</li>
</ol>
</td>
<td>
<ol>
  <li><code>echo '{...}' > workflow.json</code></li>
  <li><code>npx n8n-cli workflows validate workflow.json</code></li>
  <li>Get clear errors with fix suggestions</li>
  <li>Iterate locally until valid</li>
  <li><code>npx n8n-cli workflows create --file workflow.json</code></li>
  <li>Done. Ship it. ☕</li>
</ol>
</td>
</tr>
</table>

**The key insight:** When your agent writes a JSON file locally and validates it with CLI commands, you eliminate the streaming hallucination problem entirely. The agent can iterate on errors in a tight feedback loop without token-heavy round trips.

---

## 🤖 The Agent Workflow (Why This Exists)

This CLI was built for one specific use case: **AI agents that generate n8n workflows**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Agent generates workflow JSON                                    │
│     └─> Writes to local file: workflow.json                         │
│                                                                      │
│  2. Agent validates locally                                          │
│     └─> npx n8n-cli workflows validate workflow.json --json         │
│                                                                      │
│  3. CLI returns structured feedback                                  │
│     └─> { "valid": false, "errors": [...], "hints": [...] }         │
│                                                                      │
│  4. Agent fixes issues based on hints                                │
│     └─> Schema delta shows exactly what's wrong                      │
│                                                                      │
│  5. Agent re-validates (repeat until valid)                          │
│     └─> Tight local loop, no network latency                         │
│                                                                      │
│  6. Agent deploys to n8n                                             │
│     └─> npx n8n-cli workflows create --file workflow.json           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Beats Streaming Workflows Through MCP

When you stream a large workflow JSON through MCP tool calls:
- LLMs tend to **hallucinate** mid-stream on large payloads
- Token limits force **chunking** which breaks context
- Error handling is **complex** and brittle

When you write locally and validate with CLI:
- Agent has **full control** over the file
- Validation is **instant** and deterministic
- Error hints include **schema examples** to copy
- Iteration happens **locally** before any network calls

---

## 🚀 Get Started in 30 Seconds

```bash
# Run directly with npx (no install needed)
npx n8n-cli --help

# Or install globally
npm install -g n8n-cli
n8n --help
```

### For AI Agents

Your agent just needs to execute shell commands. That's it.

```bash
# Search for nodes (offline, 544 nodes bundled)
npx n8n-cli nodes search "webhook" --json

# Get node schema for reference
npx n8n-cli nodes get webhook --json

# Validate a workflow file
npx n8n-cli workflows validate workflow.json --json

# Auto-fix common issues
npx n8n-cli workflows autofix workflow.json --save fixed.json

# Deploy to n8n (requires N8N_HOST and N8N_API_KEY)
npx n8n-cli workflows create --file workflow.json
```

### Environment Setup (for n8n API commands)

```bash
export N8N_HOST="https://your-n8n-instance.com"
export N8N_API_KEY="your-api-key"
```

Or create a `.n8nrc` file:
```bash
N8N_HOST=https://your-n8n-instance.com
N8N_API_KEY=your-api-key
```

---

## ✨ Feature Breakdown: The Secret Sauce

<div align="center">

| Feature | What It Does | Why Agents Care |
| :---: | :--- | :--- |
| **🤖 Agent-First `--json`**<br/>`Structured output everywhere` | Every command supports `--json` for machine parsing | Agents get clean JSON, not human-formatted tables |
| **💡 Schema Hints**<br/>`Fix errors with examples` | Validation errors include the correct schema structure | Agent knows exactly how to fix the issue |
| **📦 544 Nodes Bundled**<br/>`Offline node database` | Search and inspect nodes without API calls | No network latency for node lookups |
| **🔧 Auto-Fix Mode**<br/>`--fix flag` | Repairs common mistakes (Switch v3, fallbackOutput, etc.) | Let the tool do the boring work |
| **🎯 Schema Delta**<br/>`Missing/extra key detection` | Shows exactly which keys are wrong vs expected | Fix the right thing the first time |
| **📍 Source Locations**<br/>`Line & column numbers` | Points to exact JSON location with code snippet | No hunting through 1000-line workflows |
| **🔄 Full CRUD**<br/>`Complete workflow lifecycle` | Create, read, update, validate, deploy workflows | End-to-end automation support |

</div>

---

## 🎮 CLI Usage

### Node Operations (Offline)

```bash
# Search nodes by keyword
npx n8n-cli nodes search "slack" --limit 5 --json

# Get node schema (for agent reference)
npx n8n-cli nodes get slack --json

# Validate node configuration
npx n8n-cli nodes validate webhook --config '{"httpMethod":"POST"}' --json
```

### Workflow Validation (The Star Feature)

```bash
# Validate a workflow file
npx n8n-cli workflows validate workflow.json --json

# Output includes:
# - valid: boolean
# - errors: array with schema hints
# - warnings: array
# - suggestions: array

# Auto-fix and save
npx n8n-cli workflows validate workflow.json --fix --save fixed.json
```

### Workflow Management (Requires API)

```bash
# List workflows
npx n8n-cli workflows list --json

# Get workflow by ID
npx n8n-cli workflows get abc123 --json

# Create new workflow from file
npx n8n-cli workflows create --file workflow.json

# Update existing workflow
npx n8n-cli workflows update abc123 --file updated.json

# Activate/deactivate
npx n8n-cli workflows update abc123 --activate
npx n8n-cli workflows update abc123 --deactivate

# Trigger via webhook
npx n8n-cli workflows trigger "https://n8n.example.com/webhook/xyz" --data '{"key":"value"}'
```

### Executions

```bash
# List recent executions
npx n8n-cli executions list --limit 10 --json

# Get execution details
npx n8n-cli executions get exec123 --json
```

### Templates (Public n8n.io API)

```bash
# Search workflow templates
npx n8n-cli templates search "slack notification" --json

# Download template
npx n8n-cli templates get 1234 --save template.json
```

---

## 💡 Schema Hints: The Killer Feature

When validation fails, you don't just get "invalid parameter". You get actionable guidance:

```json
{
  "valid": false,
  "errors": [
    {
      "code": "N8N_PARAMETER_VALIDATION_ERROR",
      "message": "Could not find property option",
      "nodeName": "route-by-format",
      "nodeType": "n8n-nodes-base.switch",
      "schemaDelta": {
        "missing": ["options"],
        "extra": ["fallbackOutput"]
      },
      "correctUsage": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [],
          "combinator": "and"
        }
      }
    }
  ]
}
```

**Your agent sees:**
- Exactly which keys are missing
- Exactly which keys shouldn't be there
- The correct structure to use

**Result:** The agent can fix the issue in one shot, not guess-and-check for 10 iterations.

---

## 🔧 Common Issues & Quick Fixes

<details>
<summary><b>Expand for troubleshooting tips</b></summary>

| Problem | Solution |
| :--- | :--- |
| **"Could not find property"** | Check Schema Delta in output—shows missing/extra keys |
| **Switch node errors** | Use `--fix` flag—auto-fixes Switch v3 condition structure |
| **Malformed JSON** | Use `--repair` flag to fix common JSON syntax errors |
| **API connection failed** | Check `N8N_HOST` and `N8N_API_KEY` environment variables |
| **Node type not found** | Node database has 544 nodes from n8n-nodes-base v1.120 |

</details>

---

## 🆚 n8n-cli vs MCP Servers

| Aspect | n8n-cli | Traditional MCP |
|:-------|:--------|:----------------|
| **Setup** | `npx n8n-cli` | Configure server, manage connections |
| **Large Payloads** | Write to file, validate locally | Stream through tool calls, risk hallucinations |
| **Error Handling** | Structured JSON with schema hints | Varies by implementation |
| **Offline Capable** | Yes (544 nodes bundled) | Usually requires connection |
| **Agent Complexity** | Execute shell commands | Implement MCP protocol |
| **Iteration Speed** | Local validation loop | Network round-trips |

**Bottom line:** If your agent is generating n8n workflows, CLI commands are simpler and more reliable than MCP tool calls. Use MCP for interactive exploration; use CLI for production automation.

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/yigitkonur/n8n-cli.git
cd n8n-cli

# Install
npm install

# Build
npm run build

# Run locally
node dist/cli.js --help
```

---

<div align="center">

**Built with 🔥 for AI agents that are tired of MCP complexity.**

**This is what happens when you build infrastructure for agents, not just humans.**

MIT © [Yiğit Konur](https://github.com/yigitkonur)

</div>
