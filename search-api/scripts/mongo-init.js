// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the AI tools database
db = db.getSiblingDB('ai_tools');

// Create a user for the application
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'ai_tools'
    }
  ]
});

// Create the tools collection with validation rules
db.createCollection('tools', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug', 'description', 'categories', 'status', 'createdBy'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Tool name'
        },
        slug: {
          bsonType: 'string',
          description: 'URL-friendly identifier'
        },
        description: {
          bsonType: 'string',
          description: 'Tool description'
        },
        categories: {
          bsonType: 'object',
          required: ['primary'],
          properties: {
            primary: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            },
            secondary: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            }
          }
        },
        status: {
          bsonType: 'string',
          enum: ['active', 'inactive', 'deprecated', 'beta'],
          description: 'Tool status'
        },
        createdBy: {
          bsonType: 'string',
          description: 'Creator of the tool'
        },
        pricingSummary: {
          bsonType: 'object',
          properties: {
            lowestMonthlyPrice: {
              bsonType: 'number',
              minimum: 0
            },
            highestMonthlyPrice: {
              bsonType: 'number',
              minimum: 0
            },
            currency: {
              bsonType: 'string'
            },
            hasFreeTier: {
              bsonType: 'bool'
            }
          }
        }
      }
    }
  }
});

// Create indexes for better performance
db.tools.createIndex({ slug: 1 }, { unique: true });
db.tools.createIndex({ name: 'text', description: 'text', searchKeywords: 'text', tags: 'text' });
db.tools.createIndex({ 'categories.primary': 1 });
db.tools.createIndex({ 'pricingSummary.hasFreeTier': 1 });
db.tools.createIndex({ 'pricingSummary.lowestMonthlyPrice': 1 });
db.tools.createIndex({ status: 1 });
db.tools.createIndex({ popularity: -1 });
db.tools.createIndex({ rating: -1 });

// Create a simple test document to verify the collection works
db.tools.insertOne({
  name: 'Test Tool',
  slug: 'test-tool',
  description: 'A test tool to verify MongoDB setup',
  categories: {
    primary: ['testing'],
    secondary: ['development']
  },
  status: 'active',
  createdBy: 'system',
  pricingSummary: {
    lowestMonthlyPrice: 0,
    highestMonthlyPrice: 0,
    currency: 'USD',
    hasFreeTier: true,
    hasCustomPricing: false,
    billingPeriods: ['monthly'],
    pricingModel: ['free']
  },
  searchKeywords: ['test', 'sample', 'demo'],
  tags: ['testing', 'sample'],
  popularity: 100,
  rating: 5.0,
  reviewCount: 1,
  status: 'active',
  contributor: 'system',
  dateAdded: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
});

print('MongoDB initialization completed successfully');
print('Created database: ai_tools');
print('Created collection: tools with indexes');
print('Created user: app_user with readWrite permissions');