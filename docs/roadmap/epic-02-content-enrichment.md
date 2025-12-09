# EP-02: Content Enrichment

## Overview
Use AI to auto-generate rich content for tool pages, reducing manual data entry while creating valuable, unique content.

## Dependencies
- EP-01 (SEO Foundation) - need pages to display enriched content

---

## EP-02-01: Auto-Generate Tool Summaries

**As a** content maintainer
**I want** AI to generate tool summaries from website scraping
**So that** I don't write descriptions manually for 500+ tools

### Tasks

**Scraping Pipeline:**
- [ ] Create `scripts/enrichment/scraper.ts`
- [ ] Use Puppeteer or Playwright for JS-rendered sites
- [ ] Extract: homepage text, features page, pricing page, about page
- [ ] Handle rate limiting and retries
- [ ] Store raw scraped content in MongoDB (new collection: `toolScrapedContent`)
- [ ] Add scrape timestamp for freshness tracking

**LLM Processing:**
- [ ] Create `scripts/enrichment/summarizer.ts`
- [ ] Prompt template for generating: tagline (10 words), description (50 words), longDescription (200 words)
- [ ] Use Together API (Llama 3.1 70B) for cost efficiency
- [ ] Batch processing with rate limiting
- [ ] Store generated content with `generatedAt` timestamp

**Integration:**
- [ ] Add `contentSource: 'manual' | 'generated' | 'hybrid'` field to tool schema
- [ ] Admin UI toggle to regenerate content for a tool
- [ ] Bulk regeneration endpoint for admin
- [ ] Flag for human review: `needsReview: boolean`

**Quality Control:**
- [ ] Compare generated vs manual content length
- [ ] Detect hallucinations (mentions features not on website)
- [ ] Admin review queue for generated content

---

## EP-02-02: Pros and Cons Generation

**As a** user evaluating a tool
**I want** to see pros and cons
**So that** I can make informed decisions

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  pros: string[];        // ["Fast performance", "Great UI"]
  cons: string[];        // ["Expensive", "Limited integrations"]
  prosConsGeneratedAt: Date;
  ```

**LLM Pipeline:**
- [ ] Create `scripts/enrichment/pros-cons.ts`
- [ ] Prompt template analyzing: features, pricing, reviews, comparisons
- [ ] Generate 3-5 pros, 3-5 cons per tool
- [ ] Ensure objectivity (not marketing speak)
- [ ] Cross-reference with competitor tools for relative cons

**Frontend:**
- [ ] Create `ProsConsList.tsx` component
- [ ] Two-column layout: green checkmarks for pros, red X for cons
- [ ] Add to tool detail page below description
- [ ] Collapsible on mobile

**Admin:**
- [ ] Edit pros/cons in admin tool form
- [ ] "Regenerate" button per tool
- [ ] Bulk regeneration for category

---

## EP-02-03: Use Case Suggestions

**As a** user on a tool page
**I want** to see specific use cases
**So that** I understand how the tool applies to my needs

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  useCases: {
    title: string;       // "Automate Code Reviews"
    description: string; // "Use X to automatically review PRs..."
    userTypes: string[]; // ["Developers", "Team Leads"]
  }[];
  ```

**LLM Pipeline:**
- [ ] Create `scripts/enrichment/use-cases.ts`
- [ ] Generate based on: functionality tags, user types, industry
- [ ] 3-5 use cases per tool
- [ ] Link use cases to existing userType taxonomy
- [ ] Ensure actionable descriptions (not vague)

**Frontend:**
- [ ] Create `UseCaseCard.tsx` component
- [ ] Grid layout on tool detail page
- [ ] Icon per use case (map from functionality)
- [ ] Link to relevant `/for/:userType` pages

---

## EP-02-04: Feature Extraction

**As a** user comparing tools
**I want** structured feature lists
**So that** I can compare apples to apples

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  features: {
    name: string;           // "Code Completion"
    category: string;       // "Core Features"
    available: boolean;
    details?: string;       // "Supports 50+ languages"
  }[];
  ```

**Feature Taxonomy:**
- [ ] Create standardized feature list per category
- [ ] Example for Code Assistants: "Code Completion", "Chat Interface", "Multi-file Context", "Local Model Support", etc.
- [ ] Store in `search-api/src/domains/tools/features.taxonomy.ts`

**LLM Pipeline:**
- [ ] Create `scripts/enrichment/features.ts`
- [ ] Extract features from scraped content
- [ ] Map to standardized taxonomy
- [ ] Flag unknown features for taxonomy expansion
- [ ] Confidence score for each extraction

**Frontend:**
- [ ] Create `FeatureList.tsx` component
- [ ] Grouped by category
- [ ] Checkmark/X icons for availability
- [ ] Expandable details

**Admin:**
- [ ] Feature editor in tool form
- [ ] Bulk feature management per category

---

## EP-02-05: Pricing Normalization

**As a** user comparing pricing
**I want** normalized pricing information
**So that** I can compare costs easily

### Tasks

**Schema Update:**
- [ ] Enhance existing pricing schema:
  ```typescript
  pricingNormalized: {
    hasFreeTier: boolean;
    freeLimit?: string;          // "100 requests/day"
    startingPrice?: number;      // Monthly USD
    enterpriseCustom: boolean;
    openSource: boolean;
  };
  ```

**LLM Pipeline:**
- [ ] Create `scripts/enrichment/pricing.ts`
- [ ] Scrape pricing pages
- [ ] Normalize to monthly USD equivalent
- [ ] Extract free tier limitations
- [ ] Detect "Contact Sales" patterns

**Frontend:**
- [ ] Create `PricingBadge.tsx` component: "Free", "From $20/mo", "Custom"
- [ ] Add to tool cards in listings
- [ ] Detailed pricing breakdown on tool page
- [ ] "Free tier available" filter

---

## EP-02-06: Screenshot/Media Collection

**As a** user on a tool page
**I want** to see screenshots of the tool
**So that** I can preview the interface

### Tasks

**Schema Update:**
- [ ] Add to tool model:
  ```typescript
  media: {
    screenshots: string[];     // S3/Cloudinary URLs
    demoVideo?: string;        // YouTube/Vimeo embed URL
    logo: string;              // Already exists, ensure populated
  };
  ```

**Manual Upload (Phase 1):**
- [ ] Add media upload to admin tool form
- [ ] Image upload component with drag-drop
- [ ] Cloudinary or S3 integration
- [ ] Image optimization (resize, WebP conversion)
- [ ] Video URL validation (YouTube, Vimeo, Loom)

**Automated Capture (Phase 2 - Future):**
- [ ] Puppeteer screenshot automation
- [ ] Capture homepage, key feature pages
- [ ] Requires tool-specific selectors (complex)

**Frontend:**
- [ ] Create `MediaGallery.tsx` component
- [ ] Lightbox for full-size images
- [ ] Video embed player
- [ ] Thumbnail grid on tool page

---

## EP-02-07: Content Freshness Pipeline

**As a** user
**I want** tool information to be current
**So that** I'm not reading outdated content

### Tasks

**Tracking:**
- [ ] Add to tool model:
  ```typescript
  contentMeta: {
    lastScraped: Date;
    lastEnriched: Date;
    lastManualUpdate: Date;
    contentHash: string;       // Detect changes
  };
  ```

**Freshness Worker:**
- [ ] Create `scripts/enrichment/freshness-worker.ts`
- [ ] Run weekly via cron/scheduled job
- [ ] Re-scrape tools older than 30 days
- [ ] Compare content hash to detect changes
- [ ] Flag significant changes for review

**Change Detection:**
- [ ] Detect: pricing changes, feature additions, sunset announcements
- [ ] Notification to admin for major changes
- [ ] Auto-update minor content (descriptions)
- [ ] Manual review for pricing changes

**Frontend:**
- [ ] "Last updated" badge on tool pages
- [ ] "Information may be outdated" warning for stale content (>90 days)

**Admin:**
- [ ] Freshness dashboard showing stale tools
- [ ] Bulk re-scrape by date range
- [ ] Manual "mark as fresh" option

---

## Technical Architecture

**Pipeline Structure:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scraper   │────▶│  LLM Queue  │────▶│   Storage   │
│  (Puppeteer)│     │ (Together)  │     │  (MongoDB)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      ▼                   ▼                    ▼
   Raw HTML          Structured          Tool Document
                      Content              Updated
```

**Cost Considerations:**
- Together API: ~$0.001 per 1K tokens (Llama 3.1 70B)
- Estimated cost per tool: ~$0.01-0.05
- 500 tools full enrichment: ~$25
- Monthly freshness updates: ~$5

**Job Queue:**
- Use Bull/BullMQ for job management
- Rate limiting: 10 requests/minute to Together
- Retry logic with exponential backoff
- Progress tracking for admin dashboard
