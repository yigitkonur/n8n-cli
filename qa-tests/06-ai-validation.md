## Phase 6: AI Node Validation

**Goal:** Test specialized validation for AI Agent workflows.
**Source Truth:** `core/validation/ai-nodes.ts`, `core/validation/ai-tool-validators.ts`

### 6.1 AI Agent Validation

| Test ID | Test Case | Setup | Expected Error Code |
|---------|-----------|-------|---------------------|
| AI-001 | Missing LLM | AI Agent no ai_languageModel | MISSING_LANGUAGE_MODEL |
| AI-002 | Too many LLMs | AI Agent with 3 LLMs | TOO_MANY_LANGUAGE_MODELS |
| AI-003 | Fallback without 2nd | needsFallback=true, 1 LLM | FALLBACK_MISSING_SECOND_MODEL |
| AI-004 | Missing parser | hasOutputParser=true, no parser | MISSING_OUTPUT_PARSER |
| AI-005 | Streaming + output | Streaming mode with main output | STREAMING_WITH_MAIN_OUTPUT |
| AI-006 | Multiple memory | 2 memory connections | MULTIPLE_MEMORY_CONNECTIONS |
| AI-007 | Missing tool desc | AI tool without toolDescription | MISSING_TOOL_DESCRIPTION |
| AI-008 | Empty prompt | promptType="define" with empty text | MISSING_PROMPT_TEXT |

**Setup Test Files:**
```bash
# AI-001: AI Agent without LLM
cat > workflows/broken/ai-001.json << 'EOF'
{
  "name": "AI Agent Test",
  "nodes": [
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [400, 300],
      "parameters": {
        "options": {}
      }
    }
  ],
  "connections": {}
}
EOF

# AI-002: Too many LLMs
cat > workflows/broken/ai-002.json << 'EOF'
{
  "name": "AI Agent Too Many LLMs",
  "nodes": [
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [400, 300],
      "parameters": {}
    },
    {"name": "LLM1", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 200], "parameters": {}},
    {"name": "LLM2", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 300], "parameters": {}},
    {"name": "LLM3", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 400], "parameters": {}}
  ],
  "connections": {
    "LLM1": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
    "LLM2": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
    "LLM3": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]}
  }
}
EOF
```

**Test Commands:**
```bash
echo "=== AI-001: Missing LLM ===" 
n8n workflows validate workflows/broken/ai-001.json -P ai-friendly --json | jq '.errors[] | select(.code == "MISSING_LANGUAGE_MODEL")'

echo "=== AI-002: Too Many LLMs ===" 
n8n workflows validate workflows/broken/ai-002.json -P ai-friendly --json | jq '.errors[] | select(.code == "TOO_MANY_LANGUAGE_MODELS")'
```

### 6.2 Chat Trigger Validation

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| CHT-001 | Streaming wrong target | Streaming to non-agent | STREAMING_WRONG_TARGET |
| CHT-002 | Valid streaming | Streaming to AI Agent | Valid |

### 6.3 AI Tool Validators

**Source Truth:** `core/validation/ai-tool-validators.ts` - 12 tool-specific validators

| Test ID | Test Case | Tool Type | Expected |
|---------|-----------|-----------|----------|
| AIT-001 | HTTP Request Tool | Missing URL | MISSING_URL error |
| AIT-002 | Code Tool | Security check | Eval/exec warnings |
| AIT-003 | Vector Store | Missing config | Configuration error |
| AIT-004 | Workflow Tool | Invalid workflow ref | Reference error |
| AIT-005 | MCP Client Tool | Missing server | Server config error |

```bash
# AI-008: Empty prompt test
cat > workflows/broken/ai-008.json << 'EOF'
{
  "name": "AI Empty Prompt Test",
  "nodes": [
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [400, 300],
      "parameters": {
        "promptType": "define",
        "text": ""
      }
    },
    {"name": "LLM", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 300], "parameters": {}}
  ],
  "connections": {
    "LLM": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]}
  }
}
EOF

echo "=== AI-008: Empty Prompt ==="
n8n workflows validate workflows/broken/ai-008.json -P ai-friendly --json | jq '.errors[] | select(.code | contains("PROMPT"))'
```

**AI Validation Architecture:**
- Uses reverse connection mapping (AI connections flow TO consumer)
- Validates 15+ unique error conditions
- Integrates with all validation profiles

---
