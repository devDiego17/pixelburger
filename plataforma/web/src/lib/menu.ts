import type { MenuItem } from "./types";

/**
 * Carta de Pixel Burger (recetas de NumerosBurger.xlsx › Food Cost).
 * Solo para mostrar: se pinta al instante y mientras la base de datos responde.
 * El precio que se cobra lo calcula siempre el servidor en place_order; si cambias
 * algo aquí, cámbialo también en supabase/seed.sql (o en la tabla menu_items).
 */
export const MENU: MenuItem[] = [
  { id: 1, slug: "clasica", name: "Clásica", price: 22100, is_burger: true, sort: 1,
    description: "Carne de la casa, queso, cebolla caramelizada, tomate, lechuga y salsas BBQ y dulce." },
  { id: 2, slug: "montanera", name: "Montañera", price: 29100, is_burger: true, sort: 2,
    description: "Carne de la casa, chorizo santarrosano, hogao, queso, cilantro, tomate, lechuga y salsas de la casa." },
  { id: 3, slug: "cheese", name: "Cheese", price: 31900, is_burger: true, sort: 3,
    description: "Carne de la casa, doble cheddar, queso crema, salsa cheddar, cebolla caramelizada, tomate y lechuga." },
];
