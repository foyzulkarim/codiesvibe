# Security Testing Guide

**Version**: 1.0
**Last Updated**: 2025-11-17

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Security Testing Checklist](#security-testing-checklist)
3. [Automated Security Scanning](#automated-security-scanning)
4. [Manual Security Testing](#manual-security-testing)
5. [OWASP Top 10 Testing](#owasp-top-10-testing)
6. [API-Specific Security Tests](#api-specific-security-tests)
7. [Tools and Resources](#tools-and-resources)

---

## 🎯 Overview

This guide provides comprehensive security testing procedures for the Search API. All tests should be conducted in a **non-production environment** to avoid impacting live services.

**Security Testing Goals**:
- Identify vulnerabilities before production deployment
- Validate security controls (rate limiting, input validation, CORS)
- Ensure compliance with OWASP security standards
- Test authentication and authorization (when implemented)
- Verify data protection and encryption

---

## ✅ Security Testing Checklist

### Pre-Deployment Security Checks

- [ ] **Input Validation**
  - [ ] Test SQL/NoSQL injection attempts
  - [ ] Test XSS (Cross-Site Scripting) attempts
  - [ ] Test command injection
  - [ ] Test path traversal
  - [ ] Test query parameter injection

- [ ] **Authentication & Authorization**
  - [ ] Test API without credentials (should fail when auth is enabled)
  - [ ] Test with invalid credentials
  - [ ] Test with expired tokens
  - [ ] Test privilege escalation

- [ ] **Rate Limiting**
  - [ ] Verify global rate limit (100 req/15min)
  - [ ] Verify search rate limit (30 req/min)
  - [ ] Test rate limit bypass attempts

- [ ] **CORS**
  - [ ] Test CORS with allowed origins
  - [ ] Test CORS with disallowed origins
  - [ ] Test CORS bypass attempts

- [ ] **Security Headers**
  - [ ] Verify helmet headers present
  - [ ] Check X-Content-Type-Options
  - [ ] Check X-Frame-Options
  - [ ] Check X-XSS-Protection
  - [ ] Check Content-Security-Policy

- [ ] **Data Protection**
  - [ ] Verify no sensitive data in logs
  - [ ] Verify no sensitive data in error messages
  - [ ] Test data sanitization
  - [ ] Verify HTTPS in production

- [ ] **Dependencies**
  - [ ] Run `npm audit` for vulnerability scan
  - [ ] Check for known CVEs in dependencies
  - [ ] Verify all dependencies are up-to-date

- [ ] **Error Handling**
  - [ ] Verify no stack traces in production
  - [ ] Verify error messages don't leak system info
  - [ ] Test error handling for all endpoints

---

## 🤖 Automated Security Scanning

### 1. npm audit

Check for known vulnerabilities in dependencies:

```bash
# Run vulnerability scan
npm audit

# View detailed report
npm audit --json > audit-report.json

# Fix vulnerabilities (review changes first!)
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

**Action Items**:
- Fix all **critical** and **high** severity vulnerabilities
- Review and address **moderate** vulnerabilities
- Document any unfixed vulnerabilities with justification

---

### 2. OWASP ZAP (Zed Attack Proxy)

Comprehensive security scanning tool.

**Installation**:
```bash
# Download from https://www.zaproxy.org/download/

# Or via Docker
docker pull zaproxy/zap-stable
```

**Quick Scan**:
```bash
docker run -t zaproxy/zap-stable zap-baseline.py \
  -t http://localhost:4003 \
  -r zap-report.html
```

**Full Scan**:
```bash
docker run -t zaproxy/zap-stable zap-full-scan.py \
  -t http://localhost:4003 \
  -r zap-full-report.html
```

**What ZAP Tests**:
- SQL Injection
- XSS (Cross-Site Scripting)
- Path Traversal
- Remote File Inclusion
- Server Side Includes
- Script Active Scan Rules
- Server Information Leakage

---

### 3. Snyk

Vulnerability scanning for dependencies and Docker images.

**Installation**:
```bash
npm install -g snyk
```

**Usage**:
```bash
# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Test Docker image
snyk test --docker search-api:latest

# Monitor project
snyk monitor
```

---

### 4. Safety (Python Dependencies)

If using Python dependencies:

```bash
pip install safety
safety check
```

---

## 🔍 Manual Security Testing

### 1. NoSQL Injection Testing

**Test Case 1**: MongoDB Injection via Query Parameter
```bash
# Attempt 1: $where injection
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "$where": "1 == 1"
  }'

# Expected: Should not execute $where, sanitized by mongo-sanitize
# Should return 200 with normal results or validation error
```

**Test Case 2**: Operator Injection
```bash
# Attempt 2: $ne operator injection
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"$ne": null}
  }'

# Expected: Should fail validation (query must be string)
```

**Test Case 3**: MongoDB JavaScript Execution
```bash
# Attempt 3: JavaScript execution
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "$expr": {"$function": {"body": "function() { return true; }", "args": [], "lang": "js"}}
  }'

# Expected: Should be sanitized, not executed
```

---

### 2. XSS (Cross-Site Scripting) Testing

**Test Case 1**: Script Tag in Query
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "<script>alert(\"XSS\")</script>"
  }'

# Expected: 400 Bad Request (invalid characters)
```

**Test Case 2**: Event Handler Injection
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "<img src=x onerror=alert(1)>"
  }'

# Expected: 400 Bad Request (invalid characters)
```

**Test Case 3**: Encoded XSS
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "%3Cscript%3Ealert%281%29%3C%2Fscript%3E"
  }'

# Expected: Should be sanitized or rejected
```

---

### 3. Command Injection Testing

**Test Case 1**: Shell Command Injection
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "; ls -la"
  }'

# Expected: Should not execute shell commands
```

**Test Case 2**: Piped Commands
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test | cat /etc/passwd"
  }'

# Expected: Treated as normal query, not executed
```

---

### 4. HTTP Header Injection

**Test Case 1**: CRLF Injection
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test\r\nX-Injected-Header: malicious" \
  -d '{"query": "test"}'

# Expected: Headers should be sanitized
```

**Test Case 2**: Response Splitting
```bash
curl -X POST http://localhost:4003/search \
  -H "X-Correlation-ID: test\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>" \
  -d '{"query": "test"}'

# Expected: Should not allow header injection
```

---

### 5. Rate Limit Testing

**Test Case 1**: Global Rate Limit
```bash
# Make 101 requests within 15 minutes
for i in {1..101}; do
  curl -s http://localhost:4003/health > /dev/null
  echo "Request $i"
done

# Expected: Request 101 should return 429
```

**Test Case 2**: Search Rate Limit
```bash
# Make 31 search requests within 1 minute
for i in {1..31}; do
  curl -s -X POST http://localhost:4003/search \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"test $i\"}" > /dev/null
  echo "Search $i"
done

# Expected: Request 31 should return 429
```

---

### 6. CORS Testing

**Test Case 1**: Allowed Origin
```bash
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:4003/search

# Expected: Should return CORS headers
```

**Test Case 2**: Disallowed Origin (Production)
```bash
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:4003/search

# Expected: Should reject or not return CORS headers
```

---

## 🛡️ OWASP Top 10 Testing

### A01:2021 - Broken Access Control

**Tests**:
- [ ] Test API endpoints without authentication (when implemented)
- [ ] Test accessing other users' data
- [ ] Test privilege escalation
- [ ] Test forced browsing to restricted URLs

**Current Status**: No authentication implemented yet (reserved for future)

---

### A02:2021 - Cryptographic Failures

**Tests**:
- [ ] Verify HTTPS in production
- [ ] Check for sensitive data in transit
- [ ] Verify no passwords in logs
- [ ] Check for weak cryptographic algorithms

**Current Status**:
- ✅ No sensitive data stored
- ⚠️ Ensure HTTPS in production
- ✅ No passwords/secrets in code

---

### A03:2021 - Injection

**Tests**:
- [x] NoSQL injection (tested above)
- [x] XSS (tested above)
- [x] Command injection (tested above)
- [ ] LDAP injection
- [ ] XML injection

**Current Status**:
- ✅ NoSQL injection protection (mongo-sanitize)
- ✅ Input validation (express-validator + Joi)
- ✅ Query sanitization
- ✅ Character filtering

---

### A04:2021 - Insecure Design

**Tests**:
- [ ] Review architecture for security flaws
- [ ] Check for business logic vulnerabilities
- [ ] Verify rate limiting effectiveness
- [ ] Test circuit breaker implementation

**Current Status**:
- ✅ Rate limiting implemented
- ✅ Circuit breakers implemented
- ✅ Timeout protection
- ✅ Graceful degradation

---

### A05:2021 - Security Misconfiguration

**Tests**:
- [x] Check security headers (tested above)
- [ ] Verify no default credentials
- [ ] Check for unnecessary features enabled
- [ ] Verify error handling doesn't leak info

**Current Status**:
- ✅ Helmet security headers
- ✅ No default credentials
- ✅ Minimal features enabled
- ✅ Production error sanitization

---

### A06:2021 - Vulnerable and Outdated Components

**Tests**:
- [x] Run `npm audit`
- [ ] Check for outdated dependencies
- [ ] Verify no known CVEs

**Commands**:
```bash
npm audit
npm outdated
```

---

### A07:2021 - Identification and Authentication Failures

**Tests**:
- [ ] Test authentication mechanisms (when implemented)
- [ ] Test session management
- [ ] Test password policies
- [ ] Test account lockout

**Current Status**: Not applicable (no auth yet)

---

### A08:2021 - Software and Data Integrity Failures

**Tests**:
- [ ] Verify dependency integrity (npm audit)
- [ ] Check for unsigned packages
- [ ] Verify no CI/CD without verification

**Current Status**:
- ✅ Package-lock.json for integrity
- ⚠️ CI/CD to be implemented in Phase 7

---

### A09:2021 - Security Logging and Monitoring Failures

**Tests**:
- [ ] Verify security events are logged
- [ ] Check log integrity
- [ ] Test alert mechanisms
- [ ] Verify no sensitive data in logs

**Current Status**:
- ✅ Comprehensive logging (Winston)
- ✅ Security event logging
- ✅ Correlation ID tracking
- ✅ Loggly integration ready
- ✅ No sensitive data in logs

---

### A10:2021 - Server-Side Request Forgery (SSRF)

**Tests**:
- [ ] Test URL parameter injection
- [ ] Test internal network access
- [ ] Test cloud metadata access

**Current Status**: Low risk (no user-controlled URLs)

---

## 🔧 Tools and Resources

### Security Testing Tools

1. **OWASP ZAP** - https://www.zaproxy.org/
   - Comprehensive security scanner
   - Active and passive scanning
   - API testing support

2. **Burp Suite Community** - https://portswigger.net/burp/communitydownload
   - Web security testing
   - Proxy and scanner
   - Manual testing tools

3. **Snyk** - https://snyk.io/
   - Dependency vulnerability scanning
   - Container scanning
   - CI/CD integration

4. **npm audit** - Built-in
   - Dependency vulnerability checking
   - Automated fixes

5. **SonarQube** - https://www.sonarqube.org/
   - Code quality and security
   - OWASP Top 10 detection
   - Technical debt tracking

### API Security Testing Tools

1. **Postman** - https://www.postman.com/
   - API testing
   - Security test collections
   - Automated testing

2. **REST-Assured** - https://rest-assured.io/
   - REST API testing
   - Security assertion

3. **OWASP API Security Top 10** - https://owasp.org/www-project-api-security/
   - API-specific security risks
   - Testing guidelines

### Resources

1. **OWASP Testing Guide** - https://owasp.org/www-project-web-security-testing-guide/
2. **OWASP Cheat Sheet Series** - https://cheatsheetseries.owasp.org/
3. **API Security Checklist** - https://github.com/shieldfy/API-Security-Checklist
4. **Node.js Security Checklist** - https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices

---

## 📊 Security Test Report Template

After running security tests, document findings using this template:

```markdown
# Security Test Report

**Date**: YYYY-MM-DD
**Tester**: Name
**Environment**: Development/Staging/Production
**API Version**: 1.0.0

## Summary

- Total Tests: X
- Passed: X
- Failed: X
- Critical Issues: X
- High Issues: X
- Medium Issues: X
- Low Issues: X

## Critical Issues

### Issue 1: [Title]
- **Severity**: Critical
- **Category**: OWASP A01 - Broken Access Control
- **Description**: Detailed description
- **Impact**: Security impact
- **Steps to Reproduce**:
  1. Step 1
  2. Step 2
- **Remediation**: How to fix
- **Status**: Open/Fixed

## High Issues

[Same format as Critical]

## Medium Issues

[Same format as Critical]

## Low Issues

[Same format as Critical]

## Recommendations

1. Priority 1 recommendations
2. Priority 2 recommendations

## Conclusion

Overall security assessment and next steps.
```

---

## ✅ Security Testing Checklist Summary

### Before Production Deployment

- [ ] Run `npm audit` and fix all critical/high vulnerabilities
- [ ] Run OWASP ZAP scan and address findings
- [ ] Test all OWASP Top 10 categories
- [ ] Verify input validation for all endpoints
- [ ] Test rate limiting effectiveness
- [ ] Verify CORS configuration
- [ ] Check security headers
- [ ] Test error handling (no info leakage)
- [ ] Verify HTTPS in production
- [ ] Test timeout protection
- [ ] Test circuit breaker functionality
- [ ] Review logs for sensitive data
- [ ] Document all security findings
- [ ] Create security test report

---

**Last Updated**: 2025-11-17
**Next Review**: Before production deployment
