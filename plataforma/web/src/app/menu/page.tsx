import { redirect } from "next/navigation";

// La carta vive ahora en la pantalla de inicio.
export default function MenuPage() {
  redirect("/");
}
