# Architecture

## General Architecture

Frontend-only application.

Architecture style:
- modular
- feature-based
- scalable
- maintainable

---

# Folder Structure

src/
│
├── components/
├── pages/
├── layouts/
├── hooks/
├── store/
├── services/
├── repositories/
├── database/
├── models/
├── utils/
├── constants/
├── lib/
├── types/
├── styles/
└── router/

---

# State Management

Use Zustand.

Rules:
- separate stores by domain
- avoid giant stores
- derived selectors when possible

Example:
- userStore
- cardStore
- expenseStore
- installmentStore
- dashboardStore

---

# Database Layer

Use Dexie.js.

Structure:
- db.ts
- repositories/
- services/

Repositories:
- direct IndexedDB access

Services:
- business logic

---

# Financial Engine

Main financial systems:
- card calculations
- installment generation
- monthly ledger
- balances
- currency conversion

All financial logic must be isolated from UI.

---

# UI Philosophy

- reusable components
- mobile-first
- premium minimalism
- smooth animations
- visual hierarchy

---

# Performance Rules

- avoid unnecessary renders
- lazy load routes
- memoize expensive calculations
- use selectors
- virtualize long lists if necessary

---

# Future Scalability

Architecture must support:
- Firebase
- Supabase
- cloud sync
- authentication
- push notifications