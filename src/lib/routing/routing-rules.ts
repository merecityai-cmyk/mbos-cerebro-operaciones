/**
 * Reglas de routing por defecto.
 * Estas se usan como fallback si la DB no tiene reglas configuradas,
 * o si una keyword no tiene match en la tabla task_routing_rules.
 *
 * Prioridad: DB > DEFAULT_RULES > assignedAdvisorId del cliente
 */

export interface DefaultRoutingRule {
  keywords: string[]
  advisorName: string
}

export const DEFAULT_RULES: DefaultRoutingRule[] = [
  {
    // Impuestos / DIAN → Norexis
    keywords: [
      'impuestos',
      'dian',
      'retención',
      'retencion',
      'retenciones',
      'declaración de renta',
      'declaracion de renta',
      'renta',
      'iva',
      'tributario',
      'tributaria',
      'exógena',
      'exogena',
      'medios magnéticos',
      'medios magneticos',
    ],
    advisorName: 'Norexis',
  },
  {
    // Seguridad social / nómina → Laura
    keywords: [
      'seguridad social',
      'pila',
      'eps',
      'pensión',
      'pension',
      'pensiones',
      'arl',
      'planilla',
      'parafiscales',
      'nómina',
      'nomina',
      'liquidación de nómina',
      'liquidacion de nomina',
      'cesantías',
      'cesantias',
      'prima',
      'vacaciones',
    ],
    advisorName: 'Laura',
  },
  {
    // Dirección / gerencia → Juan Diego
    keywords: ['juan diego', 'dirección', 'direccion', 'gerencia', 'gerente'],
    advisorName: 'Juan Diego',
  },
]
