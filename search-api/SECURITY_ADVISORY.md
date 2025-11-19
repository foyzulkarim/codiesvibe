# Security Advisory - Search API Dependencies

**Last Updated**: November 19, 2025
**Status**: Active Monitoring

## Overview

This document outlines known security vulnerabilities in the search-api dependencies and the rationale for acceptance or mitigation strategies.

---

## ✅ Resolved Vulnerabilities

### 1. axios CVE-2025-58754 (HIGH) - FIXED
**Issue**: DoS attack through lack of data size check
**Fixed Version**: axios@1.12.2
**Solution**: Added npm override to force axios@^1.12.2
**Status**: ✅ Resolved

### 2. axios CVE-2025-27152 (HIGH) - FIXED
**Issue**: SSRF and Credential Leakage via Absolute URL
**Fixed Version**: axios@1.8.2 (we use 1.12.2)
**Solution**: Added npm override to force axios@^1.12.2
**Status**: ✅ Resolved

### 3. pm2 ReDoS (LOW) - FIXED
**Issue**: Regular Expression Denial of Service
**Fixed Version**: pm2@6.0.13
**Solution**: Upgraded pm2 from ^5.3.0 to ^6.0.13
**Status**: ✅ Resolved

### 4. js-yaml CVE (MODERATE) - FIXED
**Issue**: Prototype pollution in merge (<<)
**Fixed Version**: js-yaml@4.1.1
**Solution**: Added npm override to force js-yaml@^4.1.1
**Status**: ✅ Resolved

### 5. glob CVE (HIGH) - FIXED
**Issue**: Command injection via -c/--cmd
**Solution**: Fixed automatically via npm audit fix
**Status**: ✅ Resolved

---

## ⚠️ Known Accepted Vulnerabilities

### expr-eval CVE-2025-12735 & CVE-2025-13204 (HIGH)

#### Vulnerability Details
- **Package**: expr-eval@2.0.2
- **Severity**: HIGH (2 vulnerabilities)
- **CVE-2025-12735**: Function restriction bypass
- **CVE-2025-13204**: Prototype Pollution
- **Fixed Version**: NONE AVAILABLE

#### Dependency Chain
```
search-api (our code)
  └── @langchain/community@^0.3.57
      └── expr-eval@2.0.2 (VULNERABLE)
```

#### Why We Accept This Risk

1. **No Fix Available**
   - Latest expr-eval version is 2.0.2 (the vulnerable version)
   - No patched version has been released
   - Issue is known to expr-eval maintainers

2. **Cannot Upgrade Dependencies**
   - `@langchain/community@1.x` removes expr-eval dependency
   - However, it requires `@langchain/core@^1.0.0`
   - We currently use `@langchain/core@^0.3.78`
   - Upgrading causes breaking peer dependency conflicts across the entire LangChain ecosystem

3. **Not Directly Used**
   - We don't import or use expr-eval in our code
   - It's a transitive dependency buried in @langchain/community
   - Our code doesn't expose expression evaluation to users

4. **Limited Attack Surface**
   - The search-api doesn't expose user-controlled evaluation of expressions
   - Input validation and sanitization are applied at multiple layers
   - Express middleware (express-mongo-sanitize, express-validator) provides additional protection

5. **Mitigation Measures in Place**
   - **Input Validation**: All user inputs validated with express-validator
   - **Sanitization**: express-mongo-sanitize prevents NoSQL injection
   - **Rate Limiting**: express-rate-limit prevents abuse
   - **Helmet**: Security headers prevent various attacks
   - **HPP**: HTTP Parameter Pollution protection
   - **Monitoring**: Application-level monitoring for anomalous behavior

#### Resolution Plan

**Short-term** (Immediate):
- ✅ Document vulnerability and acceptance rationale
- ✅ Add to .trivyignore with detailed justification
- ✅ Monitor application logs for anomalous behavior
- ✅ Ensure all mitigation measures are active

**Medium-term** (Next 3-6 months):
- Monitor @langchain/community releases for expr-eval removal
- Monitor @langchain/core 1.x stability
- Test compatibility when @langchain/core@1.x becomes stable
- Plan migration to @langchain ecosystem 1.x

**Long-term** (Future):
- Upgrade entire LangChain ecosystem to 1.x when compatible
- Remove expr-eval dependency entirely
- Re-evaluate security posture

#### Review Schedule
- **Next Review**: January 1, 2026
- **Review Trigger**: Release of expr-eval patch OR @langchain/core@1.x stable
- **Responsible**: Security Team / Lead Developer

---

## Security Best Practices

### Current Security Measures

1. **Input Validation**
   - express-validator for request validation
   - Joi schemas for configuration validation
   - Custom validators for business logic

2. **Input Sanitization**
   - express-mongo-sanitize for NoSQL injection prevention
   - HPP for HTTP Parameter Pollution protection
   - Helmet for security headers

3. **Rate Limiting**
   - express-rate-limit (configurable limits)
   - Application-level throttling
   - IP-based rate limiting

4. **Dependency Management**
   - Regular npm audit runs
   - Automated dependency updates (Dependabot)
   - npm overrides for security patches
   - Trivy scanning in CI/CD

5. **Code Security**
   - ESLint security rules
   - TypeScript strict mode
   - No eval() or Function() usage
   - Principle of least privilege

### Monitoring and Detection

1. **Application Monitoring**
   - Winston logging for all requests
   - Error tracking and alerting
   - Performance monitoring

2. **Security Monitoring**
   - Failed authentication attempts
   - Rate limit violations
   - Unusual request patterns
   - Input validation failures

3. **Dependency Monitoring**
   - Daily npm audit in CI/CD
   - Trivy scanning on every commit
   - Dependabot security alerts
   - Monthly manual security review

---

## Reporting Security Issues

If you discover a security vulnerability, please email: security@codiesvibe.com

**Do not** create public GitHub issues for security vulnerabilities.

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and provide updates on remediation.

---

## Audit Trail

| Date       | Action                                      | Status   |
|------------|---------------------------------------------|----------|
| 2025-11-19 | Fixed axios, pm2, js-yaml, glob vulnerabilities | ✅ Complete |
| 2025-11-19 | Documented expr-eval acceptance rationale    | ✅ Complete |
| 2025-11-19 | Added .trivyignore for expr-eval            | ✅ Complete |
| 2026-01-01 | Scheduled review for expr-eval status       | ⏳ Pending |

---

## References

- [CVE-2025-12735](https://github.com/advisories/GHSA-jc85-fpwf-qm7x)
- [CVE-2025-13204](https://github.com/advisories/GHSA-8gw3-rxh4-v6jx)
- [LangChain Community GitHub](https://github.com/langchain-ai/langchainjs)
- [expr-eval GitHub](https://github.com/silentmatt/expr-eval)

---

**Document Version**: 1.0
**Last Updated**: November 19, 2025
**Next Review**: January 1, 2026
