// Field definitions based on the actual tool schema

export enum AllowedFields {
  // Identity fields
  ID = 'id',
  NAME = 'name',
  SLUG = 'slug',
  DESCRIPTION = 'description',
  LONG_DESCRIPTION = 'longDescription',
  TAGLINE = 'tagline',
  
  // Categorization fields
  CATEGORIES_PRIMARY = 'categories.primary',
  CATEGORIES_SECONDARY = 'categories.secondary',
  CATEGORIES_INDUSTRIES = 'categories.industries',
  CATEGORIES_USER_TYPES = 'categories.userTypes',
  
  // Pricing fields
  PRICING_LOWEST_MONTHLY = 'pricingSummary.lowestMonthlyPrice',
  PRICING_HIGHEST_MONTHLY = 'pricingSummary.highestMonthlyPrice',
  PRICING_CURRENCY = 'pricingSummary.currency',
  PRICING_HAS_FREE_TIER = 'pricingSummary.hasFreeTier',
  PRICING_HAS_CUSTOM = 'pricingSummary.hasCustomPricing',
  PRICING_BILLING_PERIODS = 'pricingSummary.billingPeriods',
  PRICING_MODEL = 'pricingSummary.pricingModel',
  
  // Capabilities fields
  CAPABILITIES_CORE = 'capabilities.core',
  CAPABILITIES_AI_CODE_GEN = 'capabilities.aiFeatures.codeGeneration',
  CAPABILITIES_AI_IMAGE_GEN = 'capabilities.aiFeatures.imageGeneration',
  CAPABILITIES_AI_DATA_ANALYSIS = 'capabilities.aiFeatures.dataAnalysis',
  CAPABILITIES_AI_VOICE = 'capabilities.aiFeatures.voiceInteraction',
  CAPABILITIES_AI_MULTIMODAL = 'capabilities.aiFeatures.multimodal',
  CAPABILITIES_AI_THINKING = 'capabilities.aiFeatures.thinkingMode',
  CAPABILITIES_TECH_API = 'capabilities.technical.apiAccess',
  CAPABILITIES_TECH_WEBHOOKS = 'capabilities.technical.webHooks',
  CAPABILITIES_TECH_SDK = 'capabilities.technical.sdkAvailable',
  CAPABILITIES_TECH_OFFLINE = 'capabilities.technical.offlineMode',
  CAPABILITIES_INTEGRATIONS_PLATFORMS = 'capabilities.integrations.platforms',
  CAPABILITIES_INTEGRATIONS_THIRD_PARTY = 'capabilities.integrations.thirdParty',
  CAPABILITIES_INTEGRATIONS_PROTOCOLS = 'capabilities.integrations.protocols',
  
  // Search and metadata fields
  SEARCH_KEYWORDS = 'searchKeywords',
  SEMANTIC_TAGS = 'semanticTags',
  ALIASES = 'aliases',
  
  // Legacy fields (for backward compatibility)
  INTERFACE = 'interface',
  FUNCTIONALITY = 'functionality',
  DEPLOYMENT = 'deployment',
  
  // Metrics fields
  POPULARITY = 'popularity',
  RATING = 'rating',
  REVIEW_COUNT = 'reviewCount',
  
  // URLs and links
  LOGO_URL = 'logoUrl',
  WEBSITE = 'website',
  DOCUMENTATION = 'documentation',
  
  // Status and metadata
  STATUS = 'status',
  CONTRIBUTOR = 'contributor',
  DATE_ADDED = 'dateAdded',
  LAST_UPDATED = 'lastUpdated',
  CREATED_BY = 'createdBy'
}

// Fields that contain arrays
export const ArrayFields = new Set([
  AllowedFields.CATEGORIES_PRIMARY,
  AllowedFields.CATEGORIES_SECONDARY,
  AllowedFields.CATEGORIES_INDUSTRIES,
  AllowedFields.CATEGORIES_USER_TYPES,
  AllowedFields.PRICING_BILLING_PERIODS,
  AllowedFields.PRICING_MODEL,
  AllowedFields.CAPABILITIES_CORE,
  AllowedFields.CAPABILITIES_INTEGRATIONS_PLATFORMS,
  AllowedFields.CAPABILITIES_INTEGRATIONS_THIRD_PARTY,
  AllowedFields.CAPABILITIES_INTEGRATIONS_PROTOCOLS,
  AllowedFields.SEARCH_KEYWORDS,
  AllowedFields.SEMANTIC_TAGS,
  AllowedFields.ALIASES,
  AllowedFields.INTERFACE,
  AllowedFields.FUNCTIONALITY,
  AllowedFields.DEPLOYMENT
]);

// Field type mappings
export enum FieldTypes {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object'
}

export const FieldTypeMap: Record<AllowedFields, FieldTypes> = {
  // String fields
  [AllowedFields.ID]: FieldTypes.STRING,
  [AllowedFields.NAME]: FieldTypes.STRING,
  [AllowedFields.SLUG]: FieldTypes.STRING,
  [AllowedFields.DESCRIPTION]: FieldTypes.STRING,
  [AllowedFields.LONG_DESCRIPTION]: FieldTypes.STRING,
  [AllowedFields.TAGLINE]: FieldTypes.STRING,
  [AllowedFields.PRICING_CURRENCY]: FieldTypes.STRING,
  [AllowedFields.LOGO_URL]: FieldTypes.STRING,
  [AllowedFields.WEBSITE]: FieldTypes.STRING,
  [AllowedFields.DOCUMENTATION]: FieldTypes.STRING,
  [AllowedFields.STATUS]: FieldTypes.STRING,
  [AllowedFields.CONTRIBUTOR]: FieldTypes.STRING,
  [AllowedFields.CREATED_BY]: FieldTypes.STRING,
  
  // Number fields
  [AllowedFields.PRICING_LOWEST_MONTHLY]: FieldTypes.NUMBER,
  [AllowedFields.PRICING_HIGHEST_MONTHLY]: FieldTypes.NUMBER,
  [AllowedFields.POPULARITY]: FieldTypes.NUMBER,
  [AllowedFields.RATING]: FieldTypes.NUMBER,
  [AllowedFields.REVIEW_COUNT]: FieldTypes.NUMBER,
  
  // Boolean fields
  [AllowedFields.PRICING_HAS_FREE_TIER]: FieldTypes.BOOLEAN,
  [AllowedFields.PRICING_HAS_CUSTOM]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_CODE_GEN]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_IMAGE_GEN]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_DATA_ANALYSIS]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_VOICE]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_MULTIMODAL]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_AI_THINKING]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_TECH_API]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_TECH_WEBHOOKS]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_TECH_SDK]: FieldTypes.BOOLEAN,
  [AllowedFields.CAPABILITIES_TECH_OFFLINE]: FieldTypes.BOOLEAN,
  
  // Date fields
  [AllowedFields.DATE_ADDED]: FieldTypes.DATE,
  [AllowedFields.LAST_UPDATED]: FieldTypes.DATE,
  
  // Array fields
  [AllowedFields.CATEGORIES_PRIMARY]: FieldTypes.ARRAY,
  [AllowedFields.CATEGORIES_SECONDARY]: FieldTypes.ARRAY,
  [AllowedFields.CATEGORIES_INDUSTRIES]: FieldTypes.ARRAY,
  [AllowedFields.CATEGORIES_USER_TYPES]: FieldTypes.ARRAY,
  [AllowedFields.PRICING_BILLING_PERIODS]: FieldTypes.ARRAY,
  [AllowedFields.PRICING_MODEL]: FieldTypes.ARRAY,
  [AllowedFields.CAPABILITIES_CORE]: FieldTypes.ARRAY,
  [AllowedFields.CAPABILITIES_INTEGRATIONS_PLATFORMS]: FieldTypes.ARRAY,
  [AllowedFields.CAPABILITIES_INTEGRATIONS_THIRD_PARTY]: FieldTypes.ARRAY,
  [AllowedFields.CAPABILITIES_INTEGRATIONS_PROTOCOLS]: FieldTypes.ARRAY,
  [AllowedFields.SEARCH_KEYWORDS]: FieldTypes.ARRAY,
  [AllowedFields.SEMANTIC_TAGS]: FieldTypes.ARRAY,
  [AllowedFields.ALIASES]: FieldTypes.ARRAY,
  [AllowedFields.INTERFACE]: FieldTypes.ARRAY,
  [AllowedFields.FUNCTIONALITY]: FieldTypes.ARRAY,
  [AllowedFields.DEPLOYMENT]: FieldTypes.ARRAY
};

// Query operators
export enum Operators {
  // Equality operators
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  
  // Comparison operators (for numbers and dates)
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  
  // String operators
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  REGEX = 'regex',
  
  // Array operators
  IN = 'in',
  NOT_IN = 'notIn',
  ARRAY_CONTAINS = 'arrayContains',
  ARRAY_CONTAINS_ANY = 'arrayContainsAny',
  ARRAY_CONTAINS_ALL = 'arrayContainsAll',
  
  // Existence operators
  EXISTS = 'exists',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull'
}

// Valid operators for each field type
export const ValidOperatorsByType: Record<FieldTypes, Operators[]> = {
  [FieldTypes.STRING]: [
    Operators.EQUALS,
    Operators.NOT_EQUALS,
    Operators.CONTAINS,
    Operators.STARTS_WITH,
    Operators.ENDS_WITH,
    Operators.REGEX,
    Operators.IN,
    Operators.NOT_IN,
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ],
  [FieldTypes.NUMBER]: [
    Operators.EQUALS,
    Operators.NOT_EQUALS,
    Operators.GREATER_THAN,
    Operators.GREATER_THAN_OR_EQUAL,
    Operators.LESS_THAN,
    Operators.LESS_THAN_OR_EQUAL,
    Operators.IN,
    Operators.NOT_IN,
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ],
  [FieldTypes.BOOLEAN]: [
    Operators.EQUALS,
    Operators.NOT_EQUALS,
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ],
  [FieldTypes.DATE]: [
    Operators.EQUALS,
    Operators.NOT_EQUALS,
    Operators.GREATER_THAN,
    Operators.GREATER_THAN_OR_EQUAL,
    Operators.LESS_THAN,
    Operators.LESS_THAN_OR_EQUAL,
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ],
  [FieldTypes.ARRAY]: [
    Operators.ARRAY_CONTAINS,
    Operators.ARRAY_CONTAINS_ANY,
    Operators.ARRAY_CONTAINS_ALL,
    Operators.IN,
    Operators.NOT_IN,
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ],
  [FieldTypes.OBJECT]: [
    Operators.EXISTS,
    Operators.IS_NULL,
    Operators.IS_NOT_NULL
  ]
};