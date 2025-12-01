# mcp3_sequentialthinking

Dynamic and reflective problem-solving through thoughts. Flexible thinking process that adapts and evolves.

## When to Use

- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where full scope not clear initially
- Multi-step solutions
- Tasks needing context over multiple steps
- Filtering out irrelevant information

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thought` | string | Yes | Current thinking step |
| `nextThoughtNeeded` | boolean | Yes | True if more thinking needed |
| `thoughtNumber` | integer (≥1) | Yes | Current number in sequence |
| `totalThoughts` | integer (≥1) | Yes | Estimated total thoughts needed |
| `isRevision` | boolean | No | Revises previous thinking |
| `revisesThought` | integer | No | Which thought being reconsidered |
| `branchFromThought` | integer | No | Branching point thought number |
| `branchId` | string | No | Current branch identifier |
| `needsMoreThoughts` | boolean | No | Realizing more thoughts needed at end |

## Key Features

- Adjust `totalThoughts` up/down as you progress
- Question or revise previous thoughts
- Add more thoughts even after reaching "end"
- Express uncertainty, explore alternatives
- Branch or backtrack (not just linear)
- Generate and verify solution hypothesis
- Repeat until satisfied

## Guidelines

1. Start with initial estimate, be ready to adjust
2. Feel free to question/revise previous thoughts
3. Don't hesitate to add more thoughts if needed
4. Express uncertainty when present
5. Mark revisions and branches
6. Ignore irrelevant information
7. Generate hypothesis when appropriate
8. Verify hypothesis against Chain of Thought
9. Repeat until satisfied
10. Only set `nextThoughtNeeded=false` when truly done

## Example

```json
{
  "thought": "The bug appears in the async handler. Need to check if await is properly used...",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true
}
```
