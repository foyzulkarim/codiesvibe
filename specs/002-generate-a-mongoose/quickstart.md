# Quickstart: Enhanced AI Tools API

## Overview
This quickstart guide demonstrates how to use the enhanced AI Tools API with comprehensive metadata support, filtering, sorting, and search capabilities.

## Prerequisites
- Node.js 18+
- MongoDB running locally or accessible
- Existing NestJS backend with authentication setup

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Database Configuration
Ensure your MongoDB connection is configured in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/ai-tools
```

### 3. Start the Application
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```bash
Authorization: Bearer your-jwt-token
```

## API Usage

### Create a New AI Tool

```bash
curl -X POST http://localhost:3000/api/tools \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChatGPT",
    "description": "Advanced AI chatbot for natural conversations",
    "longDescription": "ChatGPT is an advanced language model capable of engaging in natural language conversations.",
    "pricing": ["Free", "Paid", "API"],
    "interface": ["Web", "API", "Mobile"],
    "functionality": ["Text Generation", "Translation", "Code Generation"],
    "deployment": ["Cloud"],
    "popularity": 95000,
    "rating": 4.5,
    "reviewCount": 2500,
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
    }
  }'
```

### List Tools with Basic Pagination

```bash
curl -X GET "http://localhost:3000/api/tools?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

### Search Tools

```bash
curl -X GET "http://localhost:3000/api/tools?search=chatbot" \
  -H "Authorization: Bearer your-jwt-token"
```

### Filter by Functionality

```bash
curl -X GET "http://localhost:3000/api/tools?functionality=Text%20Generation,Translation" \
  -H "Authorization: Bearer your-jwt-token"
```

### Filter by Tags

```bash
curl -X GET "http://localhost:3000/api/tools?tags=AI,Productivity" \
  -H "Authorization: Bearer your-jwt-token"
```

### Sort by Rating

```bash
curl -X GET "http://localhost:3000/api/tools?sortBy=rating" \
  -H "Authorization: Bearer your-jwt-token"
```

### Filter by Rating Range

```bash
curl -X GET "http://localhost:3000/api/tools?minRating=4&maxRating=5" \
  -H "Authorization: Bearer your-jwt-token"
```

### Get a Specific Tool

```bash
curl -X GET "http://localhost:3000/api/tools/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer your-jwt-token"
```

### Update a Tool

```bash
curl -X PATCH "http://localhost:3000/api/tools/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4.7,
    "reviewCount": 2600,
    "popularity": 98000,
    "features": {
      "apiAccess": true,
      "freeTier": true,
      "multiLanguage": true,
      "codeExecution": true
    }
  }'
```

### Delete a Tool

```bash
curl -X DELETE "http://localhost:3000/api/tools/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer your-jwt-token"
```

## Response Examples

### Success Response (Tool Created)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for natural conversations",
  "longDescription": "ChatGPT is an advanced language model capable of engaging in natural language conversations.",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile"],
  "functionality": ["Text Generation", "Translation", "Code Generation"],
  "deployment": ["Cloud"],
  "popularity": 95000,
  "rating": 4.5,
  "reviewCount": 2500,
  "lastUpdated": "2025-09-12T10:00:00.000Z",
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
  "createdAt": "2025-09-12T09:00:00.000Z",
  "updatedAt": "2025-09-12T10:00:00.000Z"
}
```

### List Response with Pagination
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "ChatGPT",
      "description": "Advanced AI chatbot for natural conversations",
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

## Validation Rules

### Required Fields
- `name`: 1-100 characters
- `description`: 1-500 characters
- `pricing`: Non-empty array of strings
- `interface`: Non-empty array of strings
- `functionality`: Non-empty array of strings
- `deployment`: Non-empty array of strings
- `logoUrl`: Valid URL
- `searchKeywords`: Non-empty array of strings
- `tags`: Object with primary/secondary arrays (at least one non-empty)

### Numeric Constraints
- `popularity`: 0-1,000,000 (clamped)
- `rating`: 0-5 (clamped)
- `reviewCount`: 0-1,000,000 (clamped)

### Array Constraints
- Array fields cannot be empty
- Search keywords truncated to 256 characters
- Tags must have at least one non-empty array (primary or secondary)

## Testing

### Run Tests
```bash
npm test
```

### Run Integration Tests
```bash
npm run test:e2e
```

## Common Issues

### Validation Errors
```json
{
  "message": "Validation failed",
  "error": "Bad Request",
  "statusCode": 400,
  "errors": [
    {
      "property": "name",
      "constraints": {
        "minLength": "name must be longer than or equal to 1 characters"
      }
    }
  ]
}
```

### Authentication Errors
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### Not Found Errors
```json
{
  "message": "Tool not found",
  "statusCode": 404
}
```

## Advanced Features

### Combining Filters
```bash
curl -X GET "http://localhost:3000/api/tools?search=AI&functionality=Text%20Generation&minRating=4&sortBy=popularity" \
  -H "Authorization: Bearer your-jwt-token"
```

### Text Search on Multiple Fields
The search functionality looks through:
- Tool names
- Descriptions
- Search keywords
- Uses MongoDB text search for relevance ranking

### Complex Tag Filtering
```bash
curl -X GET "http://localhost:3000/api/tools?tags=AI,Machine%20Learning" \
  -H "Authorization: Bearer your-jwt-token"
```

This filters tools that have "AI" OR "Machine Learning" in either primary or secondary tags.