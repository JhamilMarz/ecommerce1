# Code Review Process

## 📋 Propósito

Define el proceso de code review para mantener calidad de código, compartir conocimiento, y detectar bugs antes de producción.

---

## 🎯 Code Review Goals

### 1. **Detect Bugs Early**

- Logic errors
- Edge cases no manejados
- Race conditions
- Security vulnerabilities

### 2. **Maintain Code Quality**

- Readability
- Maintainability
- Consistency con standards
- Performance

### 3. **Knowledge Sharing**

- Developers aprenden de otros
- Distribución de conocimiento del codebase
- Onboarding de nuevos team members

### 4. **Architecture Consistency**

- Adherencia a patterns (DDD, Clean Architecture)
- Consistent API design
- Proper layer separation

---

## 🔄 Code Review Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Review Workflow                     │
└─────────────────────────────────────────────────────────────┘

1. Developer creates feature branch
   └─ git checkout -b feature/order-summary

2. Developer implements feature + tests
   └─ Write code, unit tests, integration tests

3. Developer pushes branch
   └─ git push origin feature/order-summary

4. Developer creates Pull Request (PR)
   └─ GitHub PR with description, screenshots

5. CI/CD runs automatically
   ├─ Linting (ESLint)
   ├─ Type checking (TypeScript)
   ├─ Unit tests (Jest)
   ├─ Integration tests
   ├─ Code coverage check (min 80%)
   └─ Security scan (npm audit)

6. ❌ CI fails → Developer fixes issues, push again
   ✅ CI passes → Ready for review

7. Reviewers review code
   ├─ At least 2 approvals required
   └─ Comments, suggestions, requests for changes

8. Developer addresses feedback
   └─ Push additional commits

9. Final approval
   └─ All reviewers approve

10. Merge to main
    ├─ Squash and merge (clean history)
    └─ Delete feature branch

11. Deploy to staging (automatic)
    └─ Monitor for issues

12. Deploy to production (manual approval)
    └─ After testing in staging
```

---

## 👥 Reviewers

### Automatic Assignment

**Code owners** (CODEOWNERS file):

```
# .github/CODEOWNERS

# Global (default reviewers)
*                         @tech-lead @senior-dev

# Specific services
/services/order/*         @order-team-lead @order-dev1
/services/payment/*       @payment-team-lead @security-expert
/services/catalog/*       @catalog-team-lead

# Infrastructure
/infrastructure/*         @devops-team @platform-team
/k8s/*                    @devops-team

# Security-sensitive
/services/*/auth/*        @security-expert @tech-lead

# Documentation
/docs/*                   @tech-writer @tech-lead
```

**Rules**:

- Minimum **2 approvals** required
- At least **1 approval from code owner** required
- Tech lead approval required para cambios arquitecturales

---

## 📝 Pull Request Template

```markdown
## Description

<!-- Describe what this PR does and why -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] Refactoring (no functional changes)
- [ ] Documentation update

## Related Issues

<!-- Link to related GitHub issues -->

Closes #123
Related to #456

## Changes Made

<!-- List specific changes -->

- Added order summary endpoint
- Implemented caching for product catalog
- Fixed race condition in inventory service

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Testing

<!-- Describe testing done -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tested in staging environment

### Test Coverage

- Current coverage: 85%
- Coverage change: +2%

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No console.logs or debugging code
- [ ] All tests passing locally
- [ ] No linting errors
- [ ] Breaking changes documented
- [ ] Database migrations included (if needed)
- [ ] API documentation updated (if API changed)

## Deployment Notes

<!-- Any special deployment considerations -->

- Requires database migration (run `npm run db:migrate`)
- New environment variable: `ORDER_CACHE_TTL` (default: 300)
- No downtime expected

## Performance Impact

<!-- Impact on performance, if any -->

- Query performance improved by 40% (added index on orders.customer_id)
- API response time reduced from 500ms to 200ms

## Security Considerations

<!-- Security implications, if any -->

- Added input validation for order creation
- Implemented rate limiting on expensive endpoint
```

---

## 👀 What to Look For (Reviewer Checklist)

### 1. Functionality

- [ ] Code does what PR description says
- [ ] Edge cases handled (null, empty arrays, etc.)
- [ ] Error handling present
- [ ] No obvious bugs

### 2. Testing

- [ ] Unit tests present for new code
- [ ] Tests cover edge cases
- [ ] Tests are meaningful (not just to pass coverage)
- [ ] Integration tests for API changes

### 3. Code Quality

- [ ] Code is readable (clear variable names, functions)
- [ ] Functions are small and focused (SRP)
- [ ] No code duplication (DRY)
- [ ] Comments explain "why", not "what"
- [ ] No commented-out code
- [ ] No console.log() or debug code

### 4. Architecture

- [ ] Follows Clean Architecture layers
- [ ] Domain logic in domain layer (not in controllers)
- [ ] Proper dependency injection
- [ ] API design consistent with existing endpoints
- [ ] Database schema changes are backward compatible

### 5. Performance

- [ ] No N+1 queries
- [ ] Proper indexes on database queries
- [ ] Pagination for list endpoints
- [ ] Caching where appropriate
- [ ] No blocking operations in request handlers

### 6. Security

- [ ] Input validation (Zod schemas)
- [ ] Authentication checks
- [ ] Authorization checks (RBAC)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Secrets not hardcoded
- [ ] Sensitive data not logged

### 7. Error Handling

- [ ] Try-catch blocks where needed
- [ ] Errors logged properly
- [ ] User-friendly error messages
- [ ] No stack traces in production responses

### 8. Documentation

- [ ] API documentation updated (if API changed)
- [ ] Complex logic commented
- [ ] README updated (if needed)
- [ ] Migration guide (if breaking change)

---

## 💬 Review Comments

### Types of Comments

#### 1. **Blocking (Must Fix)**

````markdown
**[BLOCKER]** This endpoint is missing authentication check.
Anyone can access it without login.

```typescript
// ❌ Missing authentication
app.delete('/api/users/:id', deleteUserHandler);

// ✅ Add authentication
app.delete('/api/users/:id', authenticate, deleteUserHandler);
```
````

````

#### 2. **Suggestion (Nice to Have)**
```markdown
**[SUGGESTION]** Consider extracting this logic into a separate function
for better testability and reusability.

```typescript
// Instead of
const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

// Extract to
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
````

````

#### 3. **Nitpick (Style/Preference)**
```markdown
**[NITPICK]** Variable name could be more descriptive.

```typescript
// Instead of
const x = await getOrders()

// Use
const customerOrders = await getOrders()
````

````

#### 4. **Question (Clarification)**
```markdown
**[QUESTION]** Why are we using `setTimeout` here instead of a proper queue?
Could this cause memory leaks under high load?
````

#### 5. **Praise (Positive Feedback)**

```markdown
**[PRAISE]** Excellent test coverage! I like how you tested all edge cases.
```

---

### Comment Best Practices

**DO**:
✅ Be specific ("This function should validate email format")  
✅ Explain why ("Using a Set here would be O(1) instead of O(n)")  
✅ Suggest alternatives (show code example)  
✅ Praise good code ("Great abstraction!")  
✅ Ask questions ("Why did you choose this approach?")

**DON'T**:
❌ Be vague ("This doesn't look right")  
❌ Be condescending ("Obviously this is wrong")  
❌ Nitpick too much (focus on important issues)  
❌ Rewrite code (suggest, don't dictate)  
❌ Approve without reviewing (just to speed up merge)

---

## ⏱️ Review Timeline

### Response Times

| PR Size                | Expected Review Time       |
| ---------------------- | -------------------------- |
| Small (<100 lines)     | Within 4 hours             |
| Medium (100-300 lines) | Within 1 day               |
| Large (300-500 lines)  | Within 2 days              |
| XL (>500 lines)        | **Break into smaller PRs** |

### Developer Response

- **Address comments within 1 day** of receiving feedback
- **Reply to all comments** (even if just "Fixed")
- **Re-request review** after addressing feedback

---

## 📏 PR Size Guidelines

### Ideal PR Size: **200-300 lines**

**Why?**:

- Easier to review thoroughly
- Less context switching for reviewer
- Faster feedback loop
- Easier to test

### Breaking Down Large PRs

**❌ Bad**: One PR with 2000 lines

```
feature/complete-order-system
├─ Order creation
├─ Payment processing
├─ Inventory management
├─ Notification system
└─ UI changes
```

**✅ Good**: Multiple smaller PRs

```
1. feature/order-domain-models (200 lines)
2. feature/order-repository (150 lines)
3. feature/order-service (250 lines)
4. feature/order-api (180 lines)
5. feature/order-tests (300 lines)
```

Each PR is reviewable in **< 30 minutes**.

---

## 🤖 Automated Checks (CI/CD)

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint # ESLint
      - run: pnpm run format:check # Prettier

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install --frozen-lockfile
      - run: npm run type-check # TypeScript

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci # Jest with coverage
      - name: Check coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=moderate
      - run: pnpm dlx snyk test # Snyk security scan

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build # Ensure builds successfully
```

**Required Checks**:

- ✅ All checks must pass before merge
- ✅ No force-push to override checks
- ✅ Admins también deben pasar checks (no bypass)

---

## 🚫 Common Review Issues

### 1. Missing Tests

```markdown
**[BLOCKER]** No tests for new order calculation logic.

Please add unit tests covering:

- Normal case (multiple items)
- Edge case (empty order)
- Edge case (discount applied)
```

### 2. Poor Error Handling

````markdown
**[BLOCKER]** This async function can throw, but error is not handled.

```typescript
// ❌ Bad
const order = await orderRepo.findById(id);
return order.total; // What if order is null?

// ✅ Good
const order = await orderRepo.findById(id);
if (!order) {
  throw new NotFoundError(`Order ${id} not found`);
}
return order.total;
```
````

````

### 3. Security Issues
```markdown
**[BLOCKER]** SQL injection vulnerability.

```typescript
// ❌ Bad
const query = `SELECT * FROM users WHERE email = '${email}'`
db.query(query)

// ✅ Good
const query = 'SELECT * FROM users WHERE email = $1'
db.query(query, [email])
````

````

### 4. Performance Issues
```markdown
**[SUGGESTION]** N+1 query problem. This will make 100 DB calls for 100 orders.

```typescript
// ❌ Bad
for (const order of orders) {
  order.customer = await getCustomer(order.customerId)  // N queries
}

// ✅ Good
const customerIds = orders.map(o => o.customerId)
const customers = await getCustomersByIds(customerIds)  // 1 query
orders.forEach(order => {
  order.customer = customers.find(c => c.id === order.customerId)
})
````

````

---

## ✅ Approval Criteria

### When to Approve

✅ Code works as intended
✅ Tests are comprehensive
✅ Code quality is good
✅ No security vulnerabilities
✅ Performance acceptable
✅ Documentation updated
✅ All comments addressed

### When to Request Changes

❌ Bugs present
❌ Missing tests
❌ Security issues
❌ Major architectural concerns
❌ Breaking changes not documented
❌ Code quality significantly below standards

### When to Comment (No Approval/Rejection)

💬 Minor suggestions (not blockers)
💬 Questions for clarification
💬 Alternative approaches to consider

---

## 🎓 Review Training

### For New Reviewers

**Week 1-2**: Shadow reviews
- Read PRs being reviewed by seniors
- Compare your thoughts with senior comments
- Ask questions

**Week 3-4**: Co-review
- Review PRs with senior as backup
- Senior provides feedback on your review

**Week 5+**: Independent reviews
- Review PRs independently
- Senior spot-checks your reviews

### Review Practice

**Internal workshops**:
- Monthly "code review workshop"
- Review sample PRs together
- Discuss what to look for
- Share review best practices

---

## 📊 Metrics

### Track Code Review Health

**Response time**:
```sql
-- Average time to first review
SELECT AVG(first_review_at - created_at) FROM pull_requests
WHERE created_at > NOW() - INTERVAL '30 days'

-- Expected: < 4 hours for small PRs
````

**Cycle time**:

```sql
-- Average time from PR creation to merge
SELECT AVG(merged_at - created_at) FROM pull_requests
WHERE merged_at > NOW() - INTERVAL '30 days'

-- Expected: < 2 days
```

**PR size**:

```sql
-- Average PR size (lines changed)
SELECT AVG(additions + deletions) FROM pull_requests
WHERE merged_at > NOW() - INTERVAL '30 days'

-- Expected: < 300 lines
```

---

## 🔧 Tools

### GitHub Settings

```yaml
# Branch protection rules (main)
require_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

require_status_checks:
  strict: true
  contexts:
    - lint
    - type-check
    - test
    - security
    - build

enforce_admins: true
allow_force_pushes: false
allow_deletions: false
```

### Review Tools

| Tool           | Purpose                         |
| -------------- | ------------------------------- |
| **GitHub PR**  | Code review platform            |
| **CodeRabbit** | AI-powered code review          |
| **SonarQube**  | Code quality analysis           |
| **Codecov**    | Test coverage visualization     |
| **Snyk**       | Security vulnerability scanning |

---

**Última actualización**: Diciembre 2025
