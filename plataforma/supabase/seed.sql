-- Datos iniciales de Pixel Burger (se pueden editar después desde el panel de Supabase)

insert into public.settings (key, value) values
  ('xp', '{"signup":100,"purchase":300,"extra_burger":100,"extra_burger_max":4,"montanera_bonus":50,"referral":400,"referral_max":5,"purchases_per_day":1}'),
  ('game', '{"xp_by_prize":{"chorizo":20,"clasica":40,"montanera":40,"cheese":40,"byte":60,"dorada":100},"daily_xp_cap":80,"album_bonus":200,"min_duration_ms":6000,"max_duration_ms":180000,"counts_for_ranking":true}'),
  ('campaign', '{"name":"Misión Pixel","prize":"GTA VI","starts_at":"2026-10-20T00:00:00-05:00","ends_at":"2026-11-18T23:59:59-05:00"}'),
  ('orders', '{"min_total":0,"max_items":20,"max_open":2}'),
  ('store', '{"open":true,"whatsapp":"","hours":"Martes a domingo"}')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.levels (level, name, min_xp, reward) values
  (0, 'Sin nivel', 0, '—'),
  (1, 'Jugador', 100, 'Salsa extra gratis en tu primer pedido'),
  (2, 'Veterano', 1000, 'Montañera o Cheese al precio de la Clásica'),
  (3, 'Élite', 2000, 'Una Clásica gratis'),
  (4, 'Leyenda', 4000, 'Dos Clásicas gratis')
on conflict (level) do nothing;

insert into public.menu_items (slug, name, description, price, is_burger, sort) values
  ('clasica', 'Clásica', 'Carne de la casa, queso, cebolla caramelizada, tomate, lechuga y BBQ.', 22100, true, 1),
  ('montanera', 'Montañera', 'Carne de la casa, chorizo santarrosano, hogao, queso y cilantro.', 29100, true, 2),
  ('cheese', 'Cheese', 'Doble queso: cheddar, queso crema y salsa cheddar sobre la carne de la casa.', 31900, true, 3)
on conflict (slug) do nothing;

-- Barrios del radio de domicilios (VERIFICAR con el mapa RangoDeDomicilios.png y ajustar el costo del domicilio)
insert into public.delivery_zones (barrio, fee) values
  ('Santa Margarita', 0), ('Pajarito', 0), ('Robledo', 0), ('Aures', 0),
  ('Doce de Octubre', 0), ('Fuente Clara', 0), ('El Diamante', 0), ('Bello Horizonte', 0)
on conflict (barrio) do nothing;
