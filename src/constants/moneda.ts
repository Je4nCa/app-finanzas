export const TIPO_CAMBIO_DEFAULT        = 520
export const TIPO_CAMBIO_COMPRA_DEFAULT = 515
export const TIPO_CAMBIO_VENTA_DEFAULT  = 520

export const FORMATO_MONEDA: Record<string, Intl.NumberFormatOptions> = {
  USD: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
  CRC: { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 },
}
