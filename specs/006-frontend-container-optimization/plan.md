# Implementation Plan: Frontend Container Optimization (SIMPLIFIED)

**Branch**: `006-frontend-container-optimization` | **Date**: 2025-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Simple production container size optimization

## Summary
Replace Node.js serve with nginx/alpine in Dockerfile.frontend production stage to reduce container size from 577MB → ~50MB (90% reduction) with minimal risk and complexity.

## Technical Context
**Language/Version**: React + Vite frontend, Node.js 18 (build only)
**Primary Dependencies**: nginx:alpine (production), serve (current - to replace)
**Storage**: Static files only (dist/)
**Testing**: Basic functionality testing after change
**Target Platform**: Production Docker containers
**Project Type**: web - single Dockerfile change
**Performance Goals**: Reduce image size from 577MB to <50MB
**Constraints**: Must work with existing deployment setup
**Scale/Scope**: Single file change in Dockerfile.frontend

## Constitution Check
**Simplicity**: ✅ Single file change, no wrapper classes, direct nginx usage
**Architecture**: ✅ Infrastructure change only, no new libraries
**Testing**: ✅ Simple before/after validation tests
**Complexity**: ✅ Minimal change with maximum impact

## Project Structure
```
specs/006-frontend-container-optimization/
├── plan.md              # This file
└── quickstart.md        # Simple validation steps

# Main change:
Dockerfile.frontend      # Replace production stage only
```

## Phase 0: Skip Complex Research
**Decision**: Use nginx:alpine for static file serving
**Rationale**: Standard, proven, minimal footprint
**No research needed**: This is a well-established pattern

## Phase 1: Minimal Design
**Single Entity**: Optimized production stage in Dockerfile
**No contracts needed**: Simple file serving
**No complex data models**: Just container configuration

## Phase 2: Simple Task Approach
**Task Generation Strategy**:
1. Backup current working Dockerfile
2. Replace production stage with nginx:alpine
3. Test locally that it works
4. Deploy to production

**Estimated Output**: 4 simple tasks

## The Actual Implementation (Simple)

### Current Production Stage (Lines 72-124 in Dockerfile.frontend):
```dockerfile
FROM node:18-alpine AS production
# Install serve globally for static file serving
RUN npm install -g serve@14
# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# Serve command
CMD ["serve", "-s", "dist", "-l", "3000", "--no-clipboard", "--no-port-switching"]
```

### New Production Stage:
```dockerfile
FROM nginx:alpine AS production
# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Create simple nginx config for SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
# Expose port 80 (will be mapped to 3000 in docker-compose)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker-compose Port Mapping Change:
```yaml
# Update port mapping from container port 3000 to 80
ports:
  - "3000:80"  # External:Internal
```

## Validation Steps (Simple)
1. Build: `docker build -f Dockerfile.frontend --target production -t frontend-test .`
2. Size check: `docker images frontend-test --format "table {{.Repository}}\t{{.Size}}"`
3. Function test: `docker run -p 3001:80 frontend-test` then `curl http://localhost:3001`
4. Deploy if working

## Expected Results
- **Size Reduction**: 577MB → ~50MB (90% reduction)
- **Functionality**: Identical - serves same static React files
- **Risk**: Minimal - nginx is more stable than serve
- **Compatibility**: Port mapping change only

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Skip research (nginx/alpine is proven)
- [x] Phase 1: Simple design complete
- [x] Phase 2: Task planning complete (4 simple steps)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation (single file edit)
- [ ] Phase 5: Validation (size + function test)

**Gate Status**:
- [x] Initial Constitution Check: PASS (simplicity achieved)
- [x] Post-Design Constitution Check: PASS (minimal change)
- [x] All NEEDS CLARIFICATION resolved (none needed)
- [x] Complexity deviations documented (none - simplified)

---
*Simplified approach focusing on single Dockerfile change for maximum impact*