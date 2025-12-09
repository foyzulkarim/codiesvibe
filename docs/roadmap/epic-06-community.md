# EP-06: Community & Trust

## Overview
Build trust signals and community engagement to increase credibility and user retention.

## Dependencies
- EP-01 (SEO Foundation) - need tool pages for reviews
- EP-04 (Interactive AI) - Q&A features enhance community

---

## EP-06-01: User Ratings

**As a** user
**I want** to rate tools I've used
**So that** I help others decide

### Tasks

**Schema:**
- [ ] Create `Rating` model:
  ```typescript
  interface Rating {
    id: string;
    toolId: string;
    userId: string;
    score: number;          // 1-5
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- [ ] Add to tool model:
  ```typescript
  ratings: {
    average: number;        // Calculated
    count: number;          // Total ratings
    distribution: number[]; // [1star, 2star, 3star, 4star, 5star]
  };
  ```

**Frontend:**
- [ ] Create `StarRating.tsx` component (display)
- [ ] Create `RatingInput.tsx` component (interactive)
- [ ] Placement: tool detail page, above fold
- [ ] Show average + count: "4.2 ★ (128 ratings)"
- [ ] Click to rate (opens modal if not logged in)
- [ ] Update/change existing rating

**API:**
- [ ] Create `POST /api/tools/:id/rate` endpoint
- [ ] Create `GET /api/tools/:id/ratings` endpoint
- [ ] Recalculate tool average on new rating
- [ ] One rating per user per tool (upsert)

**Display:**
- [ ] Rating distribution bar chart
- [ ] "Rate this tool" CTA for users who haven't rated
- [ ] Show user's rating if already submitted
- [ ] Rating in tool cards (listings)

**Validation:**
- [ ] Must be logged in to rate
- [ ] Prevent rating spam (rate limit)
- [ ] Minimum account age? (optional, prevents abuse)

---

## EP-06-02: User Reviews

**As a** user
**I want** to write reviews
**So that** I share detailed experiences

### Tasks

**Schema:**
- [ ] Create `Review` model:
  ```typescript
  interface Review {
    id: string;
    toolId: string;
    userId: string;
    ratingId: string;       // Link to rating
    title: string;
    body: string;           // Markdown supported
    pros: string[];
    cons: string[];
    useCase: string;        // "Used for personal projects"
    experienceDuration: string; // "1-6 months"
    helpful: number;        // Helpful votes
    notHelpful: number;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    createdAt: Date;
    updatedAt: Date;
  }
  ```

**Frontend:**
- [ ] Create `ReviewForm.tsx` component
- [ ] Fields: title, body, pros (list), cons (list), use case dropdown
- [ ] Rating required with review
- [ ] Character limits: title (100), body (2000)
- [ ] Preview before submit
- [ ] Create `ReviewCard.tsx` component
- [ ] Create `ReviewList.tsx` component
- [ ] Sort: newest, most helpful, highest/lowest rated

**API:**
- [ ] Create `POST /api/tools/:id/reviews` endpoint
- [ ] Create `GET /api/tools/:id/reviews` endpoint
- [ ] Create `PATCH /api/reviews/:id` endpoint (edit own)
- [ ] Create `DELETE /api/reviews/:id` endpoint

**Guidelines:**
- [ ] Review guidelines modal before first review
- [ ] Prohibited: spam, ads, personal attacks, off-topic
- [ ] Encourage: specific examples, balanced feedback

---

## EP-06-03: Review Moderation

**As an** admin
**I want** to moderate reviews
**So that** spam and abuse is removed

### Tasks

**Moderation Queue:**
- [ ] Create `/admin/reviews` page
- [ ] Filter by: status, date, tool, flagged
- [ ] Bulk actions: approve, reject, delete
- [ ] Individual review actions with notes

**Auto-Moderation:**
- [ ] Spam detection (links, keywords, patterns)
- [ ] Profanity filter
- [ ] Duplicate detection (same text across tools)
- [ ] New user review delay (optional)
- [ ] Flag threshold: X "not helpful" votes → auto-flag

**Manual Moderation:**
- [ ] Approve: publish review
- [ ] Reject: hide review, notify user with reason
- [ ] Edit: admin can edit minor issues
- [ ] Delete: permanent removal

**User Flagging:**
- [ ] "Report" button on reviews
- [ ] Report reasons: spam, inappropriate, fake, other
- [ ] Flagged reviews go to moderation queue
- [ ] Reporter sees "Under review" status

**Notifications:**
- [ ] Email user when review approved/rejected
- [ ] Admin notification for flagged reviews
- [ ] Weekly moderation summary

---

## EP-06-04: Tool Maker Responses

**As a** tool maker
**I want** to respond to reviews
**So that** I can address feedback

### Tasks

**Schema Update:**
- [ ] Add to Review model:
  ```typescript
  response?: {
    body: string;
    respondedBy: string;    // Tool maker user ID
    respondedAt: Date;
    updatedAt?: Date;
  };
  ```

**Permissions:**
- [ ] Only verified tool owner can respond
- [ ] Link to EP-05-05 (Tool Maker Accounts)
- [ ] One response per review

**Frontend:**
- [ ] "Respond" button visible to tool owner
- [ ] Response form (text area, 500 char limit)
- [ ] Response display below review
- [ ] "Official Response" badge
- [ ] Edit response option

**API:**
- [ ] Create `POST /api/reviews/:id/respond` endpoint
- [ ] Create `PATCH /api/reviews/:id/respond` endpoint
- [ ] Verify tool ownership before allowing response

**Guidelines:**
- [ ] Professional tone required
- [ ] No personal attacks on reviewer
- [ ] Moderation for inappropriate responses

---

## EP-06-05: Usage Verification

**As a** user reading reviews
**I want** to know if reviewer used the tool
**So that** I trust the review

### Tasks

**Verification Methods:**

Option A: Self-Declaration
- [ ] "I have used this tool" checkbox when reviewing
- [ ] Usage duration selection
- [ ] Low trust but low friction

Option B: OAuth Connection (where possible)
- [ ] Connect tool account (if tool has OAuth)
- [ ] Verify active subscription/usage
- [ ] Limited to tools with OAuth APIs
- [ ] High trust, complex implementation

Option C: Screenshot Verification
- [ ] Upload screenshot of tool usage
- [ ] Manual admin verification
- [ ] Medium trust, some friction

**Implementation (Start with A):**
- [ ] Add to review form: usage declaration
- [ ] Add to Review model: `verified: boolean`, `verificationMethod: string`
- [ ] Display "Verified User" badge on review
- [ ] Filter reviews by verified only

**Trust Scoring:**
- [ ] Verified reviews weighted higher in "Most Helpful"
- [ ] Verified users' ratings weighted in average
- [ ] "X verified reviews" count on tool page

---

## EP-06-06: Voting/Upvotes

**As a** user
**I want** to upvote tools I recommend
**So that** good tools rise to top

### Tasks

**Schema:**
- [ ] Create `Vote` model:
  ```typescript
  interface Vote {
    id: string;
    toolId: string;
    userId: string;
    createdAt: Date;
  }
  ```
- [ ] Add to tool model:
  ```typescript
  votes: {
    count: number;
    userIds: string[];   // For quick "has voted" check
  };
  ```

**Frontend:**
- [ ] Create `VoteButton.tsx` component
- [ ] Upvote only (no downvote - keeps positive)
- [ ] Toggle: click to vote, click again to unvote
- [ ] Show vote count
- [ ] Placement: tool cards, tool detail page
- [ ] Login prompt for anonymous users

**API:**
- [ ] Create `POST /api/tools/:id/vote` endpoint
- [ ] Create `DELETE /api/tools/:id/vote` endpoint
- [ ] Atomic increment/decrement

**Integration:**
- [ ] Votes factor into leaderboard ranking (EP-03-02)
- [ ] "Most Upvoted" sort option
- [ ] Weekly "Top Voted" section

---

## EP-06-07: User Profiles

**As a** active user
**I want** a profile page
**So that** others see my contributions

### Tasks

**Schema:**
- [ ] Create/extend `UserProfile` model:
  ```typescript
  interface UserProfile {
    userId: string;
    username: string;       // Public display name
    bio?: string;
    website?: string;
    avatar?: string;
    role?: string;          // "Developer at XYZ"
    joinedAt: Date;
    stats: {
      reviewsWritten: number;
      ratingsGiven: number;
      votesGiven: number;
      helpfulVotes: number; // Received on their reviews
    };
  }
  ```

**Frontend:**
- [ ] Create `/user/:username` route
- [ ] Create `UserProfilePage.tsx`
- [ ] Sections:
  - Header: avatar, name, bio, joined date
  - Stats: reviews, ratings, helpful votes received
  - Recent reviews (with links to tools)
  - Saved tools/stacks (if public)
- [ ] Create `ProfileSettings.tsx` for editing own profile

**Privacy:**
- [ ] Public/private profile toggle
- [ ] Hide activity option
- [ ] Username vs real name choice

**Clerk Integration:**
- [ ] Sync avatar from Clerk
- [ ] Profile completion prompt
- [ ] Username uniqueness check

---

## EP-06-08: Tool Update Notifications

**As a** user following a tool
**I want** notifications when it updates
**So that** I stay informed

### Tasks

**Schema:**
- [ ] Create `Follow` model:
  ```typescript
  interface Follow {
    id: string;
    userId: string;
    toolId: string;
    createdAt: Date;
    notifications: {
      email: boolean;
      inApp: boolean;
    };
  }
  ```

**Frontend:**
- [ ] Create `FollowButton.tsx` component
- [ ] Placement: tool detail page header
- [ ] Toggle follow/unfollow
- [ ] Follow count display (optional)
- [ ] Notification preferences in user settings

**Notification Triggers:**
- [ ] Pricing change detected
- [ ] Major feature update
- [ ] Tool status change (beta → active, deprecated)
- [ ] New reviews added (optional)

**Notification Delivery:**
- [ ] In-app notification center
- [ ] Email digest (daily/weekly option)
- [ ] Create `NotificationService`
- [ ] Email templates per notification type

**API:**
- [ ] Create `POST /api/tools/:id/follow` endpoint
- [ ] Create `DELETE /api/tools/:id/follow` endpoint
- [ ] Create `GET /api/user/following` endpoint
- [ ] Create `GET /api/user/notifications` endpoint

---

## EP-06-09: Community Q&A

**As a** user with a question
**I want** to ask the community
**So that** I get real user perspectives

### Tasks

**Schema:**
- [ ] Create `Question` model:
  ```typescript
  interface Question {
    id: string;
    toolId: string;
    userId: string;
    title: string;
    body: string;
    status: 'open' | 'answered' | 'closed';
    upvotes: number;
    createdAt: Date;
  }
  ```
- [ ] Create `Answer` model:
  ```typescript
  interface Answer {
    id: string;
    questionId: string;
    userId: string;
    body: string;
    upvotes: number;
    isBestAnswer: boolean;
    isOfficialAnswer: boolean;  // From tool maker
    createdAt: Date;
  }
  ```

**Frontend:**
- [ ] Create `QASection.tsx` component for tool pages
- [ ] Create `QuestionForm.tsx`
- [ ] Create `QuestionList.tsx`
- [ ] Create `AnswerForm.tsx`
- [ ] Mark best answer (question asker can select)
- [ ] Official answer badge for tool maker responses

**Integration with AI (EP-04-01):**
- [ ] AI suggests answer from tool data
- [ ] User can accept/reject AI suggestion
- [ ] "Answered by AI" badge
- [ ] Human answers preferred over AI

**Moderation:**
- [ ] Flag inappropriate questions/answers
- [ ] Close duplicate questions
- [ ] Merge similar questions

**Gamification (Future):**
- [ ] Reputation points for helpful answers
- [ ] Answer streaks
- [ ] Expert badges

---

## Technical Considerations

**Spam Prevention:**
- Rate limiting on all user actions
- Honeypot fields in forms
- reCAPTCHA for anonymous actions
- Account age requirements for certain actions
- ML-based spam detection (future)

**Database Indexes:**
```javascript
// Reviews
{ toolId: 1, status: 1, createdAt: -1 }
{ userId: 1, createdAt: -1 }

// Ratings
{ toolId: 1 }
{ userId: 1, toolId: 1 } // unique

// Votes
{ toolId: 1 }
{ userId: 1, toolId: 1 } // unique
```

**Caching:**
- Tool rating averages: cache, invalidate on new rating
- Review counts: cache, invalidate on new review
- Vote counts: atomic updates, no cache needed

**Notification System:**
- Queue-based (Bull/BullMQ)
- Batch email digests
- Real-time in-app via WebSocket or polling

**Trust & Safety Priority:**
1. Ratings (simple, immediate value)
2. Reviews (more effort, more value)
3. Review moderation (essential for reviews)
4. Voting (engagement)
5. Profiles (identity)
6. Q&A (complex, requires active community)
7. Tool maker responses (requires claimed tools EP-05-05)
8. Notifications (requires content to notify about)
