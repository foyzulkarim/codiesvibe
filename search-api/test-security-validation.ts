/**
 * Security Validation Test Script
 * Tests the enhanced malicious pattern detection
 */

// Test patterns that should be blocked
const maliciousPatterns = [
  // XSS attempts
  '<script>alert("xss")</script>',
  'javascript:alert(1)',
  '<img src=x onerror=alert(1)>',
  '<iframe src="evil.com">',

  // Code execution
  'eval(maliciousCode)',
  'exec("rm -rf /")',
  'system("cat /etc/passwd")',

  // Command substitution
  'test`whoami`test',
  'test$(whoami)test',

  // Escape sequences
  'test\\x41lert',
  'test\\u0041lert',
  'test&#x41;lert',

  // SQL injection
  'DROP TABLE users',
  'DELETE FROM users',
  "1' UNION SELECT * FROM users--",
  '/* comment */ SELECT',
];

// Test patterns that should be allowed (legitimate search queries)
const legitimateQueries = [
  'AI code completion tools',
  'best project management software',
  'video editing tools for creators',
  'data visualization libraries',
  'machine learning frameworks',
  'what are the best SEO tools?',
  'how to use docker compose',
  'CI/CD tools comparison',
];

const MALICIOUS_PATTERNS = [
  // XSS attempts
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,

  // Code execution attempts
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,

  // Command substitution
  /`[\s\S]*`/g,
  /\$\([^)]*\)/g,

  // Escape sequences
  /\\x[0-9a-fA-F]{2}/g,
  /\\u[0-9a-fA-F]{4}/g,
  /&#x?[0-9a-fA-F]+;/g,

  // SQL/NoSQL injection patterns
  /\b(DROP|DELETE|TRUNCATE)\s+(TABLE|FROM|DATABASE)/gi,
  /\b(INSERT|UPDATE)\s+(INTO|TABLE|FROM)/gi,
  /UNION\s+SELECT/gi,
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//g,
];

function containsMaliciousPattern(query: string): boolean {
  return MALICIOUS_PATTERNS.some(pattern => {
    // Reset regex lastIndex to avoid state issues with global flag
    pattern.lastIndex = 0;
    return pattern.test(query);
  });
}

console.log('🔒 Security Validation Test\n');
console.log('=' .repeat(60));

// Test malicious patterns
console.log('\n✅ Testing Malicious Patterns (should be BLOCKED):\n');
let blockedCount = 0;
maliciousPatterns.forEach((pattern, index) => {
  const isBlocked = containsMaliciousPattern(pattern);
  const status = isBlocked ? '✅ BLOCKED' : '❌ ALLOWED';
  console.log(`${index + 1}. ${status}: "${pattern}"`);
  if (isBlocked) blockedCount++;
});

console.log(`\nBlocked: ${blockedCount}/${maliciousPatterns.length} malicious patterns`);

// Test legitimate queries
console.log('\n\n✅ Testing Legitimate Queries (should be ALLOWED):\n');
let allowedCount = 0;
legitimateQueries.forEach((query, index) => {
  const isBlocked = containsMaliciousPattern(query);
  const status = !isBlocked ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`${index + 1}. ${status}: "${query}"`);
  if (!isBlocked) allowedCount++;
});

console.log(`\nAllowed: ${allowedCount}/${legitimateQueries.length} legitimate queries`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');
console.log(`  Malicious patterns blocked: ${blockedCount}/${maliciousPatterns.length} (${Math.round(blockedCount/maliciousPatterns.length*100)}%)`);
console.log(`  Legitimate queries allowed: ${allowedCount}/${legitimateQueries.length} (${Math.round(allowedCount/legitimateQueries.length*100)}%)`);

const allTestsPassed = blockedCount === maliciousPatterns.length && allowedCount === legitimateQueries.length;

if (allTestsPassed) {
  console.log('\n✅ All security validation tests PASSED!');
  process.exit(0);
} else {
  console.log('\n❌ Some security validation tests FAILED!');
  process.exit(1);
}
