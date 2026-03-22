# Mirai Wallet API

Production-ready REST API for Mirai Wallet built with **Node.js**, **Express**, **Sequelize** and **JWT** authentication.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| ORM | Sequelize 6 |
| Database | **MySQL 8+** (`mysql2` driver) |
| Auth | JSON Web Tokens (access + refresh) |
| Passwords | bcryptjs |
| Validation | express-validator |
| Security | helmet, cors |
| Logging | winston |
| Testing | Vitest + supertest |

---

## Architecture

```
src/
├── config/
│   ├── env.js          # Single source of truth for all env variables
│   └── database.js     # Sequelize MySQL instance + connectDatabase()
│
├── models/             # Sequelize models (one file per table)
│   ├── User.js
│   ├── Account.js
│   ├── Category.js
│   ├── Transaction.js
│   ├── Alert.js
│   ├── Budget.js
│   └── index.js        # Registers all models + defines associations
│
├── services/           # Business logic — no HTTP, no req/res
│   ├── auth.service.js
│   ├── account.service.js
│   ├── category.service.js
│   ├── transaction.service.js
│   ├── alert.service.js
│   ├── budget.service.js
│   └── stats.service.js
│
├── controllers/        # HTTP adapter — calls service, returns ApiResponse
│   └── *.controller.js
│
├── routes/             # Express routers — wires validators + controllers
│   ├── index.js        # Central registry (all routes mount here)
│   └── *.routes.js
│
├── middlewares/
│   ├── auth.middleware.js       # authenticate + authorize(roles)
│   ├── error.middleware.js      # Global error handler + 404 handler
│   ├── validate.middleware.js   # express-validator result checker
│   └── ownership.middleware.js  # Resource ownership guard
│
├── validators/         # express-validator chain definitions
│   └── *.validators.js
│
├── utils/
│   ├── ApiError.js     # Operational error class with factory helpers
│   ├── ApiResponse.js  # Consistent JSON response shape
│   ├── jwt.js          # sign / verify access + refresh tokens
│   ├── logger.js       # Winston logger (dev=pretty, prod=JSON)
│   └── pagination.js   # Parse ?page=&limit= → Sequelize offset/limit
│
├── scripts/
│   ├── create-db.sql   # One-time MySQL database + grants setup
│   ├── seed.js         # Dev seed (npm run db:seed)
│   └── migrate.js      # Explicit sync script (npm run db:migrate)
│
├── app.js              # Express factory (createApp)
└── server.js           # Bootstrap: DB connect → app.listen

tests/
├── helpers/
│   ├── setup.js        # MySQL test DB init/teardown (force: true)
│   └── factories.js    # Test data factories
├── unit/               # Service + utility unit tests
└── integration/        # HTTP-level tests via supertest
```

---

## DB_ALTER — sync behaviour

Controlled by `DB_ALTER` in `.env`:

| Value | Sequelize sync | Use when |
|---|---|---|
| `true` | `sync({ alter: true })` | Development — safe column migrations via ALTER TABLE |
| `false` | `sync({ alter: false })` | Production — only CREATE TABLE IF NOT EXISTS |

Tests always use `sync({ force: true })` against `mirai_wallet_test` for clean isolation.

---

## Quick start

### 1. MySQL setup (run once)

```bash
# Create both databases and grant privileges
mysql -u root -p < src/scripts/create-db.sql
```

### 2. Install & configure

```bash
npm install
cp .env.example .env
# Edit .env — set DB_USER, DB_PASSWORD to match your MySQL
```

### 3. Run

```bash
npm run dev           # Starts on :3000, auto-syncs schema (DB_ALTER=true)
npm run db:seed       # Populates demo data
# Demo credentials: carlos@miraiWallet.com / Password1
```

### 4. Test

Tests require the `mirai_wallet_test` database (already created by `create-db.sql`).  
Override connection details with `TEST_DB_*` env vars if your MySQL setup differs from the defaults.

```bash
npm test              # All 112 tests
npm run test:coverage # With lcov + html report
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login → access + refresh tokens |
| POST | `/auth/refresh` | ❌ | Rotate tokens |
| POST | `/auth/logout` | ✅ | Revoke refresh token |
| GET  | `/auth/me` | ✅ | Get profile |
| PATCH | `/auth/me` | ✅ | Update name |
| PATCH | `/auth/me/password` | ✅ | Change password |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List user accounts |
| POST | `/accounts` | Create account |
| GET | `/accounts/:id` | Get account |
| PATCH | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Soft-delete account |

### Categories

CRUD at `/categories` — same pattern as accounts.

### Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions` | List (paginated, filterable) |
| POST | `/transactions` | Create + auto-update account balance |
| GET | `/transactions/:id` | Get with account + category |
| PATCH | `/transactions/:id` | Update + rebalance account |
| DELETE | `/transactions/:id` | Delete + revert balance |
| GET | `/transactions/summary/monthly?year=2024` | 12-month income/expense/net |
| GET | `/transactions/summary/categories?month=2024-03` | Spending by category |

### Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts` | List active (non-dismissed) |
| GET | `/alerts/unread-count` | Unread badge count |
| PATCH | `/alerts/:id/read` | Mark as read |
| DELETE | `/alerts/:id` | Dismiss alert |
| DELETE | `/alerts/dismiss-all` | Dismiss all |

### Budgets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/budgets?month=2024-03` | List with real spending + pct |
| PUT | `/budgets` | Create or update (upsert) |
| DELETE | `/budgets/:id` | Delete budget |

### Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/dashboard` | Balance, income, expenses, breakdowns |

### Health

```
GET /api/v1/health  →  { status: "ok", timestamp: "..." }
```

---

## Response shape

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 87, "totalPages": 5, "hasNext": true, "hasPrev": false }
}
```

**Error:**
```json
{ "success": false, "error": { "message": "...", "details": [...] } }
```

---

## Test coverage

```
tests/unit/
  utils.test.js             ApiError, ApiResponse, jwt, pagination   (20 tests)
  auth.service.test.js      register, login, refresh, logout, pw     (12 tests)
  account.service.test.js   CRUD + soft-delete + totalBalance        (10 tests)
  category.service.test.js  CRUD + default guard + conflict          (8 tests)
  transaction.service.test.js create/update/delete + summary         (12 tests)
  alert.service.test.js     list, read, dismiss, count               (8 tests)
  budget.service.test.js    upsert, spending calc, remove            (8 tests)
  middleware.test.js        authenticate, authorize, errorHandler     (10 tests)

tests/integration/
  auth.routes.test.js       register, login, me, refresh, logout     (12 tests)
  transaction.routes.test.js CRUD + filters + summaries              (14 tests)
  alert.routes.test.js      list, read, dismiss, dismiss-all         (8 tests)
  budget.routes.test.js     list, upsert, delete                     (7 tests)
  stats.routes.test.js      dashboard fields + auth                  (3 tests)
────────────────────────────────────────────────────────────────────
  Total:  112 tests
```
