# EP-05: Monetization

## Overview
Implement non-intrusive revenue streams to cover infrastructure costs and sustain development.

## Dependencies
- EP-01 (SEO Foundation) - need pages with traffic to monetize

---

## EP-05-01: Display Advertising Integration

**As a** site owner
**I want** to display relevant ads
**So that** I generate passive revenue

### Tasks

**Ad Network Setup:**
- [ ] Apply to Carbon Ads (developer-focused, high quality)
- [ ] Alternative: EthicalAds, BuySellAds
- [ ] Fallback: Google AdSense (lower quality but guaranteed fill)
- [ ] Create ad network accounts

**Frontend Integration:**
- [ ] Create `AdUnit.tsx` component
- [ ] Support multiple ad sizes (leaderboard, sidebar, in-content)
- [ ] Placement zones:
  - Search results sidebar
  - Tool detail page sidebar
  - Between tool cards in listings (every 6th position)
  - Footer area
- [ ] Lazy load ads (don't block page render)
- [ ] Ad blocker detection with polite message

**Configuration:**
- [ ] Environment variable: `VITE_AD_NETWORK=carbon|ethical|adsense|none`
- [ ] Ad slot IDs per placement
- [ ] Disable ads for logged-in premium users (future)

**Performance:**
- [ ] Async ad script loading
- [ ] Reserve ad space to prevent layout shift
- [ ] Monitor Core Web Vitals impact

**Compliance:**
- [ ] Privacy policy update (ad tracking disclosure)
- [ ] Cookie consent banner if required
- [ ] GDPR/CCPA considerations

---

## EP-05-02: Affiliate Link Support

**As a** site owner
**I want** to earn referral commissions
**So that** I monetize tool recommendations

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  affiliate: {
    url?: string;           // Affiliate link
    programName?: string;   // "Cursor Partner Program"
    commission?: string;    // "20% recurring"
    trackingId?: string;    // Internal tracking
  };
  ```

**Affiliate Program Research:**
- [ ] Research programs for top 50 tools
- [ ] Priority: Cursor, OpenAI, Midjourney, Jasper, Copy.ai
- [ ] Sign up for Impact, ShareASale, direct programs
- [ ] Document commission rates

**Frontend Integration:**
- [ ] Modify "Visit Website" button logic:
  ```typescript
  const url = tool.affiliate?.url || tool.website;
  ```
- [ ] Add affiliate disclosure tooltip/text
- [ ] Track affiliate link clicks (analytics)
- [ ] "Affiliate" badge (optional, for transparency)

**Admin:**
- [ ] Affiliate URL field in tool edit form
- [ ] Bulk import affiliate links via CSV
- [ ] Affiliate link health checker (detect broken links)

**Compliance:**
- [ ] FTC disclosure: "We may earn a commission..."
- [ ] Disclosure placement: footer, tool page, comparison page
- [ ] Nofollow attribute on affiliate links (SEO best practice)

**Tracking:**
- [ ] Create `affiliate_clicks` collection
- [ ] Track: toolId, timestamp, referrer, destination
- [ ] Monthly report: clicks per tool, estimated revenue

---

## EP-05-03: Featured Tool Listings

**As a** tool maker
**I want** premium placement for my tool
**So that** I get more visibility

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  featured: {
    active: boolean;
    tier: 'basic' | 'premium' | 'spotlight';
    startDate: Date;
    endDate: Date;
    purchasedBy?: string;   // User ID
    orderId?: string;       // Stripe reference
  };
  ```

**Feature Tiers:**
```
Basic ($50/month):
- "Featured" badge on listing
- Appear first in category (after sponsored)

Premium ($100/month):
- Basic benefits
- Highlighted card design
- Featured on homepage rotation

Spotlight ($200/month):
- Premium benefits
- Dedicated homepage slot
- Featured in newsletter
- Social media mention
```

**Frontend:**
- [ ] Create `FeaturedBadge.tsx` component
- [ ] Featured card variant with highlight border
- [ ] Homepage featured section
- [ ] Sort featured tools first in listings
- [ ] "Featured" label (clearly distinguished from organic)

**Admin:**
- [ ] Feature management dashboard
- [ ] Manually feature tools (admin override)
- [ ] Feature queue/scheduling
- [ ] Analytics: impressions, clicks for featured tools

**Self-Service (Future):**
- [ ] "Feature Your Tool" page
- [ ] Pricing display
- [ ] Stripe Checkout integration
- [ ] Auto-activate on payment
- [ ] Auto-expire after period ends

---

## EP-05-04: Sponsored Search Results

**As a** tool maker
**I want** to sponsor relevant searches
**So that** my tool appears for key queries

### Tasks

**Schema:**
- [ ] Create `SponsoredPlacement` model:
  ```typescript
  interface SponsoredPlacement {
    id: string;
    toolId: string;
    keywords: string[];        // Sponsored search terms
    categories: string[];      // Sponsored categories
    bidAmount: number;         // CPM or CPC
    budget: number;            // Monthly budget
    spent: number;             // Current spend
    active: boolean;
    startDate: Date;
    endDate?: Date;
  }
  ```

**Search Integration:**
- [ ] Modify search API to check for sponsored matches
- [ ] Insert sponsored result at position 0 or 1
- [ ] Mark as "Sponsored" in response
- [ ] Relevance gate: sponsor must match at least one category
- [ ] Rotate sponsors if multiple match

**Frontend:**
- [ ] "Sponsored" label on result card
- [ ] Subtle visual distinction (background, border)
- [ ] Same card format as organic results
- [ ] Click tracking for billing

**Billing:**
- [ ] Choose model: CPM (per 1000 impressions) or CPC (per click)
- [ ] Track impressions and clicks
- [ ] Monthly invoicing or prepaid balance
- [ ] Pause when budget exhausted

**Admin:**
- [ ] Sponsored placement management
- [ ] Approve/reject sponsored tools
- [ ] Spending reports

---

## EP-05-05: Tool Maker Accounts

**As a** tool maker
**I want** to claim and manage my listing
**So that** information stays accurate

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  claim: {
    status: 'unclaimed' | 'pending' | 'claimed' | 'verified';
    claimedBy?: string;        // User ID
    claimedAt?: Date;
    verificationMethod?: string;
    verifiedAt?: Date;
  };
  ```

**Claim Flow:**
- [ ] "Claim this tool" button on tool page (logged-in users)
- [ ] Create `ClaimToolPage.tsx`
- [ ] Verification methods:
  - Email to domain (hello@toolname.com)
  - DNS TXT record
  - Meta tag on website
  - Manual review (submit proof)
- [ ] Admin approval queue for claims

**Tool Maker Dashboard:**
- [ ] Create `/dashboard/tools` route
- [ ] List claimed tools
- [ ] Edit tool information (pending admin approval for major changes)
- [ ] View analytics: impressions, clicks, search appearances
- [ ] Manage featured listing (purchase/renew)

**API:**
- [ ] Create `POST /api/tools/:id/claim` endpoint
- [ ] Create `GET /api/tools/:id/verify` endpoint (check verification)
- [ ] Create `GET /api/dashboard/tools` for tool maker

**Permissions:**
- [ ] Tool makers can edit: description, pricing, links, media
- [ ] Tool makers cannot edit: categories, features (admin verified)
- [ ] Changes logged for audit

**Upsell:**
- [ ] Show featured listing options in dashboard
- [ ] "Boost your visibility" prompts
- [ ] Analytics highlights ("You appeared in 500 searches")

---

## EP-05-06: Premium API Access

**As a** developer
**I want** API access to tool database
**So that** I can build integrations

### Tasks

**API Tiers:**
```
Free Tier:
- 100 requests/day
- Basic endpoints (list, search, get)
- Rate limited
- Attribution required

Pro Tier ($29/month):
- 10,000 requests/day
- All endpoints
- Higher rate limits
- Webhooks for updates
- No attribution required

Enterprise (Custom):
- Unlimited requests
- Dedicated support
- Custom integrations
- SLA guarantees
```

**API Key System:**
- [ ] Create `ApiKey` model:
  ```typescript
  interface ApiKey {
    id: string;
    key: string;              // hashed
    userId: string;
    tier: 'free' | 'pro' | 'enterprise';
    name: string;             // "My App Integration"
    createdAt: Date;
    lastUsedAt: Date;
    requestCount: number;
    monthlyLimit: number;
  }
  ```

**Developer Portal:**
- [ ] Create `/developers` landing page
- [ ] API documentation (OpenAPI/Swagger)
- [ ] API key generation UI
- [ ] Usage dashboard (requests, errors)
- [ ] Code examples (curl, JavaScript, Python)

**Implementation:**
- [ ] API key validation middleware
- [ ] Rate limiting per key
- [ ] Usage tracking per request
- [ ] Overage handling (block or charge)

**Endpoints:**
- [ ] `GET /api/v1/tools` - list with filters
- [ ] `GET /api/v1/tools/:id` - get single tool
- [ ] `GET /api/v1/search` - search tools
- [ ] `GET /api/v1/categories` - list categories
- [ ] Webhooks: `tool.created`, `tool.updated`, `tool.deleted`

**Billing:**
- [ ] Stripe subscription for Pro tier
- [ ] Usage-based billing option (pay per request over limit)
- [ ] Invoice for Enterprise

---

## EP-05-07: Newsletter Sponsorship

**As a** site owner
**I want** a newsletter with sponsors
**So that** I have recurring revenue

### Tasks

**Email Capture:**
- [ ] Create `NewsletterSignup.tsx` component
- [ ] Placement: homepage, tool pages footer, exit intent popup
- [ ] Integration: ConvertKit, Buttondown, or Mailchimp
- [ ] Double opt-in confirmation
- [ ] Segment: tool makers vs users

**Newsletter Content:**
- [ ] Weekly or bi-weekly cadence
- [ ] Sections:
  - New tools added
  - Tool updates/news
  - Comparison spotlight
  - Tips and tutorials
  - Sponsored slot
- [ ] Create template in email platform

**Sponsorship:**
- [ ] Dedicated sponsor slot per issue
- [ ] Pricing: $100-500 per issue (based on list size)
- [ ] Sponsor brief: logo, description, CTA link
- [ ] Clear "Sponsored" label
- [ ] Track clicks from newsletter

**Growth:**
- [ ] Content upgrades (downloadable guides)
- [ ] "Subscribe for updates on {tool}" on tool pages
- [ ] Referral program (future)

**Metrics:**
- [ ] Open rate target: 40%+
- [ ] Click rate target: 5%+
- [ ] Unsubscribe rate: <1%

---

## EP-05-08: Revenue Dashboard

**As a** site owner
**I want** to track revenue sources
**So that** I understand what's working

### Tasks

**Dashboard Page:**
- [ ] Create `/admin/revenue` route (admin only)
- [ ] Summary cards: total revenue, by source, trend

**Revenue Sources:**
```
┌─────────────────────────────────────┐
│  Monthly Revenue: $450              │
├─────────────────────────────────────┤
│  Ads:           $100  (22%)         │
│  Affiliates:    $150  (33%)         │
│  Featured:      $150  (33%)         │
│  API:           $50   (12%)         │
└─────────────────────────────────────┘
```

**Charts:**
- [ ] Revenue over time (line chart)
- [ ] Revenue by source (pie chart)
- [ ] Top performing affiliate tools
- [ ] Featured listing ROI

**Data Collection:**
- [ ] Ad revenue: import from ad network API or manual entry
- [ ] Affiliates: track clicks, estimate from commission rates
- [ ] Featured: direct from Stripe
- [ ] API: direct from Stripe

**Alerts:**
- [ ] Revenue milestone notifications
- [ ] Anomaly detection (unusual drops)
- [ ] Budget utilization for sponsors

---

## Technical Considerations

**Payment Processing:**
- Stripe for all payments
- Stripe Connect for potential future marketplace
- Webhook handling for payment events
- Invoice generation

**Financial Tracking:**
- Monthly revenue exports
- Tax considerations (1099 for US, VAT for EU)
- Refund handling

**Legal:**
- Terms of Service update
- Advertising disclosure policy
- Privacy policy (ad tracking)
- Refund policy for featured listings

**Priority Order:**
1. Affiliate links (lowest effort, immediate revenue)
2. Display ads (passive, scales with traffic)
3. Featured listings (requires sales/outreach)
4. API access (requires developer adoption)
5. Newsletter (requires audience building)
6. Sponsored search (requires significant traffic)
