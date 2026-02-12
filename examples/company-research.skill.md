# Company Research Skill

Research any company using multiple data sources. Get emails, social profiles, news, and web data.

## Tools

### Find Company Emails
```yaml
name: find_company_emails
description: Find email addresses for people at a company
endpoint: https://api.orth.sh/v1/run
method: POST
headers:
  Authorization: Bearer $ORTHOGONAL_API_KEY
  Content-Type: application/json
  X-Orthogonal-Source: skill
body:
  api: hunter
  path: /v2/domain-search
  query:
    domain: "{{domain}}"
    limit: "{{limit|default:10}}"
```

### Get Company Info
```yaml
name: get_company_info
description: Get company details including social profiles and description
endpoint: https://api.orth.sh/v1/run
method: POST
headers:
  Authorization: Bearer $ORTHOGONAL_API_KEY
  Content-Type: application/json
  X-Orthogonal-Source: skill
body:
  api: tomba
  path: /v1/domain-status
  query:
    domain: "{{domain}}"
```

### Search Company News
```yaml
name: search_company_news
description: Search for recent news about a company
endpoint: https://api.orth.sh/v1/run
method: POST
headers:
  Authorization: Bearer $ORTHOGONAL_API_KEY
  Content-Type: application/json
  X-Orthogonal-Source: skill
body:
  api: andi
  path: /v1/search
  query:
    q: "{{company_name}} news"
    limit: "5"
```

### Scrape Company Website
```yaml
name: scrape_website
description: Extract content from a company's website
endpoint: https://api.orth.sh/v1/run
method: POST
headers:
  Authorization: Bearer $ORTHOGONAL_API_KEY
  Content-Type: application/json
  X-Orthogonal-Source: skill
body:
  api: olostep
  path: /v1/scrapes
  body:
    url_to_scrape: "{{url}}"
    formats:
      - markdown
```

## Usage Examples

**Find emails at Stripe:**
```
Use find_company_emails with domain "stripe.com"
```

**Research a company:**
```
1. Use get_company_info for "vercel.com"
2. Use search_company_news for "Vercel"
3. Use scrape_website for "https://vercel.com/about"
```

## Setup

1. Get an API key at https://orthogonal.com/dashboard/settings/api-keys
2. Set the environment variable: `export ORTHOGONAL_API_KEY=your_key`
3. Add this skill to your agent

## Pricing

All API calls are pay-per-use through Orthogonal:
- Hunter email search: $0.01/request
- Tomba domain info: $0.005/request  
- Andi search: $0.01/request
- Olostep scraping: $0.01/request
