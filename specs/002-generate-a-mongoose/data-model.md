# Data Model: Enhanced AI Tool Schema

## Entity: Tool (Enhanced)

### Overview
Enhanced version of the existing Tool entity to match the frontend AITool interface, maintaining user ownership while adding comprehensive metadata fields.

### Fields

#### Core Fields (Existing - Required)
- **id**: string (ObjectId) - Primary identifier
- **name**: string (1-100 chars) - Tool name
- **description**: string (1-500 chars) - Tool description  
- **createdBy**: ObjectId (ref: User) - User who created the tool
- **createdAt**: Date - Creation timestamp
- **updatedAt**: Date - Last update timestamp

#### Extended Fields (New - Optional with defaults)
- **longDescription**: string (0-2000 chars) - Detailed tool description
- **pricing**: string[] - Pricing models (e.g., ["Free", "Paid", "Freemium"])
- **interface**: string[] - Interface types (e.g., ["Web", "API", "Mobile"])
- **functionality**: string[] - Functionality categories (e.g., ["Text Generation", "Translation"])
- **deployment**: string[] - Deployment options (e.g., ["Cloud", "On-premise"])
- **popularity**: number (0-1000000) - Popularity score, default: 0
- **rating**: number (0-5) - User rating, default: 0
- **reviewCount**: number (0-1000000) - Number of reviews, default: 0
- **lastUpdated**: Date - Last metadata update, default: current date
- **logoUrl**: string (URL) - Tool logo image URL
- **features**: Record<string, boolean> - Feature flags (e.g., {"apiAccess": true, "freeTier": false})
- **searchKeywords**: string[] - Search keywords for improved discoverability
- **tags**: { primary: string[], secondary: string[] } - Categorization tags

### Validation Rules

#### String Fields
- **name**: Required, 1-100 characters, trimmed
- **description**: Required, 1-500 characters, trimmed
- **longDescription**: Optional, 0-2000 characters, trimmed
- **logoUrl**: Required, must be valid URL format

#### Array Fields
- **pricing**: Required, non-empty array of strings
- **interface**: Required, non-empty array of strings  
- **functionality**: Required, non-empty array of strings
- **deployment**: Required, non-empty array of strings
- **searchKeywords**: Required, non-empty array of strings, max 256 chars per element

#### Numeric Fields
- **popularity**: Required, 0-1000000, clamped to bounds
- **rating**: Required, 0-5, clamped to bounds
- **reviewCount**: Required, 0-1000000, clamped to bounds

#### Complex Fields
- **features**: Required, object with boolean values, non-boolean values converted
- **tags**: Required, object with primary/secondary arrays, at least one non-empty

### Relationships
- **createdBy**: References User collection (many-to-one)
- No other direct relationships - this is a metadata-rich entity

### State Transitions
- **Create**: Initial creation with user ownership
- **Update**: Any field can be modified by owner or admin
- **Delete**: Soft deletion considered (mark as inactive rather than remove)

### Indexes

#### Primary Indexes
- **_id**: Default MongoDB index
- **createdBy**: For user-specific queries
- **createdAt**: For chronological sorting

#### Search Indexes
- **Text Search**: Compound text index on name, description, searchKeywords
  ```javascript
  { 
    "name": "text", 
    "description": "text", 
    "searchKeywords": "text" 
  }
  ```
- **Tag Indexes**: Separate indexes for primary and secondary tags
  ```javascript
  { "tags.primary": 1 }
  { "tags.secondary": 1 }
  ```

#### Performance Indexes
- **popularity**: -1 (descending for popular tools)
- **rating**: -1 (descending for top-rated tools)
- **functionality**: 1 (for filtering by functionality)
- **deployment**: 1 (for filtering by deployment)

### Default Values
- **popularity**: 0
- **rating**: 0  
- **reviewCount**: 0
- **lastUpdated**: Current date/time
- **features**: {} (empty object)
- **tags**: { primary: [], secondary: [] }

### Data Transformation
- **Numeric Fields**: Clamped to min/max bounds on save
- **Features**: Non-boolean values converted using strict equality
- **Search Keywords**: Truncated to 256 characters per element
- **URLs**: Validated and normalized on save

### Migration Strategy
1. **Schema Update**: Add new fields as optional with default values
2. **Data Migration**: Existing records populated with defaults
3. **Index Creation**: Create new indexes in background
4. **API Enhancement**: Update endpoints to handle new fields
5. **Validation**: Enforce new validation rules for new/updated records

### Example Document
```javascript
{
  "_id": ObjectId("..."),
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for conversations",
  "longDescription": "ChatGPT is an advanced language model...",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile"],
  "functionality": ["Text Generation", "Translation", "Code Generation"],
  "deployment": ["Cloud"],
  "popularity": 95000,
  "rating": 4.5,
  "reviewCount": 2500,
  "lastUpdated": ISODate("2025-09-12T10:00:00Z"),
  "logoUrl": "https://example.com/chatgpt-logo.png",
  "features": {
    "apiAccess": true,
    "freeTier": true,
    "multiLanguage": true,
    "codeExecution": false
  },
  "searchKeywords": ["chatbot", "AI", "conversation", "GPT", "OpenAI"],
  "tags": {
    "primary": ["AI", "Chatbot"],
    "secondary": ["Productivity", "Communication", "Language"]
  },
  "createdBy": ObjectId("user_id"),
  "createdAt": ISODate("2025-09-12T09:00:00Z"),
  "updatedAt": ISODate("2025-09-12T10:00:00Z")
}
```