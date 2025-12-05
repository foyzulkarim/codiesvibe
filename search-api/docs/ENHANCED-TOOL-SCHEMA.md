# Enhanced Tool Schema v2.0 Documentation

## Overview

The Enhanced Tool Schema v2.0 extends the original tool data model with sophisticated relationship fields that enable advanced search capabilities, context enrichment, and improved user experience. This schema supports the AI Search Enhancement v2.0 initiative by providing rich metadata for multi-vector search and semantic understanding.

## Schema Architecture

### Core Fields (Inherited from v1.0)

The enhanced schema maintains backward compatibility with all existing fields:

- **Identity**: `id`, `name`, `slug`, `description`, `longDescription`, `tagline`
- **Categorization**: `categories`, `industries`, `userTypes`
- **Pricing**: `pricingSummary`, `pricingUrl`
- **Legacy Fields**: `interface`, `functionality`, `deployment`
- **Metrics**: `popularity`, `rating`, `reviewCount`
- **Metadata**: `logoUrl`, `website`, `documentation`, `status`, `contributor`, `dateAdded`, `lastUpdated`

### Enhanced Entity Relationships (v2.0)

#### `toolTypes: string[]` (Required, 1-10 entries)
Defines the classification and type of the tool for enhanced categorization.

**Purpose**: Enables fine-grained tool classification beyond basic categories
**Examples**: `["AI Tool", "SaaS Platform", "API Service", "Development Tool"]`
**Validation**: Required, minimum 1 entry, maximum 10 entries
**Indexing**: Single-field index for efficient querying

#### `domains: string[]` (Required, 1-15 entries)
Specifies the domains and industries where the tool operates.

**Purpose**: Enables domain-specific search and context generation
**Examples**: `["Software Development", "Data Science", "Machine Learning", "Web Development"]`
**Validation**: Required, minimum 1 entry, maximum 15 entries
**Indexing**: Single-field index for efficient querying

#### `capabilities: string[]` (Required, 1-20 entries)
Lists the specific capabilities and features of the tool.

**Purpose**: Enables capability-based matching and search
**Examples**: `["Text Generation", "Code Completion", "Data Analysis", "API Integration"]`
**Validation**: Required, minimum 1 entry, maximum 20 entries
**Indexing**: Single-field index for efficient querying

### Search Optimization Fields (v2.0)

#### `aliases: string[]` (Optional, max 10 entries)
Alternative names and common variations of the tool name.

**Purpose**: Improves search recall by matching common name variations
**Examples**: `["GPT", "Chat AI", "OpenAI Chat"]`
**Validation**: Optional, maximum 10 entries
**Indexing**: Single-field index for search optimization

#### `synonyms: string[]` (Optional, max 15 entries)
Search synonyms and related terms that describe the tool.

**Purpose**: Enables semantic search and improves discoverability
**Examples**: `["AI Assistant", "Conversational AI", "Language Model"]`
**Validation**: Optional, maximum 15 entries
**Indexing**: Single-field index for search optimization

### Context Relationships (v2.0)

#### `similarTo: string[]` (Optional, max 10 entries)
References to tools with similar functionality by tool ID.

**Purpose**: Enables recommendation algorithms and "similar tools" features
**Examples**: `["claude", "bard", "gemini"]`
**Validation**: Optional, maximum 10 entries, must be valid tool IDs
**Indexing**: Single-field index for relationship queries

#### `alternativesFor: string[]` (Optional, max 10 entries)
References to tools for which this tool serves as an alternative.

**Purpose**: Enables alternative tool discovery and migration guidance
**Examples**: `["copilot", "code-assistant"]`
**Validation**: Optional, maximum 10 entries, must be valid tool IDs
**Indexing**: Single-field index for relationship queries

#### `worksWith: string[]` (Optional, max 15 entries)
References to tools and platforms that this tool integrates with.

**Purpose**: Enables ecosystem discovery and compatibility checking
**Examples**: `["github", "vscode", "slack"]`
**Validation**: Optional, maximum 15 entries, must be valid tool IDs
**Indexing**: Single-field index for relationship queries

### Usage Patterns (v2.0)

#### `commonUseCases: string[]` (Required, 1-15 entries)
Describes common use cases and scenarios where the tool is used.

**Purpose**: Enables use case-based search and recommendation
**Examples**: `["Content Creation", "Customer Support", "Code Generation"]`
**Validation**: Required, minimum 1 entry, maximum 15 entries
**Indexing**: Single-field and compound indexes for efficient querying

## Database Schema Implementation

### MongoDB Schema

The enhanced schema is implemented using Mongoose with the following key features:

```typescript
@Schema({ timestamps: true })
export class Tool {
  // Enhanced entity relationships (v2.0)
  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) && v.length >= 1 && v.length <= 10,
      message: 'toolTypes must have 1-10 entries',
    },
  })
  toolTypes!: string[];

  // ... other fields with similar validation patterns
}
```

### Validation Rules

#### Array Field Validation
- **Required fields**: `toolTypes`, `domains`, `capabilities`, `commonUseCases`
- **Optional fields**: `aliases`, `synonyms`, `similarTo`, `alternativesFor`, `worksWith`
- **Size limits**: Varies by field (10-20 entries maximum)
- **Content validation**: Non-empty strings, trimmed whitespace

#### Pre-save Middleware
```typescript
ToolSchema.pre('save', function (next) {
  // Auto-generate slug from id if not provided
  if (!this.slug && this.id) {
    this.slug = this.id;
  }

  // Validate and clean new array fields
  if (this.toolTypes && Array.isArray(this.toolTypes)) {
    this.toolTypes = this.toolTypes
      .filter((t: string) => t && t.trim())
      .map((t: string) => t.trim());
  }

  // ... similar cleaning for other array fields

  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});
```

### Indexing Strategy

#### Primary Indexes
- `id`: Unique index for tool identification
- `slug`: Unique index for URL-friendly identification
- `status`: Index for status-based filtering
- `createdBy`: Index for user-specific queries

#### Enhanced Field Indexes
- `toolTypes`: Single-field index
- `domains`: Single-field index
- `capabilities`: Single-field index
- `aliases`: Single-field index
- `synonyms`: Single-field index
- `similarTo`: Single-field index
- `alternativesFor`: Single-field index
- `worksWith`: Single-field index
- `commonUseCases`: Single-field index

#### Compound Indexes
- `toolTypes + rating`: Optimized for type-based ranking
- `domains + popularity`: Optimized for domain-based discovery
- `capabilities + status`: Optimized for capability filtering
- `status + commonUseCases + popularity`: Optimized for use case discovery

## API Integration

### DTOs (Data Transfer Objects)

#### CreateToolDto
Includes all enhanced fields with comprehensive validation:

```typescript
// Enhanced entity relationships (v2.0)
@ApiProperty({
  description: 'Tool types for classification (1-10 entries)',
  example: ['AI Tool', 'SaaS Platform', 'API Service'],
})
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@IsString({ each: true })
@IsNotEmpty({ each: true })
toolTypes!: string[];
```

#### ToolResponseDto
Enhanced to include all v2.0 fields with proper transformation:

```typescript
static fromDocument(doc: any): ToolResponseDto {
  return {
    // ... existing fields
    toolTypes: doc.toolTypes || [],
    domains: doc.domains || [],
    capabilities: doc.capabilities || [],
    aliases: doc.aliases || [],
    synonyms: doc.synonyms || [],
    similarTo: doc.similarTo || [],
    alternativesFor: doc.alternativesFor || [],
    worksWith: doc.worksWith || [],
    commonUseCases: doc.commonUseCases || [],
  };
}
```

## Search Integration

### Multi-Vector Search Support

The enhanced schema fields are designed to support multi-vector search:

1. **Semantic Vectors**: Generated from `name`, `description`, `longDescription`
2. **Category Vectors**: Generated from `categories`, `toolTypes`, `domains`
3. **Functionality Vectors**: Generated from `capabilities`, `functionality`
4. **Alias Vectors**: Generated from `aliases`, `synonyms`
5. **Composite Vectors**: Generated from combinations of fields

### Context Enrichment

The enhanced fields enable rich context generation:

```typescript
// Entity statistics generation example
const entityStats = {
  toolTypes: await this.getStatistics('toolTypes', extractedEntities),
  domains: await this.getStatistics('domains', extractedEntities),
  capabilities: await this.getStatistics('capabilities', extractedEntities),
  commonUseCases: await this.getStatistics('commonUseCases', extractedEntities),
};
```

## Data Migration

### Seed Data Enhancement

Existing seed data has been enhanced with v2.0 fields:

```json
{
  "id": "cursor-ide",
  "name": "Cursor IDE",
  // ... existing fields
  "toolTypes": ["AI Tool", "Code Editor", "IDE", "Development Platform"],
  "domains": ["Software Development", "AI Programming", "Code Generation"],
  "capabilities": ["Code Completion", "AI Chat", "Debugging"],
  "aliases": ["Cursor Editor", "AI Cursor"],
  "synonyms": ["AI Code Editor", "Intelligent IDE"],
  "similarTo": ["vscode", "copilot"],
  "alternativesFor": ["vscode-copilot"],
  "worksWith": ["github", "gitlab", "docker"],
  "commonUseCases": ["Code Development", "AI-Assisted Programming"]
}
```

### Backward Compatibility

The enhanced schema maintains full backward compatibility:

- Existing tools without v2.0 fields continue to work
- Default values are provided for missing fields
- Legacy APIs continue to function without changes
- Migration is optional and can be performed gradually

## Performance Considerations

### Query Optimization

1. **Selective Indexing**: Indexes are created based on query patterns
2. **Compound Indexes**: Optimized for common query combinations
3. **Array Field Optimization**: Efficient querying of array fields
4. **Memory Usage**: Reasonable limits on array field sizes

### Storage Impact

- **Additional Fields**: ~500 bytes per tool (average)
- **Index Storage**: ~200 bytes per tool (additional indexes)
- **Total Overhead**: ~1KB per tool (including indexes)
- **Scalability**: Linear growth with tool count

## Testing Strategy

### Unit Tests

Comprehensive test coverage for enhanced fields:

```typescript
describe('Enhanced Tool Schema v2.0', () => {
  it('should validate a tool with all new v2.0 fields', async () => {
    // Test validation of all enhanced fields
  });

  it('should fail validation when required v2.0 fields are missing', async () => {
    // Test required field validation
  });

  it('should validate optional v2.0 fields when provided', async () => {
    // Test optional field validation
  });
});
```

### Integration Tests

- **API Integration**: Test CRUD operations with enhanced fields
- **Search Integration**: Test multi-vector search with enhanced data
- **Performance Testing**: Validate query performance with indexes

## Future Enhancements

### Planned Improvements

1. **Relationship Validation**: Referential integrity for tool IDs
2. **Hierarchical Categories**: Support for category hierarchies
3. **Dynamic Validation**: Context-aware validation rules
4. **Analytics Integration**: Usage tracking for enhanced fields

### Extension Points

The schema is designed for future extensions:

- **Custom Fields**: Support for user-defined fields
- **Versioning**: Schema versioning for migration management
- **Plugins**: Extensible validation and processing
- **Internationalization**: Multi-language support for text fields

## Best Practices

### Data Management

1. **Consistent Naming**: Use consistent terminology across fields
2. **Appropriate Granularity**: Balance between detail and usability
3. **Regular Updates**: Keep relationship fields current
4. **Quality Assurance**: Validate tool IDs and relationships

### API Usage

1. **Batch Operations**: Use bulk operations for efficiency
2. **Selective Queries**: Request only needed fields
3. **Caching**: Cache frequently accessed relationship data
4. **Error Handling**: Graceful handling of missing relationships

### Search Optimization

1. **Vector Generation**: Generate vectors from all relevant fields
2. **Query Expansion**: Use aliases and synonyms for better recall
3. **Result Ranking**: Consider relationship strength in ranking
4. **Performance Monitoring**: Track search performance metrics

## Conclusion

The Enhanced Tool Schema v2.0 provides a robust foundation for advanced search capabilities, context enrichment, and improved user experience. The schema maintains backward compatibility while enabling powerful new features for the AI Search Enhancement v2.0 initiative.

The comprehensive validation, indexing, and testing ensure reliable performance and data quality, while the extensible design allows for future enhancements and adaptations to changing requirements.
