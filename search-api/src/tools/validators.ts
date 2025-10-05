import { AllowedFields, ArrayFields, FieldTypes, FieldTypeMap } from '../config/fields';

/**
 * Safely get a nested value from an object using dot notation
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., 'pricing.free', 'metadata.tags')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object' || !path) {
    return undefined;
  }

  // Handle array notation like 'tags[0]' or 'pricing.plans[1].name'
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');

  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array access
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      current = current[index];
    } else if (typeof current === 'object') {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 * @param obj - The object to modify
 * @param path - Dot-separated path
 * @param value - The value to set
 * @returns The modified object
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  if (!obj || typeof obj !== 'object' || !path) {
    return obj;
  }

  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!key) continue; // Skip empty keys
    
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
  return obj;
}

/**
 * Check if a nested path exists in an object
 * @param obj - The object to check
 * @param path - Dot-separated path
 * @returns True if the path exists (even if value is null/undefined)
 */
export function hasNestedPath(obj: any, path: string): boolean {
  if (!obj || typeof obj !== 'object' || !path) {
    return false;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }

    if (!(key in current)) {
      return false;
    }

    current = current[key];
  }

  return true;
}

/**
 * Validate that a field name is allowed in the schema
 * @param field - The field name to validate
 * @throws Error if field is not allowed
 */
export function assertField(field: string): void {
  if (!field || typeof field !== 'string') {
    throw new Error('Field name must be a non-empty string');
  }

  // Check if it's a direct field
  if (Object.values(AllowedFields).includes(field as AllowedFields)) {
    return;
  }

  // Check if it's a nested field (contains dots)
  if (field.includes('.')) {
    const rootField = field.split('.')[0];
    if (Object.values(AllowedFields).includes(rootField as AllowedFields)) {
      return;
    }
  }

  throw new Error(`Field '${field}' is not allowed. Allowed fields: ${Object.values(AllowedFields).join(', ')}`);
}

/**
 * Validate that a field is an array field
 * @param field - The field name to validate
 * @throws Error if field is not an array field
 */
export function assertArrayField(field: string): void {
  assertField(field);
  
  const rootField = field.split('.')[0];
  if (!ArrayFields.has(rootField as AllowedFields)) {
    throw new Error(`Field '${field}' is not an array field. Array fields: ${Array.from(ArrayFields).join(', ')}`);
  }
}

/**
 * Get the expected type for a field
 * @param field - The field name
 * @returns The expected type or 'unknown' if not defined
 */
export function getFieldType(field: string): string {
  const rootField = field.split('.')[0];
  return FieldTypeMap[rootField as AllowedFields] || 'unknown';
}

/**
 * Validate that a value matches the expected type for a field
 * @param field - The field name
 * @param value - The value to validate
 * @returns True if valid, false otherwise
 */
export function validateFieldValue(field: string, value: any): boolean {
  const expectedType = getFieldType(field);
  
  if (expectedType === 'unknown') {
    return true; // Allow unknown fields
  }

  if (value === null || value === undefined) {
    return true; // Allow null/undefined for any field
  }

  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    case 'date':
      return value instanceof Date || 
             (typeof value === 'string' && !isNaN(Date.parse(value)));
    default:
      return true;
  }
}

/**
 * Normalize a field path by removing array indices and extra dots
 * @param path - The field path to normalize
 * @returns Normalized path
 */
export function normalizeFieldPath(path: string): string {
  return path
    .replace(/\[\d+\]/g, '') // Remove array indices
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
}

/**
 * Extract all possible field paths from an object
 * @param obj - The object to analyze
 * @param prefix - Current path prefix
 * @param maxDepth - Maximum depth to traverse (default: 5)
 * @returns Array of field paths
 */
export function extractFieldPaths(obj: any, prefix: string = '', maxDepth: number = 5): string[] {
  if (maxDepth <= 0 || obj === null || obj === undefined) {
    return [];
  }

  const paths: string[] = [];
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);
      
      if (typeof value === 'object' && value !== null) {
        paths.push(...extractFieldPaths(value, currentPath, maxDepth - 1));
      }
    }
  } else if (Array.isArray(obj) && obj.length > 0) {
    // For arrays, analyze the first element to get structure
    const firstElement = obj[0];
    if (typeof firstElement === 'object' && firstElement !== null) {
      paths.push(...extractFieldPaths(firstElement, prefix, maxDepth - 1));
    }
  }

  return paths;
}

/**
 * Compare two values for equality, handling nested objects and arrays
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }
  
  return false;
}

/**
 * Create a deep copy of an object
 * @param obj - Object to clone
 * @returns Deep copy of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    (cloned as any)[key] = deepClone(value);
  }
  
  return cloned;
}

export default {
  getNestedValue,
  setNestedValue,
  hasNestedPath,
  assertField,
  assertArrayField,
  getFieldType,
  validateFieldValue,
  normalizeFieldPath,
  extractFieldPaths,
  deepEqual,
  deepClone
};