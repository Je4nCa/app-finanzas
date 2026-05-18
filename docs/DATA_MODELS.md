# Data Models

# Main Entities

## User
Represents one app user.

Fields:
- id
- name
- avatar
- preferredCurrency
- color
- createdAt
- updatedAt

---

## CreditCard

Fields:
- id
- bank
- name
- limit
- currency
- closingDate
- paymentDate
- ownerId
- color
- createdAt
- updatedAt

---

## Expense

Fields:
- id
- title
- amount
- currency
- categoryId
- cardId
- userId
- date
- notes
- isShared
- createdAt
- updatedAt

---

## InstallmentPlan

Fields:
- id
- productName
- totalAmount
- installmentCount
- monthlyAmount
- startDate
- endDate
- cardId
- userId
- currency
- createdAt

---

## MonthlyInstallment

Fields:
- id
- installmentPlanId
- installmentNumber
- month
- year
- amount
- status

---

## FixedExpense

Fields:
- id
- title
- amount
- recurrence
- cardId
- userId
- categoryId

---

## Category

Fields:
- id
- name
- emoji
- color
- type

---

## Balance

Fields:
- id
- month
- year
- userId
- amountOwed
- amountPaid

---

## CurrencyRate

Fields:
- id
- usdToCrc
- date