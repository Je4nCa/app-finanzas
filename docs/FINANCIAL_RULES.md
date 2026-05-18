# Financial Rules

# Core Principle

The app revolves around monthly financial tracking.

Everything must be calculated monthly.

---

# Credit Card Logic

Each card must contain:
- bank
- name
- limit
- closing date
- payment date
- currency
- owner

---

# Monthly Payment Logic

The app must calculate:
- total monthly payment
- fixed expenses
- installment payments
- regular expenses
- pending balances

---

# Installment Logic

IMPORTANT:

Installments are NOT simple static records.

The system must generate real monthly entries.

Example:

MacBook Pro
24 installments

April 2026:
- installment 1/24

May 2026:
- installment 2/24

June 2026:
- installment 3/24

Each monthly installment must:
- exist independently
- appear in reports
- appear in dashboards
- affect card totals
- disappear automatically after completion

---

# Shared Expenses

Supported types:
- 50/50
- custom percentages
- one person pays all
- fixed amounts

---

# Currency Rules

Supported currencies:
- CRC
- USD

Rules:
- automatic conversion
- historical exchange rates
- store conversion rate per transaction

---

# Monthly Ledger Engine

Each month must aggregate:
- installment payments
- fixed expenses
- variable expenses
- card balances
- shared balances

This is the heart of the application.