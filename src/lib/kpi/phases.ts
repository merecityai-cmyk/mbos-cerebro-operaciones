export interface KpiItem {
  key: string
  label: string
}

export interface KpiPhase {
  key: string
  label: string
  color: string
  items: KpiItem[]
  optional?: boolean // only shown when client config enables it
}

export const KPI_PHASES: KpiPhase[] = [
  {
    key: 'ingresos',
    label: 'Ingresos',
    color: '#1E40AF',
    items: [
      { key: 'facturacion', label: 'Facturación (basada en información del cliente / extracto)' },
      { key: 'registro_ingresos', label: 'Registro de ingresos' },
      { key: 'ingresos_por_identificar', label: 'Gestión de ingresos por identificar' },
      { key: 'compartir_cliente', label: 'Compartir información al cliente para identificación' },
      { key: 'recibos_caja', label: 'Recibos de caja de ingresos' },
      { key: 'relacionar_banco', label: 'Relacionar en banco' },
      { key: 'cierre_ingresos', label: 'Cierre fase de ingresos' },
    ],
  },
  {
    key: 'gastos',
    label: 'Gastos',
    color: '#7C3AED',
    items: [
      { key: 'descargar_radial', label: 'Descargar el radial / extracto bancario' },
      { key: 'identificar_gastos', label: 'Identificar gastos en extractos o movimientos' },
      { key: 'socializar_gastos', label: 'Socializar gastos por identificar al cliente' },
      { key: 'llenar_excel', label: 'Llenar cuadro de Excel con gastos' },
      { key: 'cierre_gastos', label: 'Cierre identificación de gastos' },
    ],
  },
  {
    key: 'documentos_soporte',
    label: 'Documentos Soporte',
    color: '#0891B2',
    optional: true,
    items: [
      { key: 'doc_cuentas_cobro', label: 'Documentos soporte — cuentas de cobro' },
      { key: 'doc_facturas_extranjero', label: 'Documentos soporte — facturas del extranjero' },
    ],
  },
  {
    key: 'nomina',
    label: 'Nómina',
    color: '#D97706',
    optional: true,
    items: [
      { key: 'solicitar_novedades', label: 'Solicitar novedades de nómina (3 días previo)' },
      { key: 'nominas_electronicas', label: 'Realizar nóminas electrónicas' },
      { key: 'novedades_seg_social', label: 'Entregar novedades al área de Seguridad Social' },
    ],
  },
  {
    key: 'seguridad_social',
    label: 'Seguridad Social',
    color: '#059669',
    items: [
      { key: 'recepcion_novedades', label: 'Recepción formato de novedades' },
      { key: 'recepcion_nomina', label: 'Recepción nómina electrónica' },
      { key: 'desarrollo_seg_social', label: 'Desarrollo de Seguridad Social' },
      { key: 'marcar_novedades', label: 'Marcar novedades del mes (realizadas / pendientes)' },
    ],
  },
]

/**
 * Returns the phases applicable for a given client config.
 */
export function getClientPhases(opts: {
  hasNomina: boolean
  hasDocumentosSoporte: boolean
}): KpiPhase[] {
  return KPI_PHASES.filter((phase) => {
    if (phase.key === 'nomina') return opts.hasNomina
    if (phase.key === 'documentos_soporte') return opts.hasDocumentosSoporte
    return true
  })
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
