# EP-02: Content Enrichment

## Overview
Use AI to auto-generate rich content for tool pages, reducing manual data entry while creating valuable, unique content.

## Dependencies
- EP-01 (SEO Foundation) - need pages to display enriched content

## User Stories

### EP-02-01: Auto-Generate Tool Summaries
**As a** content maintainer
**I want** AI to generate tool summaries from website scraping
**So that** I don't write descriptions manually for 500+ tools

**Acceptance Criteria:**
- Pipeline: URL → scrape → LLM → structured summary
- Generates: tagline, description, longDescription
- Human review flag for quality check
- Batch processing for existing tools

---

### EP-02-02: Pros and Cons Generation
**As a** user evaluating a tool
**I want** to see pros and cons
**So that** I can make informed decisions

**Acceptance Criteria:**
- Schema addition: `pros: string[]`, `cons: string[]`
- LLM generates from tool features + reviews
- 3-5 items each
- Display on tool detail page

---

### EP-02-03: Use Case Suggestions
**As a** user on a tool page
**I want** to see specific use cases
**So that** I understand how the tool applies to my needs

**Acceptance Criteria:**
- Schema addition: `useCases: { title, description }[]`
- LLM generates based on functionality + user types
- 3-5 use cases per tool
- Links to relevant user type pages

---

### EP-02-04: Feature Extraction
**As a** user comparing tools
**I want** structured feature lists
**So that** I can compare apples to apples

**Acceptance Criteria:**
- Schema addition: `features: { name, available, details }[]`
- LLM extracts from website/docs
- Standardized feature names within categories
- Enables comparison matrices later

---

### EP-02-05: Pricing Normalization
**As a** user comparing pricing
**I want** normalized pricing information
**So that** I can compare costs easily

**Acceptance Criteria:**
- Extract: free tier limits, starting price, enterprise pricing
- Normalize to monthly cost where possible
- Flag: "has free tier", "open source", "custom pricing"
- LLM assists with pricing page parsing

---

### EP-02-06: Screenshot/Media Collection
**As a** user on a tool page
**I want** to see screenshots of the tool
**So that** I can preview the interface

**Acceptance Criteria:**
- Schema addition: `screenshots: string[]`, `demoVideo: string`
- Manual upload initially
- Future: automated screenshot capture
- Gallery component on tool page

---

### EP-02-07: Content Freshness Pipeline
**As a** user
**I want** tool information to be current
**So that** I'm not reading outdated content

**Acceptance Criteria:**
- Periodic re-scrape of tool websites
- Detect significant changes
- Flag for review when major updates found
- "Last updated" timestamp visible

---

## Technical Notes
- Build as background job/pipeline (separate from main API)
- Use Together API or local vLLM for cost efficiency
- Store generation metadata for debugging
- Consider content versioning

## Success Metrics
- 80% of tools have auto-generated content
- Manual content work reduced by 70%
- Unique content per page (not duplicated descriptions)
