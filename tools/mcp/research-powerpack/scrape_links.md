# mcp2_scrape_links

Universal URL content extraction (3-50 URLs) with dynamic token allocation.

## Token Allocation

32,000 tokens distributed automatically:
- **3 URLs**: ~10,666 tokens/URL (deep extraction)
- **10 URLs**: 3,200 tokens/URL (detailed)
- **50 URLs**: 640 tokens/URL (high-level scan)

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | array (1-50) | Yes | URLs to scrape |
| `use_llm` | boolean | No | Enable AI processing (default: false) |
| `what_to_extract` | string (max 1000) | No | AI extraction instructions |
| `timeout` | number (5-120) | No | Timeout per URL in seconds (default: 30) |

## Features

- **Automatic fallback**: Basic → JavaScript → JavaScript+US geo-targeting
- **AI extraction**: Set `use_llm=true` with `what_to_extract` for intelligent filtering
- **Batching**: Max 30 concurrent requests

## Example

```json
{
  "urls": [
    "https://docs.example.com/api",
    "https://github.com/owner/repo/README.md"
  ],
  "use_llm": true,
  "what_to_extract": "Extract API authentication methods and rate limits"
}
```
