#!/usr/bin/env node

/**
 * Enhanced Integration Validation Script
 * 
 * This script validates that the enhanced vector indexing service
 * properly integrates with the enhanced Qdrant schema from T008.
 * 
 * Usage:
 *   npm run validate-enhanced-integration
 *   npm run validate-enhanced-integration -- --vectorTypes=semantic,entities.categories
 *   npm run validate-enhanced-integration -- --detailed
 */

import { enhancedVectorIndexingService } from '../src/services/enhanced-vector-indexing.service';
import { qdrantService } from '../src/services/qdrant.service';
import { embeddingService } from '../src/services/embedding.service';
import { mongoDBService } from '../src/services/mongodb.service';
import { shouldUseEnhancedCollection, getEnhancedCollectionName, getCollectionNameForVectorType } from '../src/config/database';
import {
  getEnabledVectorTypes,
  getVectorConfig,
  isEnhancedVectorTypeSupported,
  enhancedCollectionConfig
} from '../src/config/enhanced-qdrant-schema';
import { validateEnhancedVectors } from '../src/config/enhanced-qdrant-schema';

// Parse command line arguments
const args = process.argv.slice(2);
const options: {
  vectorTypes?: string[];
  detailed?: boolean;
  fixIssues?: boolean;
} = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--vectorTypes=')) {
    options.vectorTypes = arg.split('=')[1].split(',').map(v => v.trim());
  } else if (arg === '--detailed') {
    options.detailed = true;
  } else if (arg === '--fixIssues') {
    options.fixIssues = true;
  }
}

// Set defaults
if (!options.vectorTypes || options.vectorTypes.length === 0) {
  options.vectorTypes = getEnabledVectorTypes();
}

interface ValidationResult {
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

interface IntegrationReport {
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  results: ValidationResult[];
}

async function main() {
  console.log('🔍 Enhanced Integration Validation');
  console.log('=================================');
  console.log(`Using enhanced collection: ${shouldUseEnhancedCollection() ? 'Yes' : 'No'}`);
  console.log(`Vector types to validate: ${options.vectorTypes.join(', ')}`);
  console.log(`Detailed output: ${options.detailed ? 'Yes' : 'No'}`);
  if (options.fixIssues) {
    console.log(`Auto-fix issues: ${options.fixIssues ? 'Yes' : 'No'}`);
  }
  console.log('');

  const report: IntegrationReport = {
    totalChecks: 0,
    passedChecks: 0,
    warningChecks: 0,
    failedChecks: 0,
    results: []
  };

  try {
    // Validate configuration
    console.log('🔧 Validating Configuration');
    console.log('------------------------------');
    
    // Check enhanced collection configuration
    try {
      const expectedVectors = enhancedCollectionConfig.vectors_config;
      const expectedVectorTypes = Object.keys(expectedVectors);
      
      if (options.vectorTypes.every(vt => expectedVectorTypes.includes(vt))) {
        addResult(report, {
          category: 'Configuration',
          status: 'pass',
          message: 'All requested vector types are supported in enhanced schema'
        });
      } else {
        const unsupported = options.vectorTypes.filter(vt => !expectedVectorTypes.includes(vt));
        addResult(report, {
          category: 'Configuration',
          status: 'fail',
          message: `Unsupported vector types: ${unsupported.join(', ')}`,
          details: { supportedTypes: expectedVectorTypes, requestedTypes: options.vectorTypes }
        });
      }
    } catch (error) {
      addResult(report, {
        category: 'Configuration',
        status: 'fail',
        message: `Error checking enhanced collection configuration: ${error}`,
        details: error
      });
    }
    
    // Check environment variables
    const enhancedCollectionEnabled = shouldUseEnhancedCollection();
    if (enhancedCollectionEnabled) {
      addResult(report, {
        category: 'Configuration',
        status: 'pass',
        message: 'Enhanced collection is enabled in configuration'
      });
    } else {
      addResult(report, {
        category: 'Configuration',
        status: 'warn',
        message: 'Enhanced collection is not enabled, using legacy collections'
      });
    }
    console.log('');
    
    // Validate collection structure
    console.log('🏗️ Validating Collection Structure');
    console.log('-----------------------------------');
    
    if (enhancedCollectionEnabled) {
      try {
        const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
        const vectorsConfig = collectionInfo.config.params.vectors;
        
        // Check if collection has named vectors
        if (vectorsConfig && typeof vectorsConfig === 'object') {
          const namedVectors = Object.keys(vectorsConfig);
          
          if (options.vectorTypes.every(vt => namedVectors.includes(vt))) {
            addResult(report, {
              category: 'Collection Structure',
              status: 'pass',
              message: 'Enhanced collection has all required named vectors'
            });
          } else {
            const missing = options.vectorTypes.filter(vt => !namedVectors.includes(vt));
            addResult(report, {
              category: 'Collection Structure',
              status: 'fail',
              message: `Enhanced collection missing named vectors: ${missing.join(', ')}`,
              details: { availableVectors: namedVectors, requiredVectors: options.vectorTypes }
            });
          }
          
          // Check vector dimensions
          let dimensionsValid = true;
          for (const vectorType of options.vectorTypes) {
            if (namedVectors.includes(vectorType)) {
              const vectorConfig = vectorsConfig[vectorType];
              const expectedDimensions = 1024; // mxbai-embed-large
              
              if (vectorConfig.size !== expectedDimensions) {
                dimensionsValid = false;
                addResult(report, {
                  category: 'Collection Structure',
                  status: 'fail',
                  message: `Invalid dimensions for ${vectorType}: expected ${expectedDimensions}, got ${vectorConfig.size}`,
                  details: { vectorType, expectedDimensions, actualDimensions: vectorConfig.size }
                });
              }
            }
          }
          
          if (dimensionsValid) {
            addResult(report, {
              category: 'Collection Structure',
              status: 'pass',
              message: 'All vector types have correct dimensions (1024)'
            });
          }
        } else {
          addResult(report, {
            category: 'Collection Structure',
            status: 'fail',
            message: 'Enhanced collection does not have named vectors configuration'
          });
        }
      } catch (error) {
        addResult(report, {
          category: 'Collection Structure',
          status: 'fail',
          message: `Error checking enhanced collection: ${error}`,
          details: error
        });
      }
    } else {
      // Check legacy collections
      for (const vectorType of options.vectorTypes) {
        try {
          const collectionName = getCollectionNameForVectorType(vectorType);
          const collectionInfo = await qdrantService.getCollectionInfoForVectorType(vectorType);
          
          addResult(report, {
            category: 'Collection Structure',
            status: 'pass',
            message: `Legacy collection exists for ${vectorType}`
          });
        } catch (error) {
          addResult(report, {
            category: 'Collection Structure',
            status: 'fail',
            message: `Legacy collection not found for ${vectorType}`,
            details: error
          });
        }
      }
    }
    console.log('');
    
    // Validate service integration
    console.log('🔌 Validating Service Integration');
    console.log('---------------------------------');
    
    // Test vector generation
    try {
      const sampleTools = await mongoDBService.getAllTools();
      if (sampleTools.length > 0) {
        const sampleTool = sampleTools[0];
        const vectors = await enhancedVectorIndexingService.generateMultipleVectors(sampleTool);
        
        // Validate vectors against schema
        try {
          validateEnhancedVectors(vectors);
          addResult(report, {
            category: 'Service Integration',
            status: 'pass',
            message: 'Vector generation and validation successful'
          });
        } catch (validationError) {
          addResult(report, {
            category: 'Service Integration',
            status: 'fail',
            message: `Generated vectors failed validation: ${validationError}`,
            details: validationError
          });
        }
        
        // Test search functionality
        for (const vectorType of options.vectorTypes) {
          if (vectors[vectorType]) {
            try {
              const searchResults = await qdrantService.searchByVectorType(
                vectors[vectorType],
                vectorType,
                5
              );
              
              if (searchResults.length > 0) {
                addResult(report, {
                  category: 'Service Integration',
                  status: 'pass',
                  message: `Search successful for ${vectorType} (${searchResults.length} results)`
                });
              } else {
                addResult(report, {
                  category: 'Service Integration',
                  status: 'warn',
                  message: `No results found for ${vectorType} search`
                });
              }
            } catch (searchError) {
              addResult(report, {
                category: 'Service Integration',
                status: 'fail',
                message: `Search failed for ${vectorType}: ${searchError}`,
                details: searchError
              });
            }
          }
        }
      } else {
        addResult(report, {
          category: 'Service Integration',
          status: 'warn',
          message: 'No tools found in MongoDB for testing'
        });
      }
    } catch (error) {
      addResult(report, {
        category: 'Service Integration',
        status: 'fail',
        message: `Error testing service integration: ${error}`,
        details: error
      });
    }
    console.log('');
    
    // Validate indexing process
    console.log('📝 Validating Indexing Process');
    console.log('--------------------------------');
    
    try {
      const healthReport = await enhancedVectorIndexingService.validateMultiVectorIndex(options.vectorTypes);
      
      if (healthReport.collectionHealthy) {
        addResult(report, {
          category: 'Indexing Process',
          status: 'pass',
          message: 'Multi-vector index is healthy'
        });
      } else {
        addResult(report, {
          category: 'Indexing Process',
          status: 'fail',
          message: 'Multi-vector index has health issues',
          details: healthReport.recommendations
        });
      }
      
      if (healthReport.sampleValidationPassed) {
        addResult(report, {
          category: 'Indexing Process',
          status: 'pass',
          message: 'Sample validation passed'
        });
      } else {
        addResult(report, {
          category: 'Indexing Process',
          status: 'fail',
          message: 'Sample validation failed'
        });
      }
      
      if (healthReport.missingVectors === 0) {
        addResult(report, {
          category: 'Indexing Process',
          status: 'pass',
          message: 'No missing vectors'
        });
      } else {
        addResult(report, {
          category: 'Indexing Process',
          status: 'warn',
          message: `${healthReport.missingVectors} missing vectors`,
          details: { 
            mongoTools: healthReport.mongoToolCount,
            qdrantVectors: healthReport.qdrantVectorCount,
            missingVectors: healthReport.missingVectors
          }
        });
      }
    } catch (error) {
      addResult(report, {
        category: 'Indexing Process',
        status: 'fail',
        message: `Error validating indexing process: ${error}`,
        details: error
      });
    }
    console.log('');
    
    // Print detailed results if requested
    if (options.detailed) {
      console.log('📋 Detailed Validation Results');
      console.log('===============================');
      
      report.results.forEach(result => {
        const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
        console.log(`${statusIcon} [${result.category}] ${result.message}`);
        
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`);
        }
      });
      console.log('');
    }
    
    // Print summary
    console.log('📊 Validation Summary');
    console.log('=====================');
    console.log(`Total checks: ${report.totalChecks}`);
    console.log(`Passed: ${report.passedChecks} (${(report.passedChecks / report.totalChecks * 100).toFixed(1)}%)`);
    console.log(`Warnings: ${report.warningChecks} (${(report.warningChecks / report.totalChecks * 100).toFixed(1)}%)`);
    console.log(`Failed: ${report.failedChecks} (${(report.failedChecks / report.totalChecks * 100).toFixed(1)}%)`);
    console.log('');
    
    // Print recommendations
    const failedResults = report.results.filter(r => r.status === 'fail');
    if (failedResults.length > 0) {
      console.log('🔧 Recommendations');
      console.log('==================');
      failedResults.forEach(result => {
        console.log(`- ${result.message}`);
        if (options.fixIssues && result.category === 'Indexing Process' && result.message.includes('missing vectors')) {
          console.log('  → Run: npm run seed-enhanced-vectors -- --force');
        }
      });
      console.log('');
    }
    
    // Final verdict
    if (report.failedChecks === 0) {
      console.log('🎉 Enhanced integration validation passed!');
      console.log('The enhanced vector indexing service is properly integrated with the enhanced Qdrant schema.');
    } else if (report.failedChecks < report.totalChecks / 2) {
      console.log('⚠️ Enhanced integration validation completed with issues');
      console.log('Some components need attention before full functionality is available.');
    } else {
      console.log('❌ Enhanced integration validation failed');
      console.log('Multiple critical issues need to be addressed.');
    }
    
  } catch (error) {
    console.error('💥 Error during enhanced integration validation:', error);
    process.exit(1);
  }
}

function addResult(report: IntegrationReport, result: ValidationResult) {
  report.results.push(result);
  report.totalChecks++;
  
  if (result.status === 'pass') {
    report.passedChecks++;
  } else if (result.status === 'warn') {
    report.warningChecks++;
  } else {
    report.failedChecks++;
  }
  
  const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  console.log(`${statusIcon} ${result.message}`);
}

// Run the main function
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
