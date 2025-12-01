# mcp2_web_search

Batch web search using Google via SERPER API. Up to 100 keywords in parallel.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keywords` | array (1-100) | Yes | Search keywords |

## Features

- Top 10 results per keyword with snippets and links
- Supports Google operators: `site:`, `-exclusion`, `"exact phrase"`, `filetype:`
- Returns related search suggestions
- Identifies frequently appearing URLs across queries

## Usage

Recommend 3-7 keywords for comprehensive research. More keywords = broader coverage.

Follow up with `mcp2_scrape_links` to extract full content from promising URLs.

## Example

```json
{
  "keywords": [
    "typescript dependency injection best practices",
    "tsyringe vs inversify comparison",
    "site:github.com typescript DI container"
  ]
}
```
