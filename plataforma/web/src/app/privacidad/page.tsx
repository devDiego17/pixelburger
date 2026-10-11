import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

// Borrador basado en la Ley 1581 de 2012 y el Decreto 1377 de 2013. Debe revisarlo un abogado antes de publicar.
export default function PrivacidadPage() {
  return (
    <article className="flex flex-col gap-4 py-2 text-sm leading-relaxed">
      <h1 className="font-display text-2xl text-cheese">POLÍTICA DE DATOS</h1>
      <p className="rounded-lg border-2 border-cheese bg-cabinet p-3 text-xs">Borrador para revisión legal. Completar los datos entre [corchetes].</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Responsable</h2>
        <p>Pixel Burger, [razón social o nombre del titular], NIT/C.C. [número], [dirección], Medellín. Contacto para datos personales: [correo] · WhatsApp [número].</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Qué datos tratamos</h2>
        <p>Correo electrónico, nombre, alias de jugador, número de WhatsApp, barrio, direcciones de entrega, historial de pedidos, XP, fichas y partidas.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Para qué</h2>
        <ul className="list-disc pl-5">
          <li>Gestionar tus pedidos y entregas.</li>
          <li>Administrar tu cuenta, tu XP, tus niveles y la Misión Pixel.</li>
          <li>Mostrar tu alias (nunca tu nombre) en el ranking.</li>
          <li>Enviarte promociones por WhatsApp, solo si lo autorizaste.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar la autorización y presentar quejas ante la Superintendencia de Industria y Comercio. Desde tu perfil puedes editar tus datos y borrar tu cuenta en cualquier momento.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Seguridad</h2>
        <p>Tus datos se guardan cifrados en tránsito en servidores de Supabase. Solo tú ves tu información; el personal de Pixel Burger accede a lo necesario para atender tus pedidos. No vendemos ni compartimos tus datos con terceros para publicidad.</p>
      </section>
      <p className="text-xs text-muted">Vigente desde [fecha].</p>
      <Link href="/" className="text-cheese underline">Volver</Link>
    </article>
  );
}
