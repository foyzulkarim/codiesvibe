# Quickstart Guide: NestJS REST API Backend

## Overview
This guide validates the core user scenarios for the NestJS REST API backend with GitHub OAuth authentication and Tool management.

## Prerequisites
- Node.js (LTS version)
- MongoDB running locally or connection string for remote instance
- GitHub OAuth App configured with callback URL
- API client (curl, Postman, or similar)

## Environment Setup
1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # MONGODB_URI=mongodb://localhost:27017/nestjs-api
   # GITHUB_CLIENT_ID=your_github_client_id
   # GITHUB_CLIENT_SECRET=your_github_client_secret
   # JWT_SECRET=your_jwt_secret
   ```

3. **Start the application**:
   ```bash
   npm run start:dev
   ```

## Core User Scenarios

### Scenario 1: Health Check and API Documentation
**Objective**: Verify API is running and documentation is accessible

```bash
# Check API health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-09-12T10:00:00.000Z",
  "database": "connected"
}

# Access API documentation
open http://localhost:3000/docs
```

**Success Criteria**:
- ✅ Health endpoint returns 200 with status "ok"
- ✅ Database shows "connected" status
- ✅ Swagger documentation loads at /docs
- ✅ All API endpoints documented with schemas

### Scenario 2: GitHub OAuth Authentication
**Objective**: Authenticate user via GitHub and receive JWT token

```bash
# Step 1: Initiate GitHub OAuth (in browser)
open http://localhost:3000/auth/github

# Step 2: Complete OAuth flow (GitHub will redirect to callback)
# This will redirect to: http://localhost:3000/auth/github/callback?code=...

# Step 3: Extract JWT token from response
# Expected response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://github.com/johndoe.png"
  }
}
```

**Success Criteria**:
- ✅ GitHub OAuth redirect works
- ✅ Callback processes authorization code
- ✅ JWT token generated and returned
- ✅ User profile created in database
- ✅ User profile returned in response

### Scenario 3: Protected Route Access
**Objective**: Access user profile with JWT authentication

```bash
# Use JWT token from previous step
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/auth/profile

# Expected response:
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "email": "john@example.com", 
  "displayName": "John Doe",
  "avatarUrl": "https://github.com/johndoe.png"
}
```

**Success Criteria**:
- ✅ Request with valid JWT succeeds
- ✅ Request without JWT returns 401
- ✅ Request with invalid JWT returns 401
- ✅ User profile data matches GitHub OAuth data

### Scenario 4: Tool CRUD Operations
**Objective**: Create, read, update, and delete tools

```bash
# Create a tool
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "My First Tool", "description": "A test tool for validation"}' \
     http://localhost:3000/tools

# Expected response:
{
  "id": "507f1f77bcf86cd799439012",
  "name": "My First Tool",
  "description": "A test tool for validation",
  "createdAt": "2025-09-12T10:15:00.000Z",
  "updatedAt": "2025-09-12T10:15:00.000Z"
}

# List user's tools
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/tools

# Get specific tool
TOOL_ID="507f1f77bcf86cd799439012"
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/tools/$TOOL_ID

# Update tool
curl -X PUT \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "Updated Tool", "description": "Updated description"}' \
     http://localhost:3000/tools/$TOOL_ID

# Delete tool
curl -X DELETE \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/tools/$TOOL_ID
```

**Success Criteria**:
- ✅ Tool creation succeeds with valid data
- ✅ Tool creation fails with invalid data (400)
- ✅ Tool listing returns user's tools only
- ✅ Tool retrieval works for owned tools
- ✅ Tool retrieval fails for non-existent tools (404)
- ✅ Tool update modifies existing tool
- ✅ Tool deletion removes tool from database
- ✅ All operations require authentication

### Scenario 5: Tool Search Functionality
**Objective**: Search tools by name and description

```bash
# Create multiple tools for testing
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"name": "JavaScript Linter", "description": "Tool for linting JavaScript code"}' \
     http://localhost:3000/tools

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"name": "Python Formatter", "description": "Tool for formatting Python code"}' \
     http://localhost:3000/tools

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"name": "Code Review Helper", "description": "Assistant for JavaScript code reviews"}' \
     http://localhost:3000/tools

# Search by name
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/tools?search=JavaScript"

# Search by description
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/tools?search=formatting"

# Test pagination
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/tools?page=1&limit=2"
```

**Success Criteria**:
- ✅ Search finds tools matching name
- ✅ Search finds tools matching description
- ✅ Search is case-insensitive
- ✅ Search returns only user's tools
- ✅ Pagination works correctly
- ✅ Empty search returns all user tools

### Scenario 6: Rate Limiting and Error Handling
**Objective**: Verify rate limiting and proper error responses

```bash
# Test rate limiting (make rapid requests)
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" \
       http://localhost:3000/tools &
done
wait

# Expected: Some requests return 429 (Too Many Requests)

# Test validation errors
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "", "description": ""}' \
     http://localhost:3000/tools

# Expected response:
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "description should not be empty"
  ],
  "error": "Bad Request"
}
```

**Success Criteria**:
- ✅ Rate limiting blocks excessive requests (429)
- ✅ Validation errors return detailed messages (400)
- ✅ Authentication errors return proper status (401)
- ✅ Not found errors return proper status (404)
- ✅ All errors include structured response format

## Performance Validation

### Response Time Testing
```bash
# Test response times with apache bench or similar
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
   http://localhost:3000/tools

# Expected: 95% of requests under 500ms
```

**Success Criteria**:
- ✅ 95% of requests complete under 500ms
- ✅ API handles 100 concurrent users
- ✅ Database queries are optimized
- ✅ No memory leaks during sustained load

## Validation Complete
When all scenarios pass, the API implementation meets all functional requirements:
- ✅ GitHub OAuth authentication working
- ✅ JWT-based session management
- ✅ Full CRUD operations on Tools
- ✅ Search functionality implemented
- ✅ Rate limiting enforced
- ✅ Comprehensive error handling
- ✅ API documentation complete
- ✅ Performance targets met

## Next Steps
After quickstart validation:
1. Run full test suite: `npm test`
2. Run integration tests: `npm run test:e2e`
3. Check test coverage: `npm run test:cov`
4. Deploy to staging environment
5. Conduct security audit