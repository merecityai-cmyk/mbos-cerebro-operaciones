/**
 * Reglas de routing por defecto — Johan Pérez NEX.
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
    // Edición de video → Editor
    keywords: [
      'edición',
      'edicion',
      'video',
      'reels',
      'reel',
      'corte',
      'montaje',
      'editar',
      'render',
      'subtítulos',
      'subtitulos',
    ],
    advisorName: 'Editor',
  },
  {
    // Contenido / redes sociales → Sari
    keywords: [
      'contenido',
      'post',
      'publicación',
      'publicacion',
      'redes',
      'instagram',
      'feed',
      'stories',
      'tiktok',
      'copy',
      'calendario de contenido',
      'parrilla',
      'carrusel',
    ],
    advisorName: 'Sari',
  },
  {
    // Agendamiento / reuniones → Vanina
    keywords: [
      'agendar',
      'agenda',
      'agendamiento',
      'cita',
      'reunión',
      'reunion',
      'llamada',
      'llamar',
      'zoom',
      'meet',
      'recordatorio',
    ],
    advisorName: 'Vanina',
  },
  {
    // WhatsApp / automatización → SellerChat
    keywords: [
      'whatsapp',
      'sellerchat',
      'automatización',
      'automatizacion',
      'bot',
      'flujo',
      'respuesta automática',
      'respuesta automatica',
      'chatbot',
      'activar sistema',
    ],
    advisorName: 'SellerChat',
  },
  {
    // Pauta / ads → Tráfico
    keywords: [
      'pauta',
      'ads',
      'publicidad',
      'campaña',
      'campana',
      'meta ads',
      'facebook ads',
      'inversión',
      'inversion',
      'tráfico',
      'trafico',
      'presupuesto',
      'anuncio',
    ],
    advisorName: 'Tráfico',
  },
  {
    // Cobros / facturas → Johan
    keywords: [
      'cobro',
      'factura',
      'pago',
      'deuda',
      'pendiente de pago',
      'cobrar',
      'cuenta de cobro',
      'transferencia',
    ],
    advisorName: 'Johan',
  },
]
