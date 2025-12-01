# mcp2_get_reddit_post

Fetch Reddit posts with smart comment allocation (2-50 posts).

## Comment Budget

1,000 comments distributed automatically:
- **2 posts**: ~500 comments/post (deep dive)
- **10 posts**: 100 comments/post
- **50 posts**: 20 comments/post (quick scan)

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | array (2-50) | Yes | Reddit post URLs |
| `fetch_comments` | boolean | No | Fetch comments (default: true) |
| `max_comments` | number | No | Override auto-allocation (default: 100) |

## Usage

Use after `search_reddit`. Maximize post count for research breadth.

```json
{
  "urls": [
    "https://reddit.com/r/programming/comments/abc123",
    "https://reddit.com/r/typescript/comments/def456"
  ],
  "fetch_comments": true
}
```
