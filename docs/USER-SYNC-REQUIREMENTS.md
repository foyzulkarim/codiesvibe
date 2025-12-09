# User Data Sync Requirements

## Overview

This document outlines the requirements for syncing Clerk user data to our local MongoDB database. This enables richer queries, analytics, and audit trails without depending on external API calls to Clerk.

## Problem Statement

Currently, we only store the Clerk `userId` (as `contributor`) in the tools collection. This means:
- To display user info (name, email, avatar), we need to call Clerk's API
- We can't efficiently query/join user data with tools
- Analytics like "top contributors" require multiple API calls
- If Clerk is temporarily unavailable, we lose user context

## Proposed Solution

Create a lightweight `users` collection that syncs with Clerk via webhooks.

## Data Model

### Users Collection Schema

```typescript
interface User {
  // Identity (from Clerk)
  clerkId: string;              // Primary key, matches Clerk userId
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;

  // Role & Permissions (from Clerk publicMetadata)
  role: 'admin' | 'maintainer';

  // App-specific fields (local only)
  toolsCreated: number;         // Denormalized count for quick queries
  toolsApproved: number;        // Count of approved tools
  lastActiveAt: Date;           // Last API interaction

  // Audit fields
  createdAt: Date;
  updatedAt: Date;

  // Soft delete support
  deletedAt?: Date;
}
```

### Indexes

```typescript
// Primary lookup
{ clerkId: 1 }  // unique

// Query patterns
{ email: 1 }
{ role: 1 }
{ toolsCreated: -1 }  // For "top contributors" queries
{ lastActiveAt: -1 }
```

## Clerk Webhook Events

### Events to Handle

| Event | Action |
|-------|--------|
| `user.created` | Insert new user document |
| `user.updated` | Update user info (name, email, avatar, metadata) |
| `user.deleted` | Soft delete (set `deletedAt`) or anonymize |

### Webhook Payload Example (user.created/updated)

```json
{
  "type": "user.created",
  "data": {
    "id": "user_36Pkaa7AOxNyli4MKHbw5nnOVYb",
    "email_addresses": [
      {
        "email_address": "user@example.com",
        "id": "idn_xxx"
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://...",
    "public_metadata": {
      "role": "admin"
    }
  }
}
```

## Implementation Tasks

### Backend (search-api)

1. **User Model** (`src/models/user.model.ts`)
   - Create Mongoose schema with fields above
   - Add indexes
   - Add validation

2. **Webhook Endpoint** (`src/routes/webhooks.routes.ts`)
   - `POST /api/webhooks/clerk`
   - Verify Clerk webhook signature (svix)
   - Handle user.created, user.updated, user.deleted events

3. **User Service** (`src/services/user.service.ts`)
   - `createOrUpdateUser(clerkData)`
   - `getUserByClerkId(clerkId)`
   - `incrementToolCount(clerkId)`
   - `decrementToolCount(clerkId)`

4. **Update Tool Service**
   - When tool is created: increment user's `toolsCreated`
   - When tool is approved: increment user's `toolsApproved`
   - When tool is deleted: decrement counts

5. **API Endpoints** (optional)
   - `GET /api/users/:clerkId` - Get user profile
   - `GET /api/users/top-contributors` - Leaderboard

### Clerk Dashboard Setup

1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `.env` as `CLERK_WEBHOOK_SECRET`

### Environment Variables

```env
# Clerk Webhook
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

## Security Considerations

1. **Webhook Verification**
   - Always verify Clerk's webhook signature using svix library
   - Reject requests with invalid signatures

2. **Data Privacy**
   - Only store necessary user fields
   - Respect GDPR: support data export and deletion
   - On user.deleted: either soft delete or anonymize data

3. **Rate Limiting**
   - Webhook endpoint should have its own rate limits
   - Protect against replay attacks

## Benefits After Implementation

1. **Fast Queries**
   ```javascript
   // Get tools with contributor names
   db.tools.aggregate([
     { $lookup: { from: 'users', localField: 'contributor', foreignField: 'clerkId', as: 'user' } }
   ])
   ```

2. **Rich Analytics**
   - Top contributors leaderboard
   - User activity reports
   - Tools per user statistics

3. **Audit Trail**
   - Who created what, when
   - Who reviewed/approved tools
   - User activity timeline

4. **Resilience**
   - Works even if Clerk API is slow/down
   - Cached user data for display

## Migration Strategy

For existing tools with `contributor` field:
1. Deploy webhook handler first
2. Run one-time script to fetch all existing contributors from Clerk
3. Populate users collection with historical data

## Future Enhancements

- User preferences (notification settings, theme)
- User-specific rate limits
- Contributor badges/achievements
- User blocking/banning at app level

---

*Document created: December 2024*
*Status: Requirements only - implementation pending*
