# Data Model: NestJS REST API Backend

## Entity Definitions

### User Entity
**Purpose**: Represents authenticated individuals with GitHub accounts
**Storage**: MongoDB collection `users`

**Schema**:
```typescript
{
  _id: ObjectId,           // MongoDB primary key
  githubId: string,        // GitHub user ID (unique)
  username: string,        // GitHub username
  email: string,           // GitHub email (optional)
  displayName: string,     // GitHub display name
  avatarUrl: string,       // GitHub profile picture
  accessToken: string,     // GitHub OAuth token (encrypted)
  createdAt: Date,         // Account creation timestamp
  updatedAt: Date,         // Last profile update
  lastLoginAt: Date        // Last authentication timestamp
}
```

**Validation Rules**:
- `githubId`: Required, unique, string
- `username`: Required, string, min 1 char
- `email`: Optional, valid email format if provided
- `displayName`: Required, string, min 1 char
- `avatarUrl`: Required, valid URL format
- `accessToken`: Required, encrypted string

**Indexes**:
- Primary: `_id` (automatic)
- Unique: `githubId` (for OAuth lookup)
- Performance: `username` (for search/display)

### Tool Entity
**Purpose**: Simple data objects for demonstrating CRUD operations
**Storage**: MongoDB collection `tools`

**Schema**:
```typescript
{
  _id: ObjectId,           // MongoDB primary key
  name: string,            // Tool name
  description: string,     // Tool description
  createdBy: ObjectId,     // Reference to User._id
  createdAt: Date,         // Creation timestamp
  updatedAt: Date          // Last modification timestamp
}
```

**Validation Rules**:
- `name`: Required, string, 1-100 characters, trimmed
- `description`: Required, string, 1-500 characters, trimmed
- `createdBy`: Required, valid ObjectId reference to User
- Timestamps: Auto-managed by Mongoose

**Indexes**:
- Primary: `_id` (automatic)
- Performance: `createdBy` (for user-specific queries)
- Search: Text index on `name` and `description` (for search functionality)

## Entity Relationships

### User → Tools (One-to-Many)
- One User can create multiple Tools
- Each Tool belongs to exactly one User
- Relationship enforced via `Tool.createdBy` foreign key
- User deletion should cascade to owned Tools

### Access Control
- Users can only access their own Tools (enforced by `createdBy` filter)
- No shared or public Tools in initial implementation
- Authentication required for all Tool operations

## State Transitions

### User Lifecycle
1. **Registration**: GitHub OAuth creates User record
2. **Active**: User can perform CRUD operations on Tools
3. **Token Refresh**: GitHub token renewal updates User record
4. **Logout**: Session ends, but User record persists

### Tool Lifecycle
1. **Created**: User creates Tool with name and description
2. **Active**: Tool can be read, updated, deleted by owner
3. **Updated**: Modification updates `updatedAt` timestamp
4. **Deleted**: Tool removed from system (soft or hard delete)

## Data Integrity

### Constraints
- User.githubId uniqueness enforced at database level
- Tool.createdBy must reference existing User._id
- All required fields validated before database operations
- String length limits enforced by DTOs and schema

### Data Validation
- Input validation via class-validator DTOs
- Schema validation via Mongoose schemas
- Business logic validation in service layers
- Database constraints as final safety net

## Search Requirements

### Tool Search
- **Text Search**: Full-text search on `name` and `description` fields
- **Filters**: Filter by creation date range (if needed)
- **Scope**: User can only search their own Tools
- **Performance**: Text index on searchable fields
- **Pagination**: Support for limit/offset or cursor-based pagination

### Search Implementation
```typescript
// Example search query structure
{
  $text: { $search: "search term" },
  createdBy: userId,  // Security filter
  createdAt: { $gte: startDate, $lte: endDate }  // Optional date filter
}
```

## Performance Considerations

### Indexing Strategy
1. **User Collection**:
   - `githubId` (unique) - OAuth lookups
   - `username` - Display/search purposes

2. **Tool Collection**:
   - `createdBy` - User-specific queries
   - Text index on `name, description` - Search functionality
   - Compound index on `createdBy, createdAt` - Paginated user queries

### Optimization Targets
- User profile lookup: <50ms
- Tool CRUD operations: <100ms  
- Tool search queries: <200ms
- Support 100 concurrent users with <500ms total response time

## Data Model Complete
This data model supports all functional requirements:
- ✅ User authentication and profile management
- ✅ Tool CRUD operations with proper ownership
- ✅ Search functionality on tool content
- ✅ Performance targets with appropriate indexing
- ✅ Data integrity and validation at all levels