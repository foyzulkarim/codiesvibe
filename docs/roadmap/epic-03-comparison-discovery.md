# EP-03: Comparison & Discovery

## Overview
Help users discover and compare tools through leaderboards, comparisons, and curated collections.

## Dependencies
- EP-01 (SEO Foundation) - need tool pages to link to
- EP-02 (Content Enrichment) - need structured features for comparisons

---

## EP-03-01: Tool Comparison Page

**As a** user deciding between two tools
**I want** a side-by-side comparison
**So that** I can see differences clearly

### Tasks

**Frontend:**
- [ ] Create route `/compare` with query params: `/compare?tools=cursor,copilot,codeium`
- [ ] Create `ComparePage.tsx` component
- [ ] Tool selector: search/dropdown to add tools (max 4)
- [ ] URL updates as tools are added/removed (shareable)
- [ ] Redirect to tool page if only 1 tool selected

**Comparison Layout:**
- [ ] Create `ComparisonTable.tsx` component
- [ ] Header row: tool logos, names, "Visit" buttons
- [ ] Sections:
  - Overview (tagline, description)
  - Pricing (tiers, starting price)
  - Features (checkmark matrix)
  - Pros/Cons (side by side)
  - User ratings (when available)
- [ ] Sticky header for tool names on scroll
- [ ] Mobile: swipeable cards or accordion

**Data Fetching:**
- [ ] Create `GET /api/tools/compare?ids=id1,id2,id3` endpoint
- [ ] Return tools with full details in single request
- [ ] Handle invalid IDs gracefully

**Feature Matrix:**
- [ ] Create `FeatureMatrix.tsx` component
- [ ] Rows: standardized features for category
- [ ] Columns: tools being compared
- [ ] Cells: ✓, ✗, or detail text
- [ ] Highlight differences (where tools differ)

**SEO:**
- [ ] Title: "{Tool1} vs {Tool2} vs {Tool3} Comparison | CodiesVibe"
- [ ] Meta description: "Compare {tools} side by side..."
- [ ] Consider pre-generating popular comparisons

---

## EP-03-02: Category Leaderboards

**As a** user looking for the best tool in a category
**I want** a ranked list
**So that** I can start with top options

### Tasks

**Frontend:**
- [ ] Create route `/best/:category` (e.g., `/best/code-generation`)
- [ ] Create `LeaderboardPage.tsx` component
- [ ] Ranked list with position badges (#1, #2, #3 highlighted)
- [ ] Tool card with: rank, logo, name, tagline, key metric
- [ ] "Why this ranking" expandable explanation
- [ ] Filter: pricing model, deployment

**Ranking Algorithm:**
- [ ] Create `services/ranking.service.ts`
- [ ] Factors (weighted):
  - Popularity score (search appearances, clicks)
  - User rating average (when available)
  - Feature completeness
  - Content freshness
- [ ] Store calculated rank: `tool.categoryRanks: { [category]: number }`
- [ ] Recalculate weekly via cron job

**API:**
- [ ] Create `GET /api/leaderboard/:category` endpoint
- [ ] Return tools sorted by rank
- [ ] Include rank position in response

**SEO:**
- [ ] Title: "Best {Category} Tools 2025 - Top {N} Ranked | CodiesVibe"
- [ ] Meta description optimized for "best X tools" searches
- [ ] JSON-LD for ItemList with ranking

**Admin:**
- [ ] Manual rank override capability
- [ ] "Pin to top" for sponsored (clearly labeled)

---

## EP-03-03: Quick Compare Widget

**As a** user on a tool detail page
**I want** to quickly compare with alternatives
**So that** I don't leave to search competitors

### Tasks

**Frontend:**
- [ ] Create `QuickCompare.tsx` component
- [ ] Placement: sidebar or below-fold on tool detail page
- [ ] Show top 3 alternatives by default (same category, exclude current)
- [ ] Mini comparison: logo, name, price, 3 key features
- [ ] "Compare" checkbox per tool
- [ ] "Full comparison" button → `/compare?tools=...`
- [ ] "Add to compare" persists across pages (localStorage)

**Compare Tray:**
- [ ] Create `CompareTray.tsx` floating component
- [ ] Shows selected tools for comparison (max 4)
- [ ] Visible across all pages when tools selected
- [ ] "Clear" and "Compare Now" actions
- [ ] Persist in localStorage

---

## EP-03-04: Tool Stacks/Collections

**As a** user building a workflow
**I want** curated tool combinations
**So that** I can see what works together

### Tasks

**Schema:**
- [ ] Create new model `Stack`:
  ```typescript
  interface Stack {
    id: string;
    slug: string;
    title: string;              // "Indie Developer Stack"
    description: string;
    tools: {
      toolId: string;
      purpose: string;          // "For code completion"
      isRequired: boolean;
    }[];
    targetUser: string;         // "Indie Developers"
    totalMonthlyCost: number;   // Calculated
    createdBy: string;          // Admin initially
    featured: boolean;
    createdAt: Date;
  }
  ```

**Frontend:**
- [ ] Create route `/stacks` for stack listing
- [ ] Create route `/stacks/:slug` for stack detail
- [ ] Create `StackCard.tsx` for listings
- [ ] Create `StackDetailPage.tsx`:
  - Stack header: title, description, target user
  - Tool list grouped by purpose
  - Total cost calculator
  - "Get this stack" CTA (links to each tool)
- [ ] "Save stack" for logged-in users

**API:**
- [ ] Create `GET /api/stacks` endpoint
- [ ] Create `GET /api/stacks/:slug` endpoint
- [ ] Admin: CRUD endpoints for stack management

**Admin:**
- [ ] Stack creation form
- [ ] Tool search and add to stack
- [ ] Reorder tools within stack
- [ ] Feature/unfeature stacks

**Future: Community Stacks:**
- [ ] User-submitted stacks
- [ ] Voting/popularity
- [ ] "Fork this stack" functionality

---

## EP-03-05: "Alternatives to X" Pages

**As a** user searching "Cursor alternatives"
**I want** a dedicated alternatives page
**So that** I find options quickly

### Tasks

**Frontend:**
- [ ] Create route `/alternatives/:slug` (e.g., `/alternatives/cursor`)
- [ ] Create `AlternativesPage.tsx` component
- [ ] Header: "{Tool} Alternatives" with tool info summary
- [ ] List: tools in same categories, sorted by relevance
- [ ] Highlight key differences from original tool
- [ ] Filter by: pricing, features, deployment

**Relevance Scoring:**
- [ ] Score alternatives by:
  - Category overlap
  - Feature overlap
  - User type overlap
  - Pricing similarity
- [ ] Show most relevant first

**SEO:**
- [ ] Title: "Best {Tool} Alternatives 2025 | CodiesVibe"
- [ ] Meta: "Looking for alternatives to {Tool}? Compare {N} similar tools..."
- [ ] JSON-LD for ItemList

**Cross-linking:**
- [ ] Link from tool detail page: "See alternatives"
- [ ] Link from comparison page: "More alternatives to {Tool}"

---

## EP-03-06: Filter & Sort Enhancements

**As a** user browsing a category
**I want** advanced filtering
**So that** I narrow down options

### Tasks

**Filter Options:**
- [ ] Pricing model: Free, Freemium, Paid, Open Source
- [ ] Price range: slider for monthly cost
- [ ] Deployment: Cloud, Self-hosted, Desktop, Browser Extension
- [ ] Features: multi-select from category features
- [ ] User rating: minimum stars (when available)
- [ ] Content freshness: "Updated in last 30 days"

**Sort Options:**
- [ ] Alphabetical (A-Z, Z-A)
- [ ] Price (Low to High, High to Low)
- [ ] Popularity (most searched)
- [ ] Rating (highest rated)
- [ ] Newest added
- [ ] Recently updated

**Frontend:**
- [ ] Create `FilterPanel.tsx` component
- [ ] Collapsible on mobile
- [ ] Active filter chips with remove option
- [ ] "Clear all filters" button
- [ ] Filter count badge

**URL Persistence:**
- [ ] Sync filters to URL query params
- [ ] Shareable filtered URLs
- [ ] Browser back/forward support

**API:**
- [ ] Ensure all filter params supported in `GET /api/tools`
- [ ] Add sort parameter support

---

## EP-03-07: Trending Tools Section

**As a** returning user
**I want** to see what's new/trending
**So that** I discover new tools

### Tasks

**Trending Algorithm:**
- [ ] Create `services/trending.service.ts`
- [ ] Signals:
  - Search volume (last 7 days)
  - Click-through rate
  - New tools (added in last 14 days)
  - External mentions (future: social signals)
- [ ] Calculate daily, cache results
- [ ] Store: `tool.trendingScore: number`

**Frontend:**
- [ ] Create `TrendingSection.tsx` component
- [ ] Homepage placement: above fold or prominent section
- [ ] Show 4-6 trending tools
- [ ] Badge: "Trending", "New", "Rising"
- [ ] Carousel or grid layout
- [ ] "View all trending" link

**API:**
- [ ] Create `GET /api/tools/trending` endpoint
- [ ] Parameters: limit, timeframe
- [ ] Include trend direction (up/down/stable)

**New Tools Section:**
- [ ] Separate "Recently Added" section
- [ ] Show tools added in last 30 days
- [ ] Sorted by add date (newest first)

---

## Technical Considerations

**Caching Strategy:**
- Leaderboards: cache 1 hour, recalculate daily
- Trending: cache 15 minutes, recalculate hourly
- Comparisons: cache by tool combination, invalidate on tool update
- Alternatives: cache per tool, invalidate on tool update

**Pre-generation:**
- Consider pre-generating popular comparisons
- Pre-generate alternatives pages for top 50 tools
- Reduces load time and improves SEO

**URL Structure:**
```
/compare?tools=cursor,copilot          → Comparison
/best/:category                        → Leaderboard
/stacks                                → Stack listing
/stacks/:slug                          → Stack detail
/alternatives/:slug                    → Alternatives
```
