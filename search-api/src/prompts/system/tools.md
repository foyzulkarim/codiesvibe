# Available Tools Documentation

## Core Filtering Tools

### filterByField
**Purpose**: Filter dataset by specific field values with various operators
**Parameters**:
- `field` (string): Field name to filter on
- `value` (any): Value to filter by
- `operator` (string): Comparison operator (eq, ne, gt, gte, lt, lte, contains, in, etc.)
- `caseSensitive` (boolean): Case sensitivity for string comparisons

**Use Cases**:
- Find tools with specific pricing (price < 100)
- Filter by status (status = 'active')
- Date range filtering (createdAt >= '2023-01-01')

### filterByArrayContains
**Purpose**: Filter based on array field contents
**Parameters**:
- `field` (string): Array field name
- `value` (any): Value to search for
- `matchType` (string): 'any', 'all', or 'exact'
- `caseSensitive` (boolean): Case sensitivity

**Use Cases**:
- Tools with specific categories (categories contains 'ai')
- Multiple tag matching (tags contains 'free' AND 'api')

### filterByNestedField
**Purpose**: Filter on nested object properties
**Parameters**:
- `path` (string): Dot-separated path to nested field
- `operator` (string): Comparison operator
- `value` (any): Value to compare
- `nullHandling` (string): How to handle null/undefined values

**Use Cases**:
- Price tier filtering (pricingSummary.lowestMonthly < 50)
- Feature availability (capabilities.technical.apiAccess = true)

### filterByArrayIntersection
**Purpose**: Find items where arrays intersect with provided values
**Parameters**:
- `field` (string): Array field name
- `values` (array): Values to intersect with
- `minIntersectionSize` (number): Minimum number of matches required

**Use Cases**:
- Multi-category tools (categories intersects with ['ai', 'automation'])
- Capability matching (capabilities.core intersects with search terms)

### filterByPriceRange
**Purpose**: Specialized price range filtering with currency support
**Parameters**:
- `field` (string): Price field name
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `currency` (string): Currency code

**Use Cases**:
- Budget constraints (10 <= price <= 100)
- Free tier discovery (hasFreeTier = true)

### filterByDateRange
**Purpose**: Date range filtering with flexible format support
**Parameters**:
- `field` (string): Date field name
- `startDate` (string/date): Start date
- `endDate` (string/date): End date
- `dateFormat` (string): Date format (iso, unix, us, eu, auto)
- `timezone` (string): Timezone for date parsing

**Use Cases**:
- Recent tools (lastUpdated >= '2024-01-01')
- New discoveries (dateAdded within last 30 days)

### filterByExists
**Purpose**: Check field existence and null/undefined values
**Parameters**:
- `field` (string): Field name to check
- `exists` (boolean): Whether field should exist
- `checkNull` (boolean): Whether to treat null as non-existent
- `checkUndefined` (boolean): Whether to treat undefined as non-existent

**Use Cases**:
- Complete records (documentation exists)
- Tools with pricing (pricingSummary exists)

## Sorting Tools

### sortByField
**Purpose**: Sort by field values with handling of nulls and types
**Parameters**:
- `field` (string): Field to sort by
- `order` (string): 'asc' or 'desc'
- `nullsFirst` (boolean): Where to place null values
- `numeric` (boolean): Force numeric comparison

**Use Cases**:
- Most popular tools (sortBy popularity desc)
- Alphabetical listing (sortBy name asc)

### sortByNestedField
**Purpose**: Sort by nested object properties
**Parameters**:
- `path` (string): Dot-separated path to nested field
- `order` (string): 'asc' or 'desc'
- `nullsFirst` (boolean): Where to place null values
- `undefinedAsNull` (boolean): Treat undefined as null

**Use Cases**:
- Cheapest first (sortBy pricingSummary.lowestMonthly asc)
- Latest tools (sortBy lastUpdated desc)

### sortByMultipleFields
**Purpose**: Multi-level sorting with priority ordering
**Parameters**:
- `fields` (array): Array of sort specifications
- `tieBreaker` (string): How to handle equal items

**Use Cases**:
- Popularity then price (popularity desc, price asc)
- Rating then recency (rating desc, lastUpdated desc)

## Search and Match Tools

### searchByText
**Purpose**: Full-text search across multiple fields with relevance scoring
**Parameters**:
- `query` (string): Search query
- `fields` (array): Fields to search in
- `mode` (string): 'any' or 'all' term matching
- `fuzzy` (boolean): Enable fuzzy matching
- `includeRelevanceScore` (boolean): Include relevance scores

**Use Cases**:
- Keyword search (query contains 'machine learning')
- Concept matching (query matches 'productivity automation')

### searchByKeywords
**Purpose**: Keyword-based search with fuzzy matching
**Parameters**:
- `query` (string): Keywords to search for
- `fuzzyMatch` (boolean): Enable fuzzy matching
- `threshold` (number): Similarity threshold for fuzzy matching

**Use Cases**:
- Tag-based discovery (keywords: 'api', 'automation')
- Concept search with tolerance (keywords: 'machine lerning')

### findById
**Purpose**: Find exact tool by ID
**Parameters**:
- `id` (string): Tool ID to find
- `field` (string): ID field name (default: 'id')

**Use Cases**:
- Specific tool lookup
- Reference-based searches

### findBySlug
**Purpose**: Find tool by slug with fuzzy matching
**Parameters**:
- `slug` (string): Tool slug
- `field` (string): Slug field name (default: 'slug')
- `fuzzy` (boolean): Enable fuzzy matching

**Use Cases**:
- URL-based tool discovery
- Human-friendly identifiers

## Aggregation Tools

### groupBy
**Purpose**: Group items by field values
**Parameters**:
- `field` (string): Field to group by
- `includeCount` (boolean): Include count in results
- `sortBy` (string): 'key' or 'count'
- `sortOrder` (string): 'asc' or 'desc'

**Use Cases**:
- Category breakdown (groupBy categories.primary)
- Pricing analysis (groupBy pricingSummary.pricingModel)

### countBy
**Purpose**: Count occurrences of field values
**Parameters**:
- `field` (string): Field to count
- `sortBy` (string): 'key' or 'count'
- `sortOrder` (string): 'asc' or 'desc'

**Use Cases**:
- Category frequency analysis
- Feature availability statistics

### getUnique
**Purpose**: Get unique values from field
**Parameters**:
- `field` (string): Field to extract unique values from
- `includeNulls` (boolean): Include null values
- `sortBy` (string): 'value' or 'count'
- `sortOrder` (string): 'asc' or 'desc'

**Use Cases**:
- Available categories discovery
- Unique pricing models

### getMinMax
**Purpose**: Get minimum and maximum numeric values
**Parameters**:
- `field` (string): Numeric field to analyze

**Use Cases**:
- Price range analysis
- Rating extremes

### calculateAverage
**Purpose**: Calculate statistical measures for numeric fields
**Parameters**:
- `field` (string): Numeric field to analyze
- `excludeNulls` (boolean): Exclude null values

**Use Cases**:
- Average pricing analysis
- Rating statistics

## Array Operations

### limitResults
**Purpose**: Pagination with offset and limit
**Parameters**:
- `limit` (number): Maximum results to return
- `offset` (number): Number of results to skip

**Use Cases**:
- Result pagination
- Top N results

### skipResults
**Purpose**: Skip specified number of results
**Parameters**:
- `count` (number): Number of results to skip

**Use Cases**:
- Pagination navigation
- Result offsetting

### intersectResults
**Purpose**: Find intersection between datasets
**Parameters**:
- `compareSet` (array): Secondary dataset
- `keyField` (string): Field for comparison

**Use Cases**:
- Cross-filtering
- Overlap analysis

### unionResults
**Purpose**: Combine datasets with duplicate removal
**Parameters**:
- `additionalSet` (array): Additional dataset
- `keyField` (string): Field for duplicate detection
- `removeDuplicates` (boolean): Remove duplicates

**Use Cases**:
- Combining search results
- Merging filtered datasets

### getDifference
**Purpose**: Find items in primary set not in comparison set
**Parameters**:
- `compareSet` (array): Comparison dataset
- `keyField` (string): Field for comparison

**Use Cases**:
- Complement filtering
- Difference analysis

## Utility Tools

### selectFields
**Purpose**: Project specific fields from results
**Parameters**:
- `fields` (array): Fields to include

**Use Cases**:
- Result formatting
- Data minimization

### excludeFields
**Purpose**: Exclude specific fields from results
**Parameters**:
- `fields` (array): Fields to exclude

**Use Cases**:
- Data privacy
- Result cleanup

### utilityTools
**Purpose**: Get schema and current state information
**Parameters**:
- `operation` (string): 'getSchema' or 'getCurrentResults'

**Use Cases**:
- Schema discovery
- Result analysis