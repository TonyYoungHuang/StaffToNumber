import type { BillingMessageCatalog } from "../types";

export const esBillingMessages = {
  reviewNotice: "Los textos de pago siguientes son un borrador de traducción pendiente de revisión profesional. Si hay discrepancias, prevalecen las condiciones en inglés y la página del proveedor de pago.",
  activation: {
    page: { title: "Canjear código de activación", description: "Introduce el código recibido con la compra para activar durante un año el espacio de trabajo de partituras." },
    form: {
      eyebrow: "Canjear código", title: "Convierte la compra en un año de acceso", body: "Introduce el código de activación proporcionado con la compra. Inicia sesión primero para vincular el acceso a tu cuenta actual.",
      devSeed: "Código de demostración de desarrollo", devSeedFootnote: "Solo se muestra en desarrollo local o en un entorno de prueba explícito.", codeLabel: "Código de activación", codePlaceholder: "Introduce el código de activación",
      submit: "Canjear código", submitting: "Canjeando...", fillDemo: "Usar código de demostración", loginFirst: "Inicia sesión antes de canjear un código.", required: "Introduce un código de activación.",
      success: "Código canjeado. Abriendo tus partituras...", footnote: "Un código válido actualiza de inmediato las fechas de acceso de la cuenta.", fallbackError: "No se pudo canjear el código. Inténtalo de nuevo.",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "Estado del lanzamiento de pagos", title: "El pago de producción está completando la verificación con transacciones reales.",
      body: "El sitio de producción no crea pedidos de prueba ni redirige al pago de staging. Este acceso se abrirá cuando los pagos, reembolsos y renovaciones reales superen la verificación final.", continueFree: "Continuar editando gratis",
    },
    page: {
      eyebrow: "Precios por créditos", title: "Elige tu plan de créditos", body: "Cada operación válida completada consume un crédito. Compara precio, funciones y recursos antes de iniciar sesión.",
      promoLabel: "Ahorra con el pago anual", promoValue: "Ahorra aproximadamente un 45 %–49 %", planNote: "Los créditos mensuales se restablecen cada mes y no se acumulan. Ver, controlar la reproducción y hacer ediciones básicas sin enviar no consume créditos.",
    },
    selector: {
      plansAria: "Elegir un plan de créditos", selectedPlan: "Plan seleccionado", continueTemplate: "Continuar con {name} {cycle}", freeEyebrow: "Gratis",
      freeTitle: "Crea gratis tu primera partitura completa", freeBody: "No se requiere pago ni tarjeta. El plan gratuito conserva un proyecto de partitura completo y ofrece créditos cada mes.", freeCta: "Crear una partitura gratis", creditUsage: "Los créditos solo se descuentan al usarlos", includedCapabilities: "Funciones incluidas", benefitsAndResources: "Ventajas y recursos",
    },
    client: {
      checkoutEyebrow: "Pago", title: "Paga en línea y activa el acceso automáticamente", body: "Al completarse el pago, el acceso se activa automáticamente en tu cuenta. Los clientes internacionales no necesitan canjear un código manualmente.",
      provider: "Proveedor de pago", plan: "Tipo de suscripción", individual: "Individual", school: "Plazas para escuela u organización", organization: "Organización de facturación", organizationPlaceholder: "Elige una organización",
      noOrganizations: "Esta cuenta no tiene ninguna organización disponible para facturar.", seats: "Número de plazas", seatsHelp: "Elige entre 2 y 100.000 plazas.",
      stripeTitle: "Stripe", stripeLiveBody: "Adecuado para tarjetas internacionales y monederos digitales.", stripeBuildingBody: "El pago real aún no está conectado. Solo registra la demanda, sin realizar cargos.",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle gestiona pagos internacionales, impuestos y suscripciones.", paddleBuildingBody: "La cuenta comercial real aún espera aprobación. Solo registra la demanda, sin realizar cargos.",
      available: "Disponible", building: "En desarrollo", waiting: "Esperando aprobación de la cuenta comercial", button: "Continuar al pago seguro en esta pestaña", intentButton: "Notificar mi solicitud de compra al responsable",
      loading: "Redirigiendo a la página de pago...", checking: "Comprobando el inicio de sesión...", signInEyebrow: "Inicio de sesión obligatorio", signInTitle: "Inicia sesión antes de elegir un proveedor",
      signInBody: "Continúa con Google o correo electrónico. Tras iniciar sesión permanecerás en esta página para revisar Stripe y Paddle; un proveedor que no esté activo nunca realizará cargos.",
      signInPoints: ["Vincular los créditos a la cuenta correcta", "Permitir solicitudes de compra solo a clientes con sesión iniciada", "Usar Google o correo electrónico"], selectedPlan: "Plan seleccionado",
      accountNote: "Tu cuenta de Google identifica quién recibe la suscripción. Las tarjetas, Google Pay y otros métodos los ofrece el proveedor elegido. El pago se abre en esta pestaña.",
      intentNote: "Antes de continuar, el servidor envía al responsable un correo de intención de compra. Solo un proveedor activo abre el pago; uno en desarrollo nunca realiza cargos.",
      providerBuildingTemplate: "El pago real de {provider} está en desarrollo. El responsable recibió tu solicitud y no se creó ningún cargo.", notificationFailed: "No se pudo avisar al responsable. Inténtalo más tarde. No se creó ningún cargo.",
      fallbackError: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    },
    status: {
      loading: "Comprobando el estado del pago...", pendingTitle: "Confirmando tu pago", pendingBody: "Al completarse el pago, el acceso se activa automáticamente en la cuenta actual.",
      successTitle: "Pago completado y cuenta activada", successBody: "El acceso está listo. Abre tus partituras sin canjear un código manualmente.", cancelledTitle: "El pago se ha cancelado", cancelledBody: "No se registró ningún pago completado. Puedes volver a tus partituras o elegir otro plan.", failedTitle: "El pago no se completó", failedBody: "No se confirmó ningún cambio de acceso. Revisa la página del proveedor o vuelve a intentarlo.", scores: "Abrir mis partituras", jobs: "Abrir tareas", fallbackError: "No se pudo cargar el estado del pago. Inténtalo de nuevo.",
    },
  },
  billing: {
    page: { eyebrow: "Facturación", title: "Gestiona suscripciones, renovaciones, reembolsos y plazas escolares.", body: "El acceso sigue el registro Webhook verificado del proveedor; los fallos de renovación, cancelaciones y reembolsos se reflejan en los permisos." },
    manager: {
      loading: "Cargando datos de facturación...", fallbackError: "No se pudieron cargar los datos de facturación. Inténtalo de nuevo.", signIn: "Inicia sesión para ver la facturación.",
      creditEyebrow: "Saldo de créditos", availableCredits: "Créditos disponibles este mes", creditUnit: "créditos", creditSummaryTemplate: "{limit} créditos este mes; {used} utilizados.", creditUsage: "Créditos usados este mes", storage: "Almacenamiento de archivos",
      quotaNote: "Cada operación válida completada consume un crédito. Los créditos se restablecen mensualmente y no se acumulan.",
      freeEyebrow: "Estado del acceso gratuito", noPaidTitle: "No hay ningún plan de pago activo", freeBody: "Una cuenta gratuita conserva un proyecto para siempre creado a partir de un PDF multipágina completo o una imagen de partitura, con corrección, reproducción, transporte, Jianpu, uso compartido y exportación; la asignación gratuita es {credits}.", unlock: "Activar acceso completo",
      subscriptionsEyebrow: "Suscripciones", subscriptionsTitle: "Acceso y estado de renovación", manageStripe: "Gestionar método de pago de Stripe", managingStripe: "Abriendo Stripe...", noSubscriptions: "No hay suscripciones vinculadas a esta cuenta.",
      currentPeriodEndsTemplate: "El periodo actual termina el {date}", noFixedEnd: "Sin fecha fija de finalización", renewalFailed: "La última renovación falló. Actualiza el método de pago.", cancellationScheduled: "La cancelación está programada para el final de este periodo.",
      seatsTemplate: "{count} plazas", cancel: "Cancelar al final del periodo", canceling: "Cancelando...", cancelSuccess: "La suscripción se cancelará al final del periodo de facturación actual.",
      memberEmail: "Correo del miembro", memberEmailPlaceholder: "member@example.com", assignSeat: "Asignar plaza", assigningSeat: "Asignando...", revoke: "Revocar", revoking: "Revocando...",
      invoicesEyebrow: "Facturas", invoicesTitle: "Pagos, reembolsos y fallos", noInvoices: "Todavía no hay facturas.", invoicePaidTemplate: "Pagada el {date}", invoiceDueTemplate: "Vence el {date}", invoiceFailedTemplate: "Falló el {date}", refundedTemplate: "reembolsado {amount}", viewInvoice: "Ver factura", amountPending: "Importe pendiente",
      subscriptionStatuses: { trialing: "En prueba", active: "Activa", past_due: "Vencida", paused: "Pausada", unpaid: "Impagada", incomplete: "Incompleta", cancelled: "Cancelada" },
      invoiceStatuses: { draft: "Borrador", open: "Pendiente", paid: "Pagada", failed: "Fallida", void: "Anulada", refunded: "Reembolsada" },
      quotaTiers: { free: "Gratis", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "Gratis", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "Para siempre", monthly: "Mensual", annual: "Anual" },
    badges: { free: "Gratis para siempre", "starter-monthly": "Mensual flexible", "starter-annual": "Starter anual", "converter-pro-monthly": "Mayor capacidad", "converter-pro-annual": "Alta capacidad anual" },
    audiences: {
      free: "Usa todas las herramientas actuales de proyecto con una partitura completa", "starter-monthly": "Para quienes procesan partituras personales con regularidad", "starter-annual": "Para uso individual prolongado con menor coste por crédito",
      "converter-pro-monthly": "Para quienes procesan más partituras cada mes", "converter-pro-annual": "Para procesar partituras personales de forma frecuente y sostenida",
    },
    ctas: { free: "Crear una partitura gratis", "starter-monthly": "Elegir Starter mensual", "starter-annual": "Elegir Starter anual", "converter-pro-monthly": "Elegir Converter Pro mensual", "converter-pro-annual": "Elegir Converter Pro anual" },
    unitPriceTemplate: "{unitPrice} por crédito", freeUnitPriceTemplate: "{projectCount} proyecto de partitura completo", creditsTemplate: "{monthlyCredits} créditos / mes", freeCreditsTemplate: "{projectCount} partitura completa · {monthlyCredits} créditos / mes",
    benefits: {
      freeProject: "Crear {projectCount} proyecto de partitura completo para siempre", moreThanFreeProject: "Superar el límite de {projectCount} proyecto gratuito", starterIncluded: "Todas las funciones actuales de Starter", starterMonthlyIncluded: "Todas las funciones actuales de Starter mensual", converterMonthlyIncluded: "Todas las funciones actuales de Converter Pro mensual",
      editor: "Editor en línea, generador de copias de parte Beta y colaboración en tiempo real Beta", practice: "Reproducción, grabación en el navegador y comentarios de práctica Beta, además de transporte inteligente", conversion: "Conversión pentagrama ↔ Jianpu y MusicXML ↔ MIDI",
      exports: "Exportación PDF/SVG/PNG y WAV/MP3 cuando el renderizador correspondiente esté disponible", freeExports: "Usar en la partitura gratuita las exportaciones y herramientas de proyecto publicadas",
    },
    resources: {
      monthlyCredits: "{monthlyCredits} créditos al mes", monthlyCreditsReset: "{monthlyCredits} créditos mensuales, restablecidos cada mes", storage: "{storage} GB de almacenamiento", personalLibrary: "Biblioteca personal, historial de revisiones y catálogo abierto",
      monthlyRenewal: "Renovación mensual sin compromiso prolongado", annualSavings: "Ahorra {annualSavings} frente a doce pagos mensuales", freeLibrary: "Biblioteca abierta y descargas CC0", noCard: "Sin tarjeta; conserva el proyecto gratuito",
    },
  },
} satisfies BillingMessageCatalog;
