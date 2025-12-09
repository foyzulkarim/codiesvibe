# EP-05: Monetization

## Overview
Implement non-intrusive revenue streams to cover infrastructure costs and sustain development.

## Dependencies
- EP-01 (SEO Foundation) - need pages with traffic to monetize

## User Stories

### EP-05-01: Display Advertising Integration
**As a** site owner
**I want** to display relevant ads
**So that** I generate passive revenue

**Acceptance Criteria:**
- Integrate Carbon Ads (developer-focused)
- Placements: search sidebar, tool page sidebar
- Non-intrusive, matches site design
- Fallback if no ad available
- Estimated: $2-5 CPM for dev audience

---

### EP-05-02: Affiliate Link Support
**As a** site owner
**I want** to earn referral commissions
**So that** I monetize tool recommendations

**Acceptance Criteria:**
- Schema addition: `affiliateUrl: string`
- "Visit Website" uses affiliate link when available
- Disclosure: "We may earn commission" notice
- Track: clicks per tool
- Priority tools: Cursor, OpenAI, Midjourney, etc.

---

### EP-05-03: Featured Tool Listings
**As a** tool maker
**I want** premium placement for my tool
**So that** I get more visibility

**Acceptance Criteria:**
- Schema addition: `featured: boolean`, `featuredUntil: Date`
- Featured tools appear first in category
- "Featured" badge (subtle)
- Admin interface to manage
- Pricing: $50-200/month per listing

---

### EP-05-04: Sponsored Search Results
**As a** tool maker
**I want** to sponsor relevant searches
**So that** my tool appears for key queries

**Acceptance Criteria:**
- "Sponsored" result at top of search
- Clearly labeled
- Relevance requirement (must match category)
- Future phase - requires traffic first

---

### EP-05-05: Tool Maker Accounts
**As a** tool maker
**I want** to claim and manage my listing
**So that** information stays accurate

**Acceptance Criteria:**
- Claim process (verify ownership)
- Edit tool information
- View analytics (impressions, clicks)
- Upsell to premium features
- Free tier + paid tier

---

### EP-05-06: Premium API Access
**As a** developer
**I want** API access to tool database
**So that** I can build integrations

**Acceptance Criteria:**
- Public API with rate limits
- API key registration
- Free tier: 100 requests/day
- Paid tier: higher limits, commercial use
- Documentation

---

### EP-05-07: Newsletter Sponsorship
**As a** site owner
**I want** a newsletter with sponsors
**So that** I have recurring revenue

**Acceptance Criteria:**
- Weekly/monthly newsletter
- New tools, trending, comparisons
- Sponsor slot in newsletter
- Email capture on site
- Future phase - need audience first

---

### EP-05-08: Revenue Dashboard
**As a** site owner
**I want** to track revenue sources
**So that** I understand what's working

**Acceptance Criteria:**
- Dashboard showing: ad revenue, affiliate clicks, premium listings
- Monthly trends
- Top performing pages/tools
- Simple admin view

---

## Technical Notes
- Start with ads + affiliates (lowest effort)
- Premium features need traffic first
- Payment integration (Stripe) for premium listings
- Legal: affiliate disclosures, terms of service

## Revenue Targets

| Source | Month 1 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Ads | $10 | $100 | $300 |
| Affiliates | $0 | $50 | $200 |
| Featured | $0 | $100 | $500 |
| **Total** | $10 | $250 | $1000 |

## Success Metrics
- Cover server costs by Month 3 (~$50-100)
- Positive ROI by Month 6
- Sustainable without active sales effort
