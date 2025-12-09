# EP-01: SEO Foundation

## Overview
Create indexable pages that capture organic search traffic. Transform the single-page app into a content-rich site that Google can crawl.

## Dependencies
None - this is the foundation for all other epics.

---

## EP-01-01: Tool Detail Pages

**As a** user searching Google for "Cursor AI review"
**I want** to land on a dedicated Cursor page on CodiesVibe
**So that** I can learn about the tool without extra navigation

### Tasks

**Frontend:**
- [ ] Create route `/tools/:slug` in React Router
- [ ] Create `ToolDetailPage.tsx` component
- [ ] Build hero section: logo, name, tagline, website button
- [ ] Build description section: long description with markdown support
- [ ] Build pricing section: render pricing tiers from schema
- [ ] Build metadata sidebar: categories, industries, user types, deployment
- [ ] Build links section: website, documentation, pricing URL
- [ ] Add "Similar Tools" component (query same category, exclude current)
- [ ] Add loading skeleton state
- [ ] Add 404 handling for invalid slugs
- [ ] Mobile responsive layout

**API:**
- [ ] Add `GET /api/tools/slug/:slug` endpoint (or reuse existing by-ID)
- [ ] Add `GET /api/tools/:id/similar` endpoint (limit 4-6 tools)

**SEO:**
- [ ] Install `react-helmet-async`
- [ ] Add dynamic `<title>`: "{Tool Name} - AI Tool Review | CodiesVibe"
- [ ] Add meta description from tool.description
- [ ] Add canonical URL
- [ ] Add JSON-LD structured data (SoftwareApplication schema)

---

## EP-01-02: Category Landing Pages

**As a** user searching "best AI code generators"
**I want** to find a category page listing all code generation tools
**So that** I can browse relevant options

### Tasks

**Frontend:**
- [ ] Create route `/category/:category` in React Router
- [ ] Create `CategoryPage.tsx` component
- [ ] Map URL slug to category enum (e.g., `code-generation` → `Code Generation`)
- [ ] Build header: category name, description, tool count
- [ ] Create category descriptions object (static content per category)
- [ ] Render tool grid (reuse existing `ToolCard` component)
- [ ] Add filter controls: pricing model, deployment type
- [ ] Add sort options: alphabetical, newest, popularity
- [ ] Pagination or infinite scroll
- [ ] Add "Related Categories" section
- [ ] 404 for invalid category slugs

**API:**
- [ ] Ensure `GET /api/tools?category=X` filter works
- [ ] Add category metadata endpoint or static data

**SEO:**
- [ ] Title: "Best {Category} Tools 2025 | CodiesVibe"
- [ ] Meta description: "Discover the best {category} tools..."
- [ ] JSON-LD for ItemList

---

## EP-01-03: User Type Landing Pages

**As a** developer looking for AI tools
**I want** a page showing "AI tools for developers"
**So that** I find tools relevant to my role

### Tasks

**Frontend:**
- [ ] Create route `/for/:userType` in React Router
- [ ] Create `UserTypePage.tsx` component
- [ ] Map URL slug to userType enum (e.g., `developers` → `Developers`)
- [ ] Build header: "AI Tools for {UserType}", description
- [ ] Create user type descriptions object (static content)
- [ ] Group tools by primary category or use case
- [ ] Render tool cards with relevance context
- [ ] Add "Popular for {UserType}" featured section
- [ ] 404 for invalid user type slugs

**API:**
- [ ] Ensure `GET /api/tools?userType=X` filter works

**SEO:**
- [ ] Title: "AI Tools for {UserType} | CodiesVibe"
- [ ] Meta description tailored to user type
- [ ] JSON-LD for ItemList

---

## EP-01-04: Sitemap Generation

**As a** search engine crawler
**I want** an XML sitemap of all pages
**So that** I can index the site efficiently

### Tasks

**Build Process:**
- [ ] Create sitemap generation script `scripts/generate-sitemap.ts`
- [ ] Fetch all tools from API/database
- [ ] Generate URLs for: tool pages, category pages, user type pages, static pages
- [ ] Set priority: home (1.0), categories (0.8), tools (0.6)
- [ ] Set changefreq: tools (weekly), categories (weekly)
- [ ] Output `sitemap.xml` to public folder
- [ ] Add sitemap index if >50k URLs

**Automation:**
- [ ] Run sitemap generation on build
- [ ] Add npm script: `npm run generate:sitemap`
- [ ] Consider webhook to regenerate when tools added

**Verification:**
- [ ] Add `robots.txt` with sitemap reference
- [ ] Submit to Google Search Console
- [ ] Submit to Bing Webmaster Tools

---

## EP-01-05: Dynamic Meta Tags

**As a** user sharing a tool page on social media
**I want** proper preview cards to appear
**So that** the link looks professional

### Tasks

**Implementation Options (choose one):**

Option A: Prerendering
- [ ] Install `prerender-spa-plugin` or use `react-snap`
- [ ] Configure routes to prerender
- [ ] Test with Google's Rich Results Test

Option B: SSR Migration
- [ ] Evaluate Next.js migration path
- [ ] Plan incremental migration strategy

**Meta Tags (either option):**
- [ ] Open Graph tags: og:title, og:description, og:image, og:url, og:type
- [ ] Twitter Card tags: twitter:card, twitter:title, twitter:description, twitter:image
- [ ] Default OG image for tools without logos
- [ ] Generate OG images dynamically (future enhancement)

**Testing:**
- [ ] Test with Facebook Sharing Debugger
- [ ] Test with Twitter Card Validator
- [ ] Test with LinkedIn Post Inspector

---

## EP-01-06: Breadcrumb Navigation

**As a** user on a tool detail page
**I want** breadcrumbs showing my location
**So that** I can navigate to parent categories

### Tasks

**Frontend:**
- [ ] Create `Breadcrumbs.tsx` component
- [ ] Accept props: `items: { label, href }[]`
- [ ] Style with Tailwind (separator, hover states)
- [ ] Add to tool detail pages: Home > {Category} > {Tool}
- [ ] Add to category pages: Home > Categories > {Category}
- [ ] Add to user type pages: Home > For > {UserType}
- [ ] Make final item non-clickable (current page)

**SEO:**
- [ ] Add BreadcrumbList JSON-LD schema
- [ ] Test with Google Rich Results Test

---

## EP-01-07: Internal Linking Strategy

**As a** search engine
**I want** proper internal links between related content
**So that** I can understand site structure and pass authority

### Tasks

**Tool Pages:**
- [ ] Link category badges to category pages
- [ ] Link user type badges to user type pages
- [ ] "Similar Tools" section links to tool pages
- [ ] "More in {Category}" link at bottom

**Category Pages:**
- [ ] "Related Categories" section with links
- [ ] Each tool card links to tool detail page
- [ ] "Browse all categories" link

**Homepage:**
- [ ] Featured categories section with links
- [ ] "Browse by role" section linking to user type pages
- [ ] Recent/trending tools linking to detail pages

**Footer:**
- [ ] Category links (top 8-10)
- [ ] User type links (top 6-8)
- [ ] Static page links (About, Contact, etc.)

**Navigation:**
- [ ] Add "Categories" dropdown to header
- [ ] Add "For" dropdown (user types) to header

---

## Technical Considerations

**Prerendering vs SSR Decision:**
- Start with prerendering (lower effort)
- Monitor Core Web Vitals
- Consider SSR if prerendering insufficient

**URL Structure:**
```
/tools/:slug           → Tool detail
/category/:category    → Category listing
/for/:userType         → User type listing
/sitemap.xml           → XML sitemap
```

**Schema Mapping:**
```typescript
// URL slug generators
const categorySlug = (cat: string) => cat.toLowerCase().replace(/ /g, '-');
const userTypeSlug = (ut: string) => ut.toLowerCase().replace(/ /g, '-');
const toolSlug = (tool: Tool) => tool.slug || tool.name.toLowerCase().replace(/ /g, '-');
```
