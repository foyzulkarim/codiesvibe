# EP-06: Community & Trust

## Overview
Build trust signals and community engagement to increase credibility and user retention.

## Dependencies
- EP-01 (SEO Foundation) - need tool pages for reviews
- EP-04 (Interactive AI) - Q&A features enhance community

## User Stories

### EP-06-01: User Ratings
**As a** user
**I want** to rate tools I've used
**So that** I help others decide

**Acceptance Criteria:**
- 5-star rating system
- Must be logged in (Clerk auth)
- One rating per user per tool
- Average displayed on tool page
- Rating distribution chart

---

### EP-06-02: User Reviews
**As a** user
**I want** to write reviews
**So that** I share detailed experiences

**Acceptance Criteria:**
- Text review with rating
- Review guidelines/moderation
- Helpful/not helpful voting
- Verified user badge (email confirmed)
- Display: newest first, most helpful

---

### EP-06-03: Review Moderation
**As an** admin
**I want** to moderate reviews
**So that** spam and abuse is removed

**Acceptance Criteria:**
- Flag review for review
- Admin approval queue
- Auto-flag suspicious patterns
- Remove/hide capability
- Appeal process (simple)

---

### EP-06-04: Tool Maker Responses
**As a** tool maker
**I want** to respond to reviews
**So that** I can address feedback

**Acceptance Criteria:**
- Verified tool maker badge
- Reply to reviews
- One response per review
- Highlighted as official response

---

### EP-06-05: Usage Verification
**As a** user reading reviews
**I want** to know if reviewer used the tool
**So that** I trust the review

**Acceptance Criteria:**
- "Verified User" badge option
- Connect via OAuth to tool (where supported)
- Manual verification request
- Higher trust score for verified

---

### EP-06-06: Voting/Upvotes
**As a** user
**I want** to upvote tools I recommend
**So that** good tools rise to top

**Acceptance Criteria:**
- Simple upvote (no downvote)
- Must be logged in
- One vote per user per tool
- Vote count visible
- Influences leaderboard ranking

---

### EP-06-07: User Profiles
**As a** active user
**I want** a profile page
**So that** others see my contributions

**Acceptance Criteria:**
- Profile: username, bio, links
- Shows: reviews written, tools upvoted
- Saved tools/stacks
- Reputation score (future)

---

### EP-06-08: Tool Update Notifications
**As a** user following a tool
**I want** notifications when it updates
**So that** I stay informed

**Acceptance Criteria:**
- "Follow" button on tool page
- Email notification preferences
- Updates: pricing changes, major features
- Digest option (weekly)

---

### EP-06-09: Community Q&A
**As a** user with a question
**I want** to ask the community
**So that** I get real user perspectives

**Acceptance Criteria:**
- Q&A section on tool page
- Users can answer
- Best answer selection
- Integrates with AI Q&A (AI suggests, humans verify)

---

## Technical Notes
- Spam prevention: rate limits, honeypots, ML detection
- Review schema: rating, text, userId, toolId, createdAt, helpful votes
- Consider starting with ratings only (simpler)
- Gamification later (badges, reputation)

## Trust Signals Priority
1. Ratings (simple, high impact)
2. Review count shown
3. Verified badges
4. Tool maker responses

## Success Metrics
- 20% of users rate a tool
- Average 5+ reviews per popular tool
- Review-driven traffic (Google rich snippets)
- Increased return visits
