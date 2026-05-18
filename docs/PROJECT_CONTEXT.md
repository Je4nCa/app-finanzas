# Project Context

## Project Name
Mamocitos Financieros

## Overview
Aplicación financiera de pareja enfocada en:
- manejo de tarjetas de crédito
- pagos mensuales
- tasa cero
- gastos compartidos
- balances
- dashboards financieros
- control multi-moneda USD/CRC

La aplicación reemplazará Excel y Notion.

---

# Main Goals

## Financial Tracking
- gastos mensuales
- gastos fijos
- gastos variables
- balances de pareja
- control financiero real

## Credit Card Management
- múltiples tarjetas
- fechas de corte
- fechas de pago
- cálculo automático mensual
- pagos pendientes

## Installment Tracking
- compras a tasa cero
- cuotas automáticas
- tracking cronológico mensual
- progreso visual
- desaparición automática al finalizar

## Shared Expenses
- gastos compartidos
- porcentajes personalizados
- balances automáticos

## Multi Currency
- USD
- CRC
- conversión automática
- histórico de tipo de cambio

---

# Tech Stack

## Frontend
- React
- Vite
- TypeScript
- TailwindCSS

## State Management
- Zustand

## Database
- Dexie.js
- IndexedDB

## Routing
- React Router

## Charts
- Recharts

## Animation
- Framer Motion

## UI Components
- shadcn/ui

---

# Core Principles

- mobile-first
- offline-first
- frontend-only initially
- scalable architecture
- minimalistic premium UI
- fast UX
- modular codebase

---

# Important UX Rules

## Expense Creation
Agregar gastos debe tomar menos de 5 segundos.

## Mobile Experience
Toda la aplicación debe sentirse optimizada para iPhone.

## Financial Clarity
Los dashboards deben ser extremadamente fáciles de entender.

## Visual Categories
Las categorías deben usar:
- emojis
- colores
- iconografía

---

# Main Financial Logic

La lógica central del proyecto gira alrededor de:

## Monthly Ledger Engine

Cada mes debe generar automáticamente:
- cuotas mensuales
- gastos fijos
- balances
- cálculos de tarjetas

---

# Important Notes

NO usar backend inicialmente.

Toda la persistencia debe ser local usando IndexedDB.

La arquitectura debe quedar preparada para:
- Firebase
- Supabase
- sincronización cloud futura