# Git Branching Strategy

## 📋 Propósito

Define la estrategia de branching y workflow de Git para colaboración efectiva, releases estables, y hotfixes rápidos.

---

## 🌳 Branching Model: GitHub Flow (Simplified)

**¿Por qué GitHub Flow?**:

- Simple (menos branches que GitFlow)
- Continuous delivery friendly
- Ideal para microservices
- Rápido feedback loop

**Branches principales**:

1. **`main`** - Production-ready code (always deployable)
2. **`develop`** - Integration branch (staging)
3. **`feature/*`** - Feature development
4. **`hotfix/*`** - Production bug fixes

---

## 📊 Branch Structure

```
main (production)
  │
  ├─ hotfix/fix-payment-timeout
  │
develop (staging)
  │
  ├─ feature/order-summary
  │
  ├─ feature/add-product-reviews
  │
  └─ feature/user-notifications
```

---

## 🔀 Workflow

### 1. Feature Development

**Create feature branch** from `develop`:

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/order-summary
```

**Naming convention**:

- `feature/order-summary`
- `feature/add-product-reviews`
- `bugfix/fix-cart-calculation`
- `refactor/simplify-auth-logic`

**Work on feature**:

```bash
# Make changes
git add .
git commit -m "feat: add order summary endpoint"

# Push to remote
git push origin feature/order-summary
```

**Create Pull Request**:

- Base: `develop`
- Compare: `feature/order-summary`
- Reviewers: Auto-assigned (CODEOWNERS)
- CI/CD runs automatically

**Merge to develop**:

- After 2+ approvals
- All CI checks pass
- Squash and merge (clean history)
- Delete feature branch

---

### 2. Release to Production

**Deploy to staging** (automatic after merge to `develop`):

```bash
# CI/CD auto-deploys develop → staging
```

**Test in staging**:

- Manual QA testing
- Smoke tests
- Performance tests

**Merge to main** (production):

```bash
# Create PR: develop → main
git checkout main
git pull origin main
git merge develop --no-ff
git push origin main
```

**Deploy to production**:

- Manual approval (after testing)
- Blue-green deployment (zero downtime)
- Monitor for issues

---

### 3. Hotfix (Production Bug)

**Create hotfix branch** from `main`:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-payment-timeout
```

**Fix the bug**:

```bash
# Make fix
git add .
git commit -m "fix: increase payment timeout to 30s"
git push origin hotfix/fix-payment-timeout
```

**Create PR to main** (urgent):

- Fast-track review (1 approval)
- Deploy immediately after merge

**Backport to develop**:

```bash
git checkout develop
git merge hotfix/fix-payment-timeout
git push origin develop
```

**Delete hotfix branch**:

```bash
git branch -d hotfix/fix-payment-timeout
git push origin --delete hotfix/fix-payment-timeout
```

---

## 📝 Commit Message Convention (Conventional Commits)

**Format**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance (dependencies, config)
- `perf`: Performance improvement

**Examples**:

```bash
# Feature
git commit -m "feat(order): add order summary endpoint"

# Bug fix
git commit -m "fix(payment): increase timeout to 30s"

# Breaking change
git commit -m "feat(auth): migrate to OAuth2

BREAKING CHANGE: JWT structure changed, clients must update"

# Documentation
git commit -m "docs(api): update order API documentation"

# Refactoring
git commit -m "refactor(order): extract pricing logic to service"

# Tests
git commit -m "test(order): add tests for edge cases"

# Chore
git commit -m "chore: update dependencies"
```

**With scope** (service/module):

```bash
git commit -m "feat(catalog): add product search endpoint"
git commit -m "fix(inventory): handle race condition in stock reservation"
```

---

## 🔒 Branch Protection Rules

### Main Branch

```yaml
Protection rules for 'main': ✅ Require pull request before merging
  - Require 2 approvals
  - Dismiss stale reviews when new commits pushed
  - Require code owner approval

  ✅ Require status checks to pass
  - lint
  - type-check
  - test (coverage >= 80%)
  - security-scan
  - build

  ✅ Require branches to be up to date before merging

  ✅ Require conversation resolution before merging

  ✅ Require signed commits

  ✅ Do not allow force pushes

  ✅ Do not allow deletions
```

### Develop Branch

```yaml
Protection rules for 'develop': ✅ Require pull request before merging
  - Require 1 approval (less strict than main)

  ✅ Require status checks to pass
  - lint
  - test
  - build

  ✅ Do not allow force pushes
```

---

## 🏷️ Tagging & Versioning (Semantic Versioning)

**Format**: `v<major>.<minor>.<patch>`

Examples:

- `v1.0.0` - Initial release
- `v1.1.0` - New feature (backward compatible)
- `v1.1.1` - Bug fix
- `v2.0.0` - Breaking change

**Create tag** (after merging to main):

```bash
# Annotated tag
git tag -a v1.2.0 -m "Release v1.2.0: Order summary feature"
git push origin v1.2.0
```

**Automatic versioning** (based on commits):

```bash
# Install semantic-release
pnpm add -D semantic-release

# .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github"
  ]
}
```

**CI/CD auto-creates tag** based on commit messages:

- `feat: ...` → Minor version bump (1.0.0 → 1.1.0)
- `fix: ...` → Patch version bump (1.1.0 → 1.1.1)
- `BREAKING CHANGE: ...` → Major version bump (1.1.1 → 2.0.0)

---

## 🧹 Branch Cleanup

### Delete Merged Branches (Automatic)

```yaml
# GitHub setting
Automatically delete head branches: ✅ Enabled
```

**Manual cleanup**:

```bash
# Delete local merged branches
git branch --merged main | grep -v "^\*\|main\|develop" | xargs -n 1 git branch -d

# Delete remote merged branches
git fetch --prune
```

---

## 🔄 Keeping Branches Up to Date

### Rebase vs Merge

**Use rebase** for feature branches:

```bash
# Update feature branch with latest develop
git checkout feature/order-summary
git fetch origin
git rebase origin/develop

# If conflicts
git rebase --continue  # After resolving conflicts
# or
git rebase --abort  # Cancel rebase
```

**Use merge** for main/develop:

```bash
# Merge develop to main (preserve history)
git checkout main
git merge develop --no-ff  # No fast-forward (explicit merge commit)
```

**Why rebase for features?**:

- Clean linear history
- Easier to review
- Easier to revert

**Why merge for main/develop?**:

- Preserve branch history
- Track when features merged
- Safer (no rewriting history)

---

## 🚀 Release Workflow

### 1. Feature Freeze

**Before major release**:

```bash
# No new features, only bug fixes
# Create release branch
git checkout -b release/v2.0.0 develop
```

**Test release branch**:

- Deploy to staging
- QA testing
- Bug fixes committed to release branch

---

### 2. Release to Production

```bash
# Merge release to main
git checkout main
git merge release/v2.0.0 --no-ff
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin main --tags

# Backport to develop
git checkout develop
git merge release/v2.0.0
git push origin develop

# Delete release branch
git branch -d release/v2.0.0
```

---

### 3. Post-Release

- Monitor production for issues
- Hotfix if critical bugs found
- Update changelog
- Notify stakeholders

---

## 📊 Git Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Workflow (GitHub Flow)               │
└─────────────────────────────────────────────────────────────┘

main (production)
  │
  │─ v1.0.0 (tag)
  │
  ├─ Merge: develop → main
  │    │
  │    │
develop (staging)
  │    │
  │    ├─ Merge: feature/order-summary → develop
  │    │    │
  │    │    │
feature/order-summary
  │         │
  │         ├─ feat: add order summary endpoint
  │         ├─ test: add order summary tests
  │         └─ docs: update API documentation
  │
  │
  ├─ hotfix/fix-payment-timeout (from main)
  │    │
  │    ├─ fix: increase payment timeout
  │    │
  │    └─ Merge: hotfix → main (fast-track)
  │         └─ Backport: hotfix → develop
  │
  │─ v1.0.1 (tag)
  │
```

---

## 🔧 Git Configuration

### User Config

```bash
# Identity
git config --global user.name "John Doe"
git config --global user.email "john@example.com"

# Editor
git config --global core.editor "code --wait"

# Default branch
git config --global init.defaultBranch main

# Auto-prune deleted remote branches
git config --global fetch.prune true

# Rebase by default (instead of merge) when pulling
git config --global pull.rebase true
```

---

### Commit Signing (GPG)

**Generate GPG key**:

```bash
gpg --gen-key
```

**Configure Git**:

```bash
# List keys
gpg --list-secret-keys --keyid-format LONG

# Configure Git
git config --global user.signingkey <KEY_ID>
git config --global commit.gpgsign true
```

**Signed commit**:

```bash
git commit -S -m "feat: add feature"
```

**Verify**:

```bash
git log --show-signature
```

---

## 🎯 Best Practices

### 1. Small, Focused Commits

**❌ Bad**:

```bash
git commit -m "Fixed stuff"
# Changes: 50 files, 2000 lines
```

**✅ Good**:

```bash
git commit -m "feat(order): add order total calculation"
# Changes: 3 files, 50 lines

git commit -m "test(order): add tests for order total"
# Changes: 1 file, 30 lines
```

---

### 2. Commit Often, Push Frequently

```bash
# Commit every logical change
git commit -m "feat: add endpoint"
git commit -m "test: add tests"
git commit -m "docs: update docs"

# Push at least daily
git push origin feature/order-summary
```

**Benefits**:

- Backup in remote
- Others can see progress
- Easier to revert specific changes

---

### 3. Write Descriptive Commit Messages

**❌ Bad**:

```bash
git commit -m "fix"
git commit -m "update"
git commit -m "WIP"
```

**✅ Good**:

```bash
git commit -m "fix(payment): increase Stripe timeout to 30s

Timeout was too short for large transactions, causing failures.
Increased from 10s to 30s based on Stripe recommendations."
```

---

### 4. Never Commit Secrets

**❌ Never**:

```bash
# .env
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=super-secret-key

git add .env  # ❌ NEVER!
```

**✅ Use .gitignore**:

```bash
# .gitignore
.env
.env.local
*.log
node_modules/
dist/
```

**If secret committed by mistake**:

```bash
# Remove from history (dangerous!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (rewrites history)
git push origin --force --all
```

Better: **Rotate the secret** immediately.

---

### 5. Keep Branches Short-Lived

**Ideal lifetime**: 1-3 days

**Why?**:

- Less merge conflicts
- Faster feedback
- Easier to review

**If branch > 1 week**:

- Break into smaller PRs
- Rebase frequently to stay updated

---

## 🔍 Troubleshooting

### Undo Last Commit (Not Pushed)

```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

---

### Fix Commit Message (Not Pushed)

```bash
git commit --amend -m "New commit message"
```

---

### Resolve Merge Conflicts

```bash
# During rebase
git rebase origin/develop

# Conflict in file.ts
<<<<<<< HEAD
const x = 1
=======
const x = 2
>>>>>>> origin/develop

# Fix manually
const x = 2  # Choose correct version

# Continue
git add file.ts
git rebase --continue
```

---

### Cherry-Pick Commit

```bash
# Apply specific commit from another branch
git cherry-pick <commit-hash>
```

---

### Stash Changes

```bash
# Save work-in-progress
git stash

# Do something else
git checkout main
git pull

# Restore work
git checkout feature/my-feature
git stash pop
```

---

## 📈 Metrics

### Branch Health

```sql
-- Average branch lifetime
SELECT AVG(merged_at - created_at) FROM branches
WHERE merged_at > NOW() - INTERVAL '30 days'

-- Expected: < 3 days
```

### Commit Frequency

```sql
-- Commits per developer per day
SELECT developer, COUNT(*) / 30 as commits_per_day
FROM commits
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY developer

-- Expected: 3-5 commits/day
```

---

## ✅ Checklist

### Before Creating Feature Branch

- [ ] Update local `develop` (`git pull`)
- [ ] Descriptive branch name (`feature/order-summary`)

### Before Committing

- [ ] Run tests (`pnpm test`)
- [ ] Run linter (`pnpm run lint`)
- [ ] Review changes (`git diff`)
- [ ] No secrets in commit

### Before Pushing

- [ ] Commits have descriptive messages
- [ ] Code builds successfully
- [ ] Tests pass locally

### Before Creating PR

- [ ] Branch up to date with `develop`
- [ ] All commits pushed
- [ ] PR description filled out
- [ ] Screenshots added (if UI change)

### Before Merging

- [ ] 2+ approvals
- [ ] All CI checks pass
- [ ] Conflicts resolved
- [ ] PR description accurate

### After Merging

- [ ] Delete feature branch
- [ ] Monitor deployment to staging
- [ ] Notify team (if breaking change)

---

**Última actualización**: Diciembre 2025
