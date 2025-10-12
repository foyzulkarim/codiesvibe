# Backend Schema Update Plan: From Nested to Flattened v2.0 Structure

## Problem Analysis
The seed files have been updated to a simplified v2.0 structure with these key changes:
- **Categories**: Flattened from nested object (`{primary, secondary, industries, userTypes}`) to simple string array
- **Industries & UserTypes**: Moved from nested categories to top-level arrays
- **Removed Complex Fields**: `pricingDetails`, `capabilities`, `useCases`, `searchKeywords`, `semanticTags`, `aliases`

## Files to Update

### 1. Type Definitions (`shared/types/tool.types.ts`)
- Update `Categories` interface from nested object to string array
- Remove `Capabilities`, `UseCase`, `PricingTier` interfaces
- Update `BaseTool` and related interfaces to use flattened structure
- Remove references to deleted complex fields

### 2. Mongoose Schema (`src/tools/schemas/tool.schema.ts`)
- Replace nested categories object with simple string array
- Remove complex field schemas (capabilities, useCases, pricingDetails, search optimization fields)
- Update validation rules to match new structure
- Remove indexes for deleted fields
- Update pre-save middleware to remove references to deleted fields

### 3. DTOs (`src/tools/dto/`)
- **create-tool.dto.ts**: Remove nested DTOs, simplify to basic fields
- **update-tool.dto.ts**: Remove complex field updates
- **tool-response.dto.ts**: Match new response structure
- **create-tool-enhanced.dto.ts**: Update or remove if redundant
- **get-tools-query.dto.ts**: Update filter types for new structure

### 4. Service Layer (`src/tools/tools.service.ts`)
- Update search and filter logic to work with flattened categories
- Remove processing logic for deleted complex fields
- Update input sanitization for new field types
- Fix any references to removed capabilities/pricing details

### 5. Controller (`src/tools/tools.controller.ts`)
- Update any validation or processing that references old structure
- Ensure API endpoints work with new simplified schema

### 6. Test Fixtures (`test/fixtures/`)
- Update `validation-fixtures-v2.ts` to match actual new structure
- Remove references to deleted complex fields

### 7. Custom Validators (`src/tools/validators/`)
- Update any validators that reference old nested structures
- Remove validators for deleted fields

## Implementation Strategy
1. Update type definitions first (foundation)
2. Update Mongoose schema to match types
3. Update DTOs to match new schema
4. Update service layer logic
5. Update controllers and validators
6. Update test fixtures
7. Run `npm run typecheck` to verify no build errors

## Expected Outcome
- Backend models match the flattened seed file structure
- No TypeScript compilation errors
- Database can be seeded with new v2.0 structure successfully
- API endpoints work with simplified tool data structure

## Migration Notes

### New Structure Example
```typescript
{
  // Identity fields (unchanged)
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;

  // NEW: Flattened categorization
  categories: string[];        // Simple array instead of nested object
  industries: string[];        // Top-level array
  userTypes: string[];         // Top-level array

  // Pricing (simplified)
  pricingSummary: PricingSummary;  // Kept, but pricingDetails removed
  pricingUrl?: string;

  // REMOVED: capabilities, useCases, pricingDetails
  // REMOVED: searchKeywords, semanticTags, aliases

  // Legacy fields (kept for compatibility)
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity: number;
  rating: number;
  reviewCount: number;

  // Metadata (unchanged)
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: string;
  contributor: string;
  dateAdded: string;
  lastUpdated: string;
}
```

### Field Mapping
- `categories.primary[]` → `categories[]`
- `categories.industries[]` → `industries[]`
- `categories.userTypes[]` → `userTypes[]`
- `pricingDetails[]` → REMOVED
- `capabilities.*` → REMOVED
- `useCases[]` → REMOVED
- `searchKeywords[]` → REMOVED
- `semanticTags[]` → REMOVED
- `aliases[]` → REMOVED