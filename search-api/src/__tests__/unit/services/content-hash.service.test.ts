/**
 * Content Hash Service Unit Tests
 * Tests for per-collection change detection functionality
 */

import {
  ContentHashService,
  contentHashService,
  COLLECTION_FIELDS,
  ALL_SEMANTIC_FIELDS,
  METADATA_ONLY_FIELDS,
} from '../../../services/content-hash.service.js';
import { ITool, SyncCollectionName } from '../../../models/tool.model.js';

describe('ContentHashService', () => {
  let service: ContentHashService;

  // Mock tool data
  const mockTool: Partial<ITool> = {
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool for testing purposes',
    longDescription: 'This is a longer description for the test tool',
    tagline: 'The best test tool',
    functionality: ['AI Chat', 'Code Generation'],
    categories: ['AI', 'Development'],
    industries: ['Technology', 'Software Development'],
    userTypes: ['Developers', 'AI Engineers'],
    deployment: ['Cloud', 'On-Premise'],
    interface: ['Web', 'API'],
    pricingModel: ['Free', 'Paid'],
    status: 'active',
    pricing: [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
    website: 'https://example.com',
    documentation: 'https://docs.example.com',
    logoUrl: 'https://example.com/logo.png',
    contributor: 'user_123',
    dateAdded: new Date(),
  };

  beforeEach(() => {
    service = new ContentHashService();
  });

  describe('COLLECTION_FIELDS constant', () => {
    it('should define fields for all four collections', () => {
      const collections: SyncCollectionName[] = ['tools', 'functionality', 'usecases', 'interface'];

      for (const collection of collections) {
        expect(COLLECTION_FIELDS[collection]).toBeDefined();
        expect(Array.isArray(COLLECTION_FIELDS[collection])).toBe(true);
        expect(COLLECTION_FIELDS[collection].length).toBeGreaterThan(0);
      }
    });

    it('should include expected fields for tools collection', () => {
      expect(COLLECTION_FIELDS.tools).toContain('name');
      expect(COLLECTION_FIELDS.tools).toContain('description');
      expect(COLLECTION_FIELDS.tools).toContain('longDescription');
      expect(COLLECTION_FIELDS.tools).toContain('tagline');
    });

    it('should include expected fields for functionality collection', () => {
      expect(COLLECTION_FIELDS.functionality).toContain('functionality');
      expect(COLLECTION_FIELDS.functionality).toContain('categories');
    });

    it('should include expected fields for usecases collection', () => {
      expect(COLLECTION_FIELDS.usecases).toContain('industries');
      expect(COLLECTION_FIELDS.usecases).toContain('userTypes');
      expect(COLLECTION_FIELDS.usecases).toContain('deployment');
    });

    it('should include expected fields for interface collection', () => {
      expect(COLLECTION_FIELDS.interface).toContain('interface');
      expect(COLLECTION_FIELDS.interface).toContain('pricingModel');
      expect(COLLECTION_FIELDS.interface).toContain('status');
    });
  });

  describe('ALL_SEMANTIC_FIELDS constant', () => {
    it('should contain all fields from all collections', () => {
      const allFields = Object.values(COLLECTION_FIELDS).flat();
      expect(ALL_SEMANTIC_FIELDS).toEqual(allFields);
    });
  });

  describe('METADATA_ONLY_FIELDS constant', () => {
    it('should include non-embedding fields', () => {
      expect(METADATA_ONLY_FIELDS).toContain('pricing');
      expect(METADATA_ONLY_FIELDS).toContain('website');
      expect(METADATA_ONLY_FIELDS).toContain('documentation');
      expect(METADATA_ONLY_FIELDS).toContain('logoUrl');
      expect(METADATA_ONLY_FIELDS).toContain('contributor');
    });

    it('should not include semantic fields', () => {
      for (const field of ALL_SEMANTIC_FIELDS) {
        expect(METADATA_ONLY_FIELDS).not.toContain(field);
      }
    });
  });

  describe('generateCollectionHash', () => {
    it('should generate a 16-character hex hash', () => {
      const hash = service.generateCollectionHash(mockTool, 'tools');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should generate consistent hashes for same data', () => {
      const hash1 = service.generateCollectionHash(mockTool, 'tools');
      const hash2 = service.generateCollectionHash(mockTool, 'tools');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different collections', () => {
      const toolsHash = service.generateCollectionHash(mockTool, 'tools');
      const functionalityHash = service.generateCollectionHash(mockTool, 'functionality');

      expect(toolsHash).not.toBe(functionalityHash);
    });

    it('should generate different hashes when relevant field changes', () => {
      const hash1 = service.generateCollectionHash(mockTool, 'tools');

      const modifiedTool = { ...mockTool, name: 'Modified Tool Name' };
      const hash2 = service.generateCollectionHash(modifiedTool, 'tools');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash when non-relevant field changes', () => {
      const hash1 = service.generateCollectionHash(mockTool, 'tools');

      // 'functionality' doesn't affect 'tools' collection hash
      const modifiedTool = { ...mockTool, functionality: ['Different', 'Values'] };
      const hash2 = service.generateCollectionHash(modifiedTool, 'tools');

      expect(hash1).toBe(hash2);
    });

    it('should be order-independent for arrays', () => {
      const tool1 = { ...mockTool, functionality: ['AI Chat', 'Code Generation'] };
      const tool2 = { ...mockTool, functionality: ['Code Generation', 'AI Chat'] };

      const hash1 = service.generateCollectionHash(tool1, 'functionality');
      const hash2 = service.generateCollectionHash(tool2, 'functionality');

      expect(hash1).toBe(hash2);
    });

    it('should be case-insensitive for strings', () => {
      const tool1 = { ...mockTool, name: 'Test Tool' };
      const tool2 = { ...mockTool, name: 'test tool' };

      const hash1 = service.generateCollectionHash(tool1, 'tools');
      const hash2 = service.generateCollectionHash(tool2, 'tools');

      expect(hash1).toBe(hash2);
    });

    it('should handle null/undefined values consistently', () => {
      const toolWithNull = { ...mockTool, longDescription: null as unknown as string };
      const toolWithUndefined = { ...mockTool, longDescription: undefined };

      const hash1 = service.generateCollectionHash(toolWithNull, 'tools');
      const hash2 = service.generateCollectionHash(toolWithUndefined, 'tools');

      expect(hash1).toBe(hash2);
    });
  });

  describe('generateAllHashes', () => {
    it('should return hashes for all four collections', () => {
      const hashes = service.generateAllHashes(mockTool);

      expect(hashes).toBeDefined();
      expect(hashes.tools).toBeDefined();
      expect(hashes.functionality).toBeDefined();
      expect(hashes.usecases).toBeDefined();
      expect(hashes.interface).toBeDefined();
    });

    it('should return 16-character hex hashes for all collections', () => {
      const hashes = service.generateAllHashes(mockTool);

      for (const hash of Object.values(hashes)) {
        expect(hash.length).toBe(16);
        expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
      }
    });

    it('should match individual generateCollectionHash calls', () => {
      const allHashes = service.generateAllHashes(mockTool);

      expect(allHashes.tools).toBe(service.generateCollectionHash(mockTool, 'tools'));
      expect(allHashes.functionality).toBe(service.generateCollectionHash(mockTool, 'functionality'));
      expect(allHashes.usecases).toBe(service.generateCollectionHash(mockTool, 'usecases'));
      expect(allHashes.interface).toBe(service.generateCollectionHash(mockTool, 'interface'));
    });
  });

  describe('detectChangedFields', () => {
    it('should detect changed string field', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = { name: 'Updated Name' };

      const changedFields = service.detectChangedFields(oldTool, newData);

      expect(changedFields).toContain('name');
    });

    it('should detect changed array field', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = { categories: ['Machine Learning', 'Analytics'] };

      const changedFields = service.detectChangedFields(oldTool, newData);

      expect(changedFields).toContain('categories');
    });

    it('should detect multiple changed fields', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {
        name: 'Updated Name',
        description: 'Updated description',
        categories: ['New Category'],
      };

      const changedFields = service.detectChangedFields(oldTool, newData);

      expect(changedFields).toContain('name');
      expect(changedFields).toContain('description');
      expect(changedFields).toContain('categories');
    });

    it('should not include unchanged fields', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = { name: mockTool.name }; // Same value

      const changedFields = service.detectChangedFields(oldTool, newData);

      expect(changedFields).not.toContain('name');
    });

    it('should skip internal fields like syncMetadata', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {
        syncMetadata: { overallStatus: 'synced' },
        name: 'Updated Name',
      };

      const changedFields = service.detectChangedFields(oldTool, newData as Partial<ITool>);

      expect(changedFields).not.toContain('syncMetadata');
      expect(changedFields).toContain('name');
    });

    it('should skip _id and lastUpdated fields', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {
        _id: 'new-id',
        lastUpdated: new Date(),
        name: 'Updated Name',
      };

      const changedFields = service.detectChangedFields(oldTool, newData as Partial<ITool>);

      expect(changedFields).not.toContain('_id');
      expect(changedFields).not.toContain('lastUpdated');
      expect(changedFields).toContain('name');
    });

    it('should return empty array when no fields changed', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {};

      const changedFields = service.detectChangedFields(oldTool, newData);

      expect(changedFields).toEqual([]);
    });
  });

  describe('getAffectedCollections', () => {
    it('should return tools collection for name change', () => {
      const affected = service.getAffectedCollections(['name']);

      expect(affected).toContain('tools');
      expect(affected.length).toBe(1);
    });

    it('should return functionality collection for functionality change', () => {
      const affected = service.getAffectedCollections(['functionality']);

      expect(affected).toContain('functionality');
    });

    it('should return usecases collection for industries change', () => {
      const affected = service.getAffectedCollections(['industries']);

      expect(affected).toContain('usecases');
    });

    it('should return interface collection for interface change', () => {
      const affected = service.getAffectedCollections(['interface']);

      expect(affected).toContain('interface');
    });

    it('should return multiple collections for changes to multiple fields', () => {
      const affected = service.getAffectedCollections(['name', 'functionality', 'industries']);

      expect(affected).toContain('tools');
      expect(affected).toContain('functionality');
      expect(affected).toContain('usecases');
    });

    it('should return empty array for metadata-only changes', () => {
      const affected = service.getAffectedCollections(['pricing', 'website']);

      expect(affected).toEqual([]);
    });

    it('should not duplicate collections', () => {
      // description and name both affect 'tools' collection
      const affected = service.getAffectedCollections(['name', 'description', 'tagline']);

      const toolsCount = affected.filter((c) => c === 'tools').length;
      expect(toolsCount).toBe(1);
    });
  });

  describe('isMetadataOnlyChange', () => {
    it('should return true for metadata-only fields', () => {
      const result = service.isMetadataOnlyChange(['pricing', 'website', 'documentation']);

      expect(result).toBe(true);
    });

    it('should return false when semantic fields are included', () => {
      const result = service.isMetadataOnlyChange(['pricing', 'name']);

      expect(result).toBe(false);
    });

    it('should return true for empty array', () => {
      const result = service.isMetadataOnlyChange([]);

      expect(result).toBe(true);
    });
  });

  describe('hasSemanticChanges', () => {
    it('should return true when semantic fields are changed', () => {
      const result = service.hasSemanticChanges(['name', 'description']);

      expect(result).toBe(true);
    });

    it('should return false for metadata-only changes', () => {
      const result = service.hasSemanticChanges(['pricing', 'website']);

      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = service.hasSemanticChanges([]);

      expect(result).toBe(false);
    });
  });

  describe('classifyChanges', () => {
    it('should classify changes for each collection', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = { name: 'Updated Name' };

      const classification = service.classifyChanges(oldTool, newData);

      expect(classification.tools).toBe('semantic');
      expect(classification.functionality).toBe('none');
      expect(classification.usecases).toBe('none');
      expect(classification.interface).toBe('none');
    });

    it('should detect changes in multiple collections', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {
        name: 'Updated Name',
        functionality: ['New Functionality'],
        industries: ['New Industry'],
      };

      const classification = service.classifyChanges(oldTool, newData);

      expect(classification.tools).toBe('semantic');
      expect(classification.functionality).toBe('semantic');
      expect(classification.usecases).toBe('semantic');
      expect(classification.interface).toBe('none');
    });

    it('should return all none when no changes', () => {
      const oldTool = { ...mockTool } as ITool;
      const newData = {}; // No changes

      const classification = service.classifyChanges(oldTool, newData);

      expect(classification.tools).toBe('none');
      expect(classification.functionality).toBe('none');
      expect(classification.usecases).toBe('none');
      expect(classification.interface).toBe('none');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(contentHashService).toBeDefined();
      expect(contentHashService).toBeInstanceOf(ContentHashService);
    });

    it('should produce same results as new instance', () => {
      const singletonHash = contentHashService.generateCollectionHash(mockTool, 'tools');
      const newInstanceHash = service.generateCollectionHash(mockTool, 'tools');

      expect(singletonHash).toBe(newInstanceHash);
    });
  });
});
