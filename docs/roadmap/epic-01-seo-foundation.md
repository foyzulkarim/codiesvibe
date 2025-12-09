# EP-01: SEO Foundation

## Overview
Create indexable pages that capture organic search traffic. Transform the single-page app into a content-rich site that Google can crawl.

## Dependencies
None - this is the foundation for all other epics.

## User Stories

### EP-01-01: Tool Detail Pages
**As a** user searching Google for "Cursor AI review"
**I want** to land on a dedicated Cursor page on CodiesVibe
**So that** I can learn about the tool without extra navigation

**Acceptance Criteria:**
- Route: `/tools/:slug`
- Displays: name, logo, description, pricing, categories, links
- Shows "Similar Tools" section (same category)
- Meta tags for SEO (title, description, OG tags)
- Structured data (JSON-LD for SoftwareApplication)

---

### EP-01-02: Category Landing Pages
**As a** user searching "best AI code generators"
**I want** to find a category page listing all code generation tools
**So that** I can browse relevant options

**Acceptance Criteria:**
- Route: `/category/:category`
- Lists all tools in that category
- Brief category description
- Filter/sort options (pricing, popularity)
- Meta tags optimized for "best [category] tools"

---

### EP-01-03: User Type Landing Pages
**As a** developer looking for AI tools
**I want** a page showing "AI tools for developers"
**So that** I find tools relevant to my role

**Acceptance Criteria:**
- Route: `/for/:userType`
- Lists tools tagged for that user type
- Grouped by common use cases
- Examples: `/for/developers`, `/for/marketers`, `/for/designers`

---

### EP-01-04: Sitemap Generation
**As a** search engine crawler
**I want** an XML sitemap of all pages
**So that** I can index the site efficiently

**Acceptance Criteria:**
- Auto-generated sitemap.xml
- Includes: all tool pages, category pages, user type pages
- Updates when tools are added/removed
- Submitted to Google Search Console

---

### EP-01-05: Dynamic Meta Tags
**As a** user sharing a tool page on social media
**I want** proper preview cards to appear
**So that** the link looks professional

**Acceptance Criteria:**
- Server-side or prerendered meta tags
- Open Graph tags (title, description, image)
- Twitter Card tags
- Canonical URLs

---

### EP-01-06: Breadcrumb Navigation
**As a** user on a tool detail page
**I want** breadcrumbs showing my location
**So that** I can navigate to parent categories

**Acceptance Criteria:**
- Home > Category > Tool Name
- Clickable links
- Structured data for breadcrumbs

---

### EP-01-07: Internal Linking Strategy
**As a** search engine
**I want** proper internal links between related content
**So that** I can understand site structure and pass authority

**Acceptance Criteria:**
- Tool pages link to their categories
- Category pages link to related categories
- "You might also like" sections
- Footer with category links

---

## Technical Notes
- Consider SSR/SSG for SEO (Next.js migration or prerendering)
- Current Vite SPA will need meta tag solution (react-helmet-async + prerender)
- API endpoints already exist for tool data

## Success Metrics
- 500+ pages indexed in Google
- Organic impressions within 30 days
- Reduced bounce rate from search traffic
