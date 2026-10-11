// La URL y la llave publicable de Supabase son públicas por diseño: la seguridad la ponen
// las políticas de la base de datos (RLS) y las funciones del servidor, no esconder estas llaves.
// NUNCA poner aquí la llave "service_role" / "secret": esa no debe llegar jamás al navegador.
export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL (ver plataforma/README.md)");
  return url;
}

export function supabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver plataforma/README.md)");
  if (key.startsWith("sb_secret_") || key.includes("service_role")) {
    throw new Error("Se configuró una llave secreta en el navegador. Usa la llave publicable.");
  }
  return key;
}
