// ─── Tipos compartidos ────────────────────────────────────────────────────────
export type { ID, FechaISO, FechaHoraISO, PeriodoMensual, EstadoCarga, Paginacion, Resultado } from './comunes'

// ─── Moneda ───────────────────────────────────────────────────────────────────
export type { Moneda, TipoCambio, TipoCambioARI, MontoConvertido } from './moneda'

// ─── Categorías ───────────────────────────────────────────────────────────────
export { TipoCategoria } from './categoria'
export type { CategoriaId, Categoria } from './categoria'

// ─── Usuario ──────────────────────────────────────────────────────────────────
export type { Usuario, PerfilPareja } from './usuario'

// ─── Tarjeta ──────────────────────────────────────────────────────────────────
export type { TipoTarjeta, TarjetaCredito, AbonoTarjeta, MontoManualTarjeta, EstadoTarjetaMes } from './tarjeta'

// ─── Salario ──────────────────────────────────────────────────────────────────
export type { Salario } from './salario'

// ─── Gastos ───────────────────────────────────────────────────────────────────
export type { TipoPago, DetalleCompartido, Gasto, GastoFijo, FiltrosGasto } from './gasto'
export { TipoGastoCompartido, TipoRecurrencia } from './gasto'

// ─── Cuotas ───────────────────────────────────────────────────────────────────
export type { PlanCuotas, CuotaMensual, CuotaMensualDetalle } from './cuotas'
export { EstadoCuota } from './cuotas'

// ─── Balance ──────────────────────────────────────────────────────────────────
export type { Balance, BalanceCalculado, BalancePareja } from './balance'

// ─── Ledger ───────────────────────────────────────────────────────────────────
export type {
  SaldoTarjeta,
  ResumenMensual,
  ResumenCategoria,
  ResumenTarjeta,
  LedgerMensual,
  FiltrosLedger,
} from './ledger'
