import { formatMessage, type SupportedLocale, type MessageVariables } from "@score/i18n";

const spanish: Record<string, string> = {
  "Admin API key": "Clave API de administración",
  "Use the `ADMIN_API_KEY` configured in services/api. The key stays only in this page's memory.": "Usa la clave ADMIN_API_KEY configurada en services/api. Solo permanece en la memoria de esta página.",
  "Reuse the `ADMIN_API_KEY` configured in services/api. The key stays only in this page's memory.": "Usa la clave ADMIN_API_KEY configurada en services/api. Solo permanece en la memoria de esta página.",
  "Load recent codes": "Cargar códigos recientes", "Quantity": "Cantidad", "Entitlement days": "Días de acceso", "Prefix": "Prefijo", "Batch note": "Nota del lote", "Expires at (optional)": "Vencimiento (opcional)",
  "Generate codes": "Generar códigos", "Generating...": "Generando…", "Recent activation codes": "Códigos de activación recientes", "Latest generated batch": "Último lote generado", "Copy latest batch": "Copiar último lote",
  "No data yet. Enter the admin API key, then load or generate activation codes.": "Todavía no hay datos. Introduce la clave de administración y carga o genera códigos de activación.",
  "Enter the admin API key first.": "Introduce primero la clave API de administración.", "Recent activation codes loaded.": "Se han cargado los códigos de activación recientes.",
  "Codes generated: {count}.": "Códigos generados: {count}.", "Latest batch copied.": "Último lote copiado.", "Status": "Estado", "Created at": "Fecha de creación", "Expires at": "Vencimiento", "Note": "Nota", "Batch": "Lote", "Days": "Días",
  "Select and copy the text below.": "Selecciona y copia el texto siguiente.", "Disable {code}?": "¿Deshabilitar {code}?", "1 Admin access": "1 Acceso de administración", "2 Generate order codes": "2 Generar códigos de pedido",
  "Plans match the website. Access lasts 1 or 12 calendar months from redemption; same-tier codes extend access. No automatic charge.": "Los planes coinciden con los del sitio. El acceso dura 1 o 12 meses naturales desde el canje; los códigos del mismo nivel amplían el acceso. No hay cargos automáticos.",
  "Website plan": "Plan del sitio", "Sales channel": "Canal de venta", "Shop (optional)": "Tienda (opcional)", "Order reference": "Referencia del pedido", "Download CSV": "Descargar CSV", "Delivery text": "Texto de entrega",
  "Search code, shop, order or batch (up to 200)": "Buscar código, tienda, pedido o lote (hasta 200)", "Search / refresh": "Buscar / actualizar", "Redeemed": "Canjeado", "Copy delivery text": "Copiar texto de entrega", "Disable unused code": "Deshabilitar código sin usar",
  "Complaint queue refreshed.": "Cola de reclamaciones actualizada.", "Case update saved to the immutable event history.": "Actualización guardada en el historial inmutable del caso.", "All": "Todos",
  "The admin key stays only in this page's memory and is cleared on refresh or close.": "La clave de administración solo permanece en la memoria de esta página y se elimina al actualizarla o cerrarla.",
  "Refresh queue": "Actualizar cola", "Current list": "Lista actual", "Initial response overdue": "Primera respuesta fuera de plazo", "Complaint queue": "Cola de reclamaciones", "Refresh the queue to begin.": "Actualiza la cola para empezar.",
  "Select a complaint to inspect materials and history.": "Selecciona una reclamación para consultar la documentación y el historial.", "Rights basis": "Fundamento de los derechos", "Signature": "Firma", "Response due": "Plazo de respuesta", "Original work": "Obra original", "Target URLs": "URL objeto de la reclamación", "Evidence and request": "Pruebas y solicitud", "Next status": "Siguiente estado", "Public claimant message": "Mensaje público para la persona reclamante", "Internal note (never public)": "Nota interna (nunca pública)", "Action taken": "Medida tomada", "Save case update": "Guardar actualización", "Complete event history": "Historial completo del caso",
  "Security audit events refreshed.": "Eventos de auditoría de seguridad actualizados.", "Delete security audit events older than {days} days?": "¿Eliminar los eventos de auditoría de seguridad de hace más de {days} días?", "Expired events removed: {count}.": "Eventos caducados eliminados: {count}.",
  "Event type": "Tipo de evento", "Severity": "Gravedad", "Outcome": "Resultado", "Refresh audit": "Actualizar auditoría", "Prune expired": "Eliminar caducados", "The admin key stays only in this page's memory.": "La clave de administración solo permanece en la memoria de esta página.",
  "24h events": "Eventos de las últimas 24 horas", "Errors": "Errores", "Denied": "Acceso denegado", "Uploads": "Subidas", "Security events": "Eventos de seguridad", "No events match the current filters.": "Ningún evento coincide con los filtros actuales.", "Event details": "Detalles del evento",
  "Search data loaded.": "Datos de búsqueda cargados.", "The import content is not valid JSON.": "El contenido de importación no es un JSON válido.", "Immutable SEO snapshot imported.": "Instantánea SEO inmutable importada.", "The content manifest is not valid JSON.": "El manifiesto de contenido no es un JSON válido.", "Content manifest registered; approvals for changed pages are now stale.": "Manifiesto registrado; las aprobaciones de las páginas modificadas ya no son válidas.", "Enter the real reviewer name or team identity.": "Introduce el nombre real de la persona o equipo revisor.", "The current content version is approved.": "Versión actual del contenido aprobada.", "Changes requested.": "Se han solicitado cambios.",
  "Historical snapshot": "Instantánea histórica", "Latest snapshot": "Última instantánea", "Refresh data": "Actualizar datos", "Content versions and human publication approval": "Versiones de contenido y aprobación humana de publicación",
  "Download the manifest from /seo-audit/report and import it here. Approval is bound to a SHA-256 content hash and expires when claims or evidence change.": "Descarga el manifiesto desde /seo-audit/report e impórtalo aquí. La aprobación está vinculada al hash SHA-256 del contenido y pierde validez cuando cambian las afirmaciones o las pruebas.",
  "Reviewer": "Persona revisora", "Name or team identity": "Nombre o identidad del equipo", "Audit manifest JSON": "JSON del manifiesto de auditoría", "Register content versions": "Registrar versiones de contenido", "No feature-page content manifest has been registered.": "No se ha registrado ningún manifiesto de contenido de páginas de funciones.",
  "Official data import": "Importación de datos oficiales", "Import a normalized JSON snapshot": "Importar una instantánea JSON normalizada", "Import snapshot": "Importar instantánea", "Restore example": "Restaurar ejemplo", "Search performance": "Rendimiento en búsquedas", "Clicks": "Clics", "Impressions": "Impresiones", "Average position": "Posición media", "Queries": "Consultas", "No query data.": "No hay datos de consultas.", "Pages": "Páginas", "No page data.": "No hay datos de páginas.", "Indexing issues": "Problemas de indexación", "No indexing issues in this snapshot.": "No hay problemas de indexación en esta instantánea.",
  "Facts checked": "Hechos comprobados", "Duplication checked": "Duplicación comprobada", "Evidence checked": "Pruebas comprobadas", "Review notes or requested changes": "Notas de revisión o cambios solicitados", "Approve current version": "Aprobar versión actual", "Request changes": "Solicitar cambios",
  "Load requests": "Cargar solicitudes", "Status filter": "Filtro de estado", "No support requests yet. Submit one on the public support page first if you want to test the flow.": "Todavía no hay solicitudes de soporte. Aparecerán aquí cuando se envíen desde el formulario público.", "Support requests loaded: {count}.": "Solicitudes de soporte cargadas: {count}.", "Support request status updated.": "Estado de la solicitud actualizado.", "Support request list": "Lista de solicitudes de soporte", "Open public support page": "Abrir página pública de soporte", "Contact name": "Nombre de contacto", "Contact email": "Correo de contacto", "Account email": "Correo de la cuenta", "Job reference": "Referencia de la tarea", "Source": "Origen", "Subject": "Asunto", "Message": "Mensaje", "Created": "Creado", "Updated": "Actualizado", "Locale": "Idioma", "Category": "Categoría",
  "Activation admin": "Administración de activaciones", "Generate, copy, and manage activation codes.": "Genera, copia y gestiona códigos de activación.", "Use this console to generate activation-code batches and distribute them to mainland China users. Requests are protected by `ADMIN_API_KEY`.": "Genera lotes de códigos de activación para su distribución a clientes de China continental. Las solicitudes están protegidas por ADMIN_API_KEY.",
  "Copyright operations": "Gestión de derechos de autor", "Copyright complaint desk": "Gestión de reclamaciones de derechos de autor", "Security operations": "Operaciones de seguridad", "Security audit and request tracing": "Auditoría de seguridad y seguimiento de solicitudes", "SEO operations": "Operaciones SEO", "Content approval, search performance, and indexing issues": "Aprobación de contenido, rendimiento en búsquedas y problemas de indexación",
  "Approve AI TDK content by version hash, import Search Console, Baidu, or Bing snapshots, and review queries, CTR, position, and indexing issues.": "Aprueba títulos, descripciones y palabras clave generados con IA según el hash de versión, importa instantáneas de Search Console, Baidu o Bing y revisa consultas, CTR, posición e indexación.",
  "Support admin": "Administración de soporte", "Review support requests, filter by status, and update handling progress.": "Revisa solicitudes de soporte, filtra por estado y actualiza su progreso.", "Use this console to inspect support requests submitted from the public support form and update their status with `ADMIN_API_KEY`.": "Consulta las solicitudes del formulario público de soporte y actualiza su estado con ADMIN_API_KEY.",
  "Public": "Público", "Internal": "Interno", "Action": "Medida", "Due": "Vencimiento", "Not set": "Sin especificar", "Position": "Posición", "Other": "Otro", "Taobao": "Taobao", "Xiaohongshu": "Xiaohongshu", "Request": "Solicitud", "Trace": "Traza",
};

export function adminText(locale: SupportedLocale, text: string, values: MessageVariables = {}) {
  return formatMessage(locale === "es" ? spanish[text] ?? text : text, values);
}

const statuses: Record<string, readonly [string, string]> = {
  available: ["Available", "Disponible"],
  all: ["All", "Todos"], open: ["Open", "Abierta"], in_review: ["In review", "En revisión"], resolved: ["Resolved", "Resuelta"], closed: ["Closed", "Cerrada"], received: ["Received", "Recibida"], validating: ["Validating", "En validación"], info_required: ["Information required", "Información necesaria"], reviewing: ["Reviewing", "En revisión"], actioned: ["Action taken", "Medida tomada"], rejected: ["Rejected", "Rechazada"], new: ["New", "Nueva"], approved: ["Approved", "Aprobada"], changes_requested: ["Changes requested", "Cambios solicitados"], info: ["Information", "Información"], warning: ["Warning", "Advertencia"], error: ["Error", "Error"], success: ["Success", "Correcto"], denied: ["Denied", "Denegado"], failed: ["Failed", "Fallido"], unused: ["Unused", "Sin usar"], redeemed: ["Redeemed", "Canjeado"], expired: ["Expired", "Caducado"], disabled: ["Disabled", "Deshabilitado"], revoked: ["Revoked", "Revocado"], payment: ["Payment", "Pago"], activation: ["Activation", "Activación"], job: ["Upload / result", "Subida / resultado"], privacy: ["Privacy", "Privacidad"], general: ["General", "General"],
};

/** Display labels only; API and select values keep their stable identifiers. */
export function adminStatus(locale: SupportedLocale, status: string) {
  return locale === "en" || locale === "es" ? statuses[status]?.[locale === "en" ? 0 : 1] ?? status : status;
}

export function adminPlanName(locale: SupportedLocale, code: string) {
  const name = code.startsWith("converter-pro") ? "Converter Pro" : "Starter";
  const duration = code.endsWith("annual") ? (locale === "es" ? "1 año" : "1 year") : (locale === "es" ? "1 mes" : "1 month");
  return `${name} · ${duration}`;
}

export function getAdminMessages(locale: SupportedLocale) {
  return {
    text: locale === "es" ? spanish : {},
    statuses: Object.fromEntries(Object.keys(statuses).map((status) => [status, adminStatus(locale, status)])),
    month: locale === "es" ? "1 mes" : "1 month",
    year: locale === "es" ? "1 año" : "1 year",
  };
}
