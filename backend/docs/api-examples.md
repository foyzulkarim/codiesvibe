# API Response Examples

This document provides comprehensive examples of API responses for all enhanced endpoints in the AI Tools API.

## Tool Creation Response

### Successful Tool Creation (201 Created)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for natural conversations",
  "longDescription": "ChatGPT is an advanced language model developed by OpenAI that can engage in natural language conversations, answer questions, help with writing, coding, and many other tasks. It uses sophisticated neural networks to understand context and provide helpful, accurate responses.",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile"],
  "functionality": ["Text Generation", "Translation", "Code Generation", "Question Answering"],
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
    "codeExecution": false,
    "realTimeResponses": true,
    "customTraining": false
  },
  "searchKeywords": ["chatbot", "AI", "conversation", "GPT", "OpenAI", "language model"],
  "tags": {
    "primary": ["AI", "Chatbot"],
    "secondary": ["Productivity", "Communication", "Language", "Writing"]
  },
  "createdAt": "2025-09-12T09:00:00.000Z",
  "updatedAt": "2025-09-12T10:00:00.000Z"
}
```

## Tool Listing Responses

### Basic Tool List (200 OK)
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "ChatGPT",
      "description": "Advanced AI chatbot for natural conversations",
      "longDescription": "ChatGPT is an advanced language model developed by OpenAI...",
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
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "DALL-E 2",
      "description": "AI system that creates realistic images from text descriptions",
      "longDescription": "DALL-E 2 is an AI system that can create realistic images and art from a description in natural language. It can combine concepts, attributes, and styles to generate original, realistic images and art from a text description.",
      "pricing": ["Paid", "API"],
      "interface": ["Web", "API"],
      "functionality": ["Image Generation", "Art Creation"],
      "deployment": ["Cloud"],
      "popularity": 87000,
      "rating": 4.3,
      "reviewCount": 1800,
      "lastUpdated": "2025-09-11T15:30:00.000Z",
      "logoUrl": "https://example.com/dalle2-logo.png",
      "features": {
        "apiAccess": true,
        "freeTier": false,
        "multiLanguage": true,
        "highResolution": true,
        "styleTransfer": true
      },
      "searchKeywords": ["image generation", "AI", "art", "DALL-E", "OpenAI", "creative"],
      "tags": {
        "primary": ["AI", "Creative"],
        "secondary": ["Art", "Design", "Image Generation", "Visual"]
      },
      "createdAt": "2025-09-10T14:20:00.000Z",
      "updatedAt": "2025-09-11T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### Filtered Tool List (200 OK)
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "ChatGPT",
      "description": "Advanced AI chatbot for natural conversations",
      "pricing": ["Free", "Paid", "API"],
      "interface": ["Web", "API", "Mobile"],
      "functionality": ["Text Generation", "Translation", "Code Generation"],
      "deployment": ["Cloud"],
      "popularity": 95000,
      "rating": 4.5,
      "reviewCount": 2500,
      "tags": {
        "primary": ["AI", "Chatbot"],
        "secondary": ["Productivity", "Communication"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "filters": {
    "functionality": ["Text Generation"],
    "minRating": 4.0,
    "tags": ["AI"]
  }
}
```

### Search Results (200 OK)
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "ChatGPT",
      "description": "Advanced AI chatbot for natural conversations",
      "functionality": ["Text Generation", "Translation", "Code Generation"],
      "rating": 4.5,
      "popularity": 95000,
      "tags": {
        "primary": ["AI", "Chatbot"],
        "secondary": ["Productivity", "Communication"]
      },
      "searchScore": 2.5
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "Claude",
      "description": "Helpful AI assistant for conversations and analysis",
      "functionality": ["Text Generation", "Analysis", "Code Generation"],
      "rating": 4.4,
      "popularity": 78000,
      "tags": {
        "primary": ["AI", "Assistant"],
        "secondary": ["Analysis", "Writing"]
      },
      "searchScore": 2.1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  },
  "searchQuery": "AI chatbot",
  "searchFields": ["name", "description", "searchKeywords"]
}
```

### Empty Results (200 OK)
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0
  },
  "filters": {
    "functionality": ["Nonexistent Functionality"],
    "minRating": 5.0
  }
}
```

## Single Tool Responses

### Tool Details (200 OK)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for natural conversations",
  "longDescription": "ChatGPT is an advanced language model developed by OpenAI that can engage in natural language conversations, answer questions, help with writing, coding, and many other tasks. It combines state-of-the-art natural language processing with a user-friendly interface.",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile", "Desktop"],
  "functionality": ["Text Generation", "Translation", "Code Generation", "Question Answering", "Creative Writing"],
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
    "codeExecution": false,
    "realTimeResponses": true,
    "customTraining": false,
    "contextMemory": true,
    "fileUploads": true
  },
  "searchKeywords": [
    "chatbot", 
    "AI", 
    "conversation", 
    "GPT", 
    "OpenAI", 
    "language model",
    "natural language processing",
    "assistant",
    "writing",
    "coding"
  ],
  "tags": {
    "primary": ["AI", "Chatbot"],
    "secondary": ["Productivity", "Communication", "Language", "Writing", "Development"]
  },
  "createdAt": "2025-09-12T09:00:00.000Z",
  "updatedAt": "2025-09-12T10:00:00.000Z"
}
```

## Tool Update Responses

### Successful Update (200 OK)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for natural conversations",
  "longDescription": "ChatGPT is an advanced language model developed by OpenAI...",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile"],
  "functionality": ["Text Generation", "Translation", "Code Generation"],
  "deployment": ["Cloud"],
  "popularity": 98000,
  "rating": 4.7,
  "reviewCount": 2600,
  "lastUpdated": "2025-09-12T11:30:00.000Z",
  "logoUrl": "https://example.com/chatgpt-logo.png",
  "features": {
    "apiAccess": true,
    "freeTier": true,
    "multiLanguage": true,
    "codeExecution": true,
    "realTimeResponses": true
  },
  "searchKeywords": ["chatbot", "AI", "conversation", "GPT", "OpenAI"],
  "tags": {
    "primary": ["AI", "Chatbot"],
    "secondary": ["Productivity", "Communication", "Language"]
  },
  "createdAt": "2025-09-12T09:00:00.000Z",
  "updatedAt": "2025-09-12T11:30:00.000Z"
}
```

### Partial Update (200 OK)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "ChatGPT",
  "description": "Advanced AI chatbot for natural conversations",
  "longDescription": "ChatGPT is an advanced language model developed by OpenAI...",
  "pricing": ["Free", "Paid", "API"],
  "interface": ["Web", "API", "Mobile"],
  "functionality": ["Text Generation", "Translation", "Code Generation"],
  "deployment": ["Cloud"],
  "popularity": 95000,
  "rating": 4.6,
  "reviewCount": 2520,
  "lastUpdated": "2025-09-12T12:00:00.000Z",
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
  "updatedAt": "2025-09-12T12:00:00.000Z"
}
```

## Tool Deletion Response

### Successful Deletion (200 OK)
```json
{
  "message": "Tool successfully deleted",
  "id": "507f1f77bcf86cd799439011",
  "deletedAt": "2025-09-12T13:00:00.000Z"
}
```

## Error Responses

### Validation Error (400 Bad Request)
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": [
    "Name cannot be empty",
    "Pricing must contain at least one item",
    "Logo URL must be a valid URL",
    "Search keywords must contain at least one keyword",
    "Primary tags must contain at least one item"
  ],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "name",
      "value": "",
      "constraints": {
        "isNotEmpty": "name should not be empty",
        "length": "name must be longer than or equal to 1 characters"
      }
    },
    {
      "field": "pricing",
      "value": [],
      "constraints": {
        "arrayNotEmpty": "pricing should not be empty"
      }
    },
    {
      "field": "logoUrl",
      "value": "invalid-url",
      "constraints": {
        "isUrl": "logoUrl must be a valid URL"
      }
    },
    {
      "field": "searchKeywords",
      "value": [],
      "constraints": {
        "arrayNotEmpty": "searchKeywords should not be empty",
        "isValidSearchKeywords": "searchKeywords must be a non-empty array of strings with max 256 characters each"
      }
    },
    {
      "field": "tags",
      "value": {
        "primary": [],
        "secondary": ["test"]
      },
      "constraints": {
        "isTagsStructure": "tags must be an object with primary (non-empty string array) and secondary (string array) properties"
      }
    }
  ]
}
```

### Complex Validation Error (400 Bad Request)
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": [
    "Rating exceeds the maximum allowed value",
    "Review Count is below the minimum allowed value",
    "Features must contain only true/false values"
  ],
  "timestamp": "2025-09-12T10:35:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "rating",
      "value": 6.5,
      "constraints": {
        "max": "rating must not be greater than 5",
        "isValidBusinessRange": "rating must be a number between 0 and 5"
      }
    },
    {
      "field": "reviewCount",
      "value": -10,
      "constraints": {
        "min": "reviewCount must not be less than 0",
        "isValidBusinessRange": "reviewCount must be an integer between 0 and 1,000,000"
      }
    },
    {
      "field": "features",
      "value": {
        "apiAccess": true,
        "freeTier": "maybe",
        "multiLanguage": 42
      },
      "constraints": {
        "isFeaturesObject": "features must be an object with boolean values only"
      }
    }
  ]
}
```

### Authentication Error (401 Unauthorized)
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Unauthorized access",
  "timestamp": "2025-09-12T10:40:00.000Z",
  "path": "/api/tools"
}
```

### Forbidden Error (403 Forbidden)
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Access forbidden - insufficient permissions",
  "timestamp": "2025-09-12T10:45:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439011"
}
```

### Not Found Error (404 Not Found)
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Tool with ID '507f1f77bcf86cd799439999' not found",
  "timestamp": "2025-09-12T10:50:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439999"
}
```

### Rate Limit Error (429 Too Many Requests)
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "timestamp": "2025-09-12T10:55:00.000Z",
  "path": "/api/tools",
  "retryAfter": "60s"
}
```

### Internal Server Error (500 Internal Server Error)
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An internal server error occurred",
  "timestamp": "2025-09-12T11:00:00.000Z",
  "path": "/api/tools"
}
```

## Advanced Query Examples

### Complex Filter Response (200 OK)
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "ChatGPT",
      "description": "Advanced AI chatbot for natural conversations",
      "functionality": ["Text Generation", "Code Generation"],
      "rating": 4.5,
      "popularity": 95000,
      "pricing": ["Free", "Paid"],
      "tags": {
        "primary": ["AI", "Chatbot"],
        "secondary": ["Productivity"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  },
  "appliedFilters": {
    "search": "AI",
    "functionality": ["Text Generation", "Code Generation"],
    "minRating": 4.0,
    "maxRating": 5.0,
    "tags": ["AI", "Productivity"],
    "sortBy": "popularity",
    "sortOrder": "desc"
  },
  "searchQuery": "AI",
  "searchFields": ["name", "description", "searchKeywords"]
}
```

### Performance Metrics Response
```json
{
  "data": [...],
  "pagination": {...},
  "meta": {
    "queryTime": 45,
    "totalResults": 150,
    "indexesUsed": ["text_search", "rating_1", "popularity_-1"],
    "cacheHit": false
  }
}
```

## Response Headers

All successful responses include these standard headers:
```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1694520000
X-Response-Time: 45ms
```

Error responses include additional debugging headers:
```
X-Request-ID: req-123456789
X-Error-Code: VALIDATION_FAILED
```