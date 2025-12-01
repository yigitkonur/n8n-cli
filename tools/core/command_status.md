# command_status

Check status of a previously started terminal command by its ID.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CommandId` | string | Yes | ID of the background command |
| `OutputCharacterCount` | integer | No | Characters to view (keep small) |
| `WaitDurationSeconds` | integer | No | Seconds to wait for completion (max 60, default: 0) |

## Returns

- Current status (`running` or `done`)
- Output lines as specified
- Any error if present

## Notes

- Only use for Background command IDs
- If `WaitDurationSeconds` specified, waits up to that duration
- Returns early if command completes before wait duration
