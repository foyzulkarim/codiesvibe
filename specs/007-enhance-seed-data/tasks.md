# Tools Data Structure v2.0 Implementation Tasks

## Overview

This document provides a detailed breakdown of all tasks required to implement the enhanced tools-v2.0 data structure. Tasks focus on comprehensive schema transformation from v1.x to v2.0 while maintaining existing functionalities.

## Field Mapping Strategy

### Current v1.x → New v2.0 Mapping
- `tags.primary/secondary` → `categories.primary/secondary` + add `categories.industries/userTypes`
- `features` (Record<string, boolean>) → `capabilities.aiFeatures/technical/integrations`
- `searchKeywords` → expand with `semanticTags` and `aliases`
- `pricing` (string[]) → `pricingSummary` + `pricingDetails` structure
- Add: `tagline`, `pricingUrl`, `status`, `contributor`, `dateAdded`

## Task Organization

### Phase 1: Backend Schema Updates

#### 1.1 Shared Types Interface Updates
**Task ID**: T1.1
**Description**: Update shared TypeScript interfaces to reflect v2.0 schema changes
**Action Items**:
- Transform `ToolTags` to comprehensive `Categories` structure with industries/userTypes
- Add `tagline`, `pricingUrl`, `semanticTags`, `aliases` fields
- Replace simple `features` with structured `Capabilities` interface
- Add comprehensive `PricingSummary` and enhanced `PricingDetails`
- Add `status`, `contributor`, `dateAdded` metadata fields
**Files to Update**:
- `backend/shared/types/tool.types.ts`

---

#### 1.2 Mongoose Schema Updates
**Task ID**: T1.2
**Description**: Update database schema to match v2.0 structure with comprehensive validation
**Action Items**:
- Replace `tags` with `categories` structure (primary, secondary, industries, userTypes)
- Add `tagline` (optional, max 100 chars), `pricingUrl` (optional URL)
- Add `semanticTags` and `aliases` arrays with text indexing
- Transform `features` to nested `capabilities` object with aiFeatures/technical/integrations
- Add comprehensive `pricingSummary` with validation rules
- Update text search indexes to include new fields
- Add `status` enum validation, `contributor` and `dateAdded` timestamp fields
**Files to Update**:
- `backend/src/tools/schemas/tool.schema.ts`

---

#### 1.3 DTO Validation Updates
**Task ID**: T1.3
**Description**: Update class-validator DTOs for v2.0 structure
**Action Items**:
- Update CreateToolDto with new `categories` structure validation
- Add validation decorators for `tagline`, `semanticTags`, `aliases`
- Add `capabilities` nested validation with proper structure
- Add `pricingSummary` validation with business rules
- Update UpdateToolDto to handle partial updates of new structure
**Files to Update**:
- `backend/src/tools/dto/create-tool.dto.ts`
- `backend/src/tools/dto/update-tool.dto.ts`

---

#### 1.4 Service Layer Field Mapping
**Task ID**: T1.4
**Description**: Update service methods to handle v2.0 field transformations
**Action Items**:
- Implement field mapping logic for v1.x to v2.0 data transformation
- Update search methods to utilize `semanticTags` and `aliases`
- Ensure proper response transformation for new field structure
- Maintain backward compatibility during transition
**Files to Update**:
- `backend/src/tools/tools.service.ts`

---

### Phase 2: Data Seeding

#### 2.1 Transform tools-sample.json
**Task ID**: T2.1
**Description**: Transform tools-sample.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-sample.json`

---

#### 2.2 Transform tools-v1.0.json
**Task ID**: T2.2
**Description**: Transform tools-v1.0.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-v1.0.json`

---

#### 2.3 Transform tools-v1.1.json
**Task ID**: T2.3
**Description**: Transform tools-v1.1.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-v1.1.json`

---

#### 2.4 Transform tools-v1.2.json
**Task ID**: T2.4
**Description**: Transform tools-v1.2.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-v1.2.json`

---

#### 2.5 Transform tools-v1.3.json
**Task ID**: T2.5
**Description**: Transform tools-v1.3.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-v1.3.json`

---

#### 2.6 Transform tools-v1.4.json
**Task ID**: T2.6
**Description**: Transform tools-v1.4.json to v2.0 structure
**Field Transformations**: Apply v2.0 schema transformation (see common transformations below)
**Files to Update**: `backend/src/database/seeds/tools-v1.4.json`

---

### Common v2.0 Transformation Rules (for all seed files)

**Field transformations to apply to each tool entry:**
- **Keep existing**: `id`, `name`, `description`, `longDescription`, `pricing[]`, `interface[]`, `functionality[]`, `deployment[]`, `popularity`, `rating`, `reviewCount`, `logoUrl`, `searchKeywords[]`
- **Add missing identity fields**:
  - `slug`: Generate from `id` (same value since IDs are already URL-friendly)
  - `tagline`: Create meaningful 1-line descriptions (best guess based on tool)
- **Transform categories**: `tags.primary/secondary` → `categories.primary/secondary` + add:
  - `categories.industries[]`: Infer from tool functionality (e.g., "Technology", "Healthcare", "Education")
  - `categories.userTypes[]`: Infer from tool purpose (e.g., "Developers", "Content Creators", "Students")
- **Transform capabilities**: `features{}` → `capabilities{}` structure:
  - `capabilities.core[]`: Extract key functionalities as array
  - `capabilities.aiFeatures{}`: Map relevant features to boolean properties
  - `capabilities.technical{}`: Map technical features to boolean properties
  - `capabilities.integrations{}`: Create arrays for platforms/thirdParty/protocols
- **Transform pricing**: `pricing[]` → comprehensive pricing structure:
  - `pricingSummary{}`: Create summary with price ranges, free tier detection, etc.
  - `pricingDetails[]`: Create detailed tier objects with features/limitations
  - `pricingUrl`: Add best-guess URL (e.g., "https://toolname.com/pricing")
- **Transform use cases**: `useCases[]` string → structured object array:
  - Each use case gets: `name`, `description`, `industries[]`, `userTypes[]`, `scenarios[]`, `complexity`
- **Add search optimization**:
  - `semanticTags[]`: Add technical/domain tags (e.g., "machine learning", "api integration")
  - `aliases[]`: Add common alternative names/variations
- **Add metadata fields**:
  - `website`: Add main tool website URL (best guess)
  - `documentation`: Add docs URL if applicable
  - `status`: Set to "active" for all current tools
  - `contributor`: Set to "system" for seed data
  - `dateAdded`: Use current timestamp
  - `lastUpdated`: Keep existing or use current timestamp

**Root-level metadata updates:**
- Update `version` to 2.0
- Update `schema` to "tools-v2.0"
- Update `lastUpdated` timestamp

**Note**: Focus on structural transformation. Use best-guess data for missing fields.

---

### Phase 3: Frontend Integration

#### 3.1 API Types Updates
**Task ID**: T3.1
**Description**: Update frontend API types to match v2.0 structure
**Action Items**:
- Update `ToolResponseDto` to extend new v2.0 BaseTool interface
- Update query parameter types for new filtering capabilities
- Add type definitions for new field structures
**Files to Update**:
- `src/api/types.ts`

---

#### 3.2 Data Layer Updates
**Task ID**: T3.2
**Description**: Update frontend data types and transformations
**Action Items**:
- Update `AITool` interface to match v2.0 structure
- Update mock data to use new field structure for development
- Ensure type compatibility across frontend components
**Files to Update**:
- `src/data/tools.ts`

---

#### 3.3 API Client Transformations
**Task ID**: T3.3
**Description**: Update API client to handle v2.0 data structure
**Action Items**:
- Update `transformToolResponse` function for new field mapping
- Ensure proper handling of new nested structures
- Update hook return types to match new structure
**Files to Update**:
- `src/hooks/api/useTools.ts`
- `src/hooks/api/useTool.ts`

---

#### 3.4 Component Display Updates
**Task ID**: T3.4
**Description**: Update frontend components to display v2.0 fields
**Action Items**:
- Update ToolCard to display `tagline`, new `categories` structure
- Add pricing URL link integration, enhanced capabilities display
- Update filtering UI to utilize new `categories.industries/userTypes`
- Enhance search to use `semanticTags` and `aliases`
**Files to Update**:
- `src/components/ToolCard.tsx`
- `src/components/ToolGrid.tsx`
- Search and filter components

---

### Phase 4: Testing & Validation

#### 4.1 Backend Testing Updates
**Task ID**: T4.1
**Description**: Update backend tests for v2.0 schema validation
**Action Items**:
- Update unit tests for new schema validation rules
- Add tests for field mapping and transformation logic
- Ensure API endpoints properly handle new structure
**Files to Update**:
- Backend test files in `backend/test/` and `backend/src/**/*.spec.ts`

---

#### 4.2 Integration Testing
**Task ID**: T4.2
**Description**: End-to-end testing of v2.0 implementation
**Action Items**:
- Test complete data flow from database to frontend display
- Verify search functionality with new fields
- Confirm filtering works with new categories structure
- Validate API responses match expected v2.0 format
**Files to Update**:
- Integration test files

---

## Success Criteria

### Technical Requirements
- ✅ All v2.0 fields properly integrated across backend and frontend
- ✅ Existing functionality preserved during migration
- ✅ Database schema updated with proper indexes for new search fields
- ✅ Comprehensive validation for all new field structures
- ✅ Search enhanced with semanticTags and aliases
- ✅ Frontend displays all new fields appropriately

### Business Requirements
- ✅ Enhanced categorization enables better tool discovery
- ✅ Improved pricing information with direct links
- ✅ Better search capabilities through semantic tags
- ✅ Structured capabilities for filtering and comparison

## Migration Notes

- **No Backward Compatibility Required**: Fresh deployment approach since not live
- **Field Mapping Strategy**: Systematic transformation of v1.x fields to v2.0 structure
- **Validation Strategy**: Comprehensive validation at schema, DTO, and frontend levels
- **Testing Strategy**: Progressive testing from unit → integration → end-to-end
