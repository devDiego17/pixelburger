// Traduce los códigos de error del servidor a mensajes claros. Nunca se muestran detalles técnicos.
const MESSAGES: Record<string, string> = {
  NO_AUTENTICADO: "Tu sesión terminó. Vuelve a entrar.",
  PERFIL_INCOMPLETO: "Termina tu registro para continuar.",
  PERFIL_YA_EXISTE: "Ya tienes una cuenta registrada.",
  NO_AUTORIZADO: "No tienes permiso para hacer esto.",
  DEMASIADOS_INTENTOS: "Hiciste muchos intentos seguidos. Espera un rato y vuelve a probar.",
  DEBES_SER_MAYOR_DE_EDAD: "La Misión Pixel es solo para mayores de 18 años.",
  FALTA_AUTORIZACION_DATOS: "Necesitamos tu autorización para tratar tus datos.",
  ALIAS_OCUPADO: "Ese alias ya lo tiene otro jugador. Prueba con otro.",
  TIENDA_CERRADA: "En este momento no estamos recibiendo pedidos.",
  PEDIDO_INVALIDO: "Revisa tu pedido: algo no está bien.",
  PAGO_INVALIDO: "Elige cómo vas a pagar.",
  TIENES_PEDIDOS_ABIERTOS: "Ya tienes pedidos en curso. Espera a que lleguen para hacer otro.",
  FALTA_DIRECCION: "Escribe la dirección de entrega.",
  FUERA_DE_ZONA: "Todavía no llegamos a ese barrio. Puedes recoger en el local.",
  CANTIDAD_INVALIDA: "Revisa las cantidades.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los productos ya no está disponible.",
  DEMASIADOS_PRODUCTOS: "Son demasiados productos para un solo pedido.",
  PEDIDO_MINIMO: "Tu pedido no alcanza el mínimo.",
  NO_SE_PUEDE_CANCELAR: "Este pedido ya se está preparando y no se puede cancelar desde la app.",
  PEDIDO_NO_EXISTE: "No encontramos ese pedido.",
  PEDIDO_CERRADO: "Ese pedido ya está cerrado.",
  ESTADO_INVALIDO: "Ese cambio de estado no aplica a este pedido.",
  JUGADOR_NO_EXISTE: "No encontramos ese jugador.",
  FALTA_TICKET: "Escribe el número de ticket o factura.",
  NIVEL_NO_ALCANZADO: "Ese jugador todavía no llega a ese nivel.",
  FALTA_MOTIVO: "Escribe el motivo del ajuste.",
  ROL_INVALIDO: "Rol no válido.",
  NO_PUEDES_CAMBIAR_TU_ROL: "No puedes cambiar tu propio rol.",
  CODIGO_MUY_CORTO: "El código debe tener al menos 6 caracteres.",
  CODIGO_INVALIDO: "Ese código no existe o ya venció.",
  CODIGO_AGOTADO: "Ese código ya se agotó.",
  CODIGO_YA_USADO: "Ya canjeaste ese código.",
  PARTIDA_EN_CURSO: "Ya tienes una partida en curso.",
  SIN_FICHAS: "No tienes fichas. Cada pedido te da una.",
  PARTIDA_NO_EXISTE: "No encontramos esa partida.",
  PARTIDA_CERRADA: "Esa partida ya terminó.",
  PREMIO_INVALIDO: "Ese premio no es válido.",
};

export function friendlyError(err: unknown): string {
  const raw = typeof err === "string" ? err : (err as { message?: string })?.message ?? "";
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k));
  if (code) return MESSAGES[code];
  if (/fetch|network|Failed to fetch/i.test(raw)) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  return "Algo salió mal. Inténtalo de nuevo.";
}

export function errorCode(err: unknown): string | null {
  const raw = typeof err === "string" ? err : (err as { message?: string })?.message ?? "";
  return Object.keys(MESSAGES).find((k) => raw.includes(k)) ?? null;
}
