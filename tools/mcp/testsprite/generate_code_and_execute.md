# mcp0_testsprite_generate_code_and_execute

Run node command to generate and execute tests. AI assistant analyzes results and saves markdown report.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectPath` | string | Yes | Absolute path of project root |
| `projectName` | string | Yes | Name of root directory |
| `testIds` | array | No | Specific test IDs (default: empty = all tests) |
| `additionalInstruction` | string | No | Extra instructions for test generation |
