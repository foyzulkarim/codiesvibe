# Error Response Documentation

This document provides comprehensive documentation for all error responses in the Enhanced AI Tools API, including validation errors, authentication errors, and business logic errors.

## Error Response Structure

All error responses follow a consistent structure:

```json
{
  "statusCode": 400,
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

## Validation Errors (400 Bad Request)

### Basic Field Validation Errors

#### Empty Required Field
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Name cannot be empty"],
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
    }
  ]
}
```

#### String Length Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Name is too long"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "name",
      "value": "This is an extremely long tool name that exceeds the maximum allowed length of 100 characters which should trigger validation error",
      "constraints": {
        "length": "name must be shorter than or equal to 100 characters"
      }
    }
  ]
}
```

#### Invalid URL Format
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Logo URL must be a valid URL"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "logoUrl",
      "value": "not-a-valid-url",
      "constraints": {
        "isUrl": "logoUrl must be a valid URL"
      }
    }
  ]
}
```

### Array Field Validation Errors

#### Empty Required Array
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Pricing must contain at least one item"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "pricing",
      "value": [],
      "constraints": {
        "arrayNotEmpty": "pricing should not be empty"
      }
    }
  ]
}
```

#### Invalid Array Element Type
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Pricing must be a list of text values"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "pricing",
      "value": ["Free", 123, null],
      "constraints": {
        "isString": "each value in pricing must be a string"
      }
    }
  ]
}
```

#### Search Keywords Length Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Search keywords must be valid search keywords (max 256 characters each)"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "searchKeywords",
      "value": ["valid", "a".repeat(300)],
      "constraints": {
        "isValidSearchKeywords": "searchKeywords must be a non-empty array of strings with max 256 characters each"
      }
    }
  ]
}
```

### Numeric Field Validation Errors

#### Rating Out of Range
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Rating exceeds the maximum allowed value"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "rating",
      "value": 6.5,
      "constraints": {
        "max": "rating must not be greater than 5",
        "isValidBusinessRange": "rating must be a number between 0 and 5"
      }
    }
  ]
}
```

#### Popularity Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Popularity must be a positive number"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "popularity",
      "value": -1000,
      "constraints": {
        "min": "popularity must not be less than 0",
        "isValidBusinessRange": "popularity must be an integer between 0 and 1,000,000"
      }
    }
  ]
}
```

#### Review Count Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Review Count is below the minimum allowed value"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "reviewCount",
      "value": -50,
      "constraints": {
        "min": "reviewCount must not be less than 0",
        "isValidBusinessRange": "reviewCount must be an integer between 0 and 1,000,000"
      }
    }
  ]
}
```

### Complex Object Validation Errors

#### Features Object Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Features must contain only true/false values"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "features",
      "value": {
        "apiAccess": true,
        "freeTier": "maybe",
        "multiLanguage": 1
      },
      "constraints": {
        "isFeaturesObject": "features must be an object with boolean values only"
      }
    }
  ]
}
```

#### Tags Structure Validation
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Tags must have valid primary and secondary tag categories"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
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

#### Missing Tags Properties
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": ["Tags must have valid primary and secondary tag categories"],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "tags",
      "value": {
        "primary": ["AI"]
      },
      "constraints": {
        "isTagsStructure": "tags must be an object with primary (non-empty string array) and secondary (string array) properties"
      }
    }
  ]
}
```

### Multiple Validation Errors
```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "message": [
    "Name cannot be empty",
    "Pricing must contain at least one item",
    "Logo URL must be a valid URL",
    "Features must contain only true/false values",
    "Tags must have valid primary and secondary tag categories"
  ],
  "timestamp": "2025-09-12T10:30:00.000Z",
  "path": "/api/tools",
  "details": [
    {
      "field": "name",
      "value": "",
      "constraints": {
        "isNotEmpty": "name should not be empty"
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
      "field": "features",
      "value": {
        "apiAccess": "yes"
      },
      "constraints": {
        "isFeaturesObject": "features must be an object with boolean values only"
      }
    },
    {
      "field": "tags",
      "value": {
        "primary": []
      },
      "constraints": {
        "isTagsStructure": "tags must be an object with primary (non-empty string array) and secondary (string array) properties"
      }
    }
  ]
}
```

## Authentication Errors (401 Unauthorized)

### Missing Authorization Header
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Unauthorized access",
  "timestamp": "2025-09-12T10:40:00.000Z",
  "path": "/api/tools"
}
```

### Invalid Token
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2025-09-12T10:40:00.000Z",
  "path": "/api/tools"
}
```

### Malformed Token
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Malformed authorization token",
  "timestamp": "2025-09-12T10:40:00.000Z",
  "path": "/api/tools"
}
```

## Authorization Errors (403 Forbidden)

### Insufficient Permissions
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Access forbidden - insufficient permissions",
  "timestamp": "2025-09-12T10:45:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439011"
}
```

### Resource Access Denied
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not have permission to modify this tool",
  "timestamp": "2025-09-12T10:45:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439011"
}
```

## Not Found Errors (404 Not Found)

### Tool Not Found
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Tool with ID '507f1f77bcf86cd799439999' not found",
  "timestamp": "2025-09-12T10:50:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439999"
}
```

### Endpoint Not Found
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Cannot GET /api/invalid-endpoint",
  "timestamp": "2025-09-12T10:50:00.000Z",
  "path": "/api/invalid-endpoint"
}
```

## Method Not Allowed (405 Method Not Allowed)

### Invalid HTTP Method
```json
{
  "statusCode": 405,
  "error": "Method Not Allowed",
  "message": "DELETE method not allowed for this endpoint",
  "timestamp": "2025-09-12T10:52:00.000Z",
  "path": "/api/health"
}
```

## Conflict Errors (409 Conflict)

### Duplicate Resource
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Tool with this name already exists",
  "timestamp": "2025-09-12T10:53:00.000Z",
  "path": "/api/tools",
  "conflictingField": "name",
  "conflictingValue": "ChatGPT"
}
```

## Unprocessable Entity (422 Unprocessable Entity)

### Business Logic Validation
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Rating cannot be updated without at least one review",
  "timestamp": "2025-09-12T10:54:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439011",
  "businessRule": "RATING_REQUIRES_REVIEWS"
}
```

### Dependency Constraint
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Free tier cannot have API access enabled",
  "timestamp": "2025-09-12T10:54:00.000Z",
  "path": "/api/tools/507f1f77bcf86cd799439011",
  "conflictingFields": ["pricing", "features.apiAccess"]
}
```

## Rate Limiting (429 Too Many Requests)

### Rate Limit Exceeded
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "timestamp": "2025-09-12T10:55:00.000Z",
  "path": "/api/tools",
  "retryAfter": "60s",
  "limit": 100,
  "remaining": 0,
  "resetTime": "2025-09-12T11:00:00.000Z"
}
```

### IP Rate Limit
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many requests from this IP address",
  "timestamp": "2025-09-12T10:55:00.000Z",
  "path": "/api/tools",
  "retryAfter": "300s",
  "rateLimitType": "IP_BASED"
}
```

## Server Errors (5xx)

### Internal Server Error (500)
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An internal server error occurred",
  "timestamp": "2025-09-12T11:00:00.000Z",
  "path": "/api/tools"
}
```

### Database Connection Error (503)
```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Database connection temporarily unavailable",
  "timestamp": "2025-09-12T11:01:00.000Z",
  "path": "/api/tools",
  "retryAfter": "30s"
}
```

### Timeout Error (504)
```json
{
  "statusCode": 504,
  "error": "Gateway Timeout",
  "message": "Request timeout - operation took too long to complete",
  "timestamp": "2025-09-12T11:02:00.000Z",
  "path": "/api/tools",
  "timeoutDuration": "30000ms"
}
```

## Custom Business Errors

### Search Query Too Complex
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Search query is too complex or contains invalid characters",
  "timestamp": "2025-09-12T11:03:00.000Z",
  "path": "/api/tools",
  "queryComplexity": "HIGH",
  "maxAllowedTerms": 10,
  "providedTerms": 15
}
```

### Filter Combination Invalid
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid filter combination: minRating cannot be greater than maxRating",
  "timestamp": "2025-09-12T11:04:00.000Z",
  "path": "/api/tools",
  "invalidFilters": {
    "minRating": 4.5,
    "maxRating": 3.0
  }
}
```

### Performance Limit Exceeded
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Query would return too many results. Please add more filters or reduce the limit.",
  "timestamp": "2025-09-12T11:05:00.000Z",
  "path": "/api/tools",
  "estimatedResults": 50000,
  "maxAllowedResults": 10000,
  "suggestion": "Add filters for functionality, tags, or rating range"
}
```

## Error Response Headers

### Standard Headers
All error responses include these headers:
```
Content-Type: application/json
X-Request-ID: req-123456789
X-Response-Time: 12ms
```

### Rate Limiting Headers
Rate limit errors include additional headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1694520000
Retry-After: 60
```

### Validation Error Headers
Validation errors include debugging headers:
```
X-Validation-Error-Count: 3
X-Validation-Fields: name,pricing,logoUrl
```

## Error Handling Best Practices

### Client Error Handling
1. **Always check the `statusCode`** to determine error type
2. **Use the `message` array** for user-friendly error display
3. **Check `details` array** for field-specific validation errors
4. **Implement retry logic** for 5xx errors and rate limiting
5. **Cache validation rules** to prevent repeated validation errors

### Error Recovery Strategies
1. **400 Validation Errors**: Show field-specific errors to users
2. **401 Unauthorized**: Redirect to authentication
3. **403 Forbidden**: Show permission denied message
4. **404 Not Found**: Show resource not found message
5. **429 Rate Limited**: Implement exponential backoff
6. **5xx Server Errors**: Show generic error message and retry

### Example Error Handling (JavaScript)
```javascript
const handleApiError = (error) => {
  const { statusCode, message, details } = error.response.data;
  
  switch (statusCode) {
    case 400:
      if (details) {
        // Show field-specific validation errors
        return details.map(detail => ({
          field: detail.field,
          message: Object.values(detail.constraints)[0]
        }));
      }
      return { general: message };
    
    case 401:
      // Redirect to login
      window.location.href = '/login';
      break;
    
    case 429:
      const retryAfter = error.response.headers['retry-after'];
      // Wait and retry after specified time
      setTimeout(() => retryRequest(), retryAfter * 1000);
      break;
    
    case 500:
    case 502:
    case 503:
    case 504:
      // Show generic error and retry
      return { general: 'Service temporarily unavailable. Please try again.' };
    
    default:
      return { general: message || 'An unexpected error occurred' };
  }
};
```