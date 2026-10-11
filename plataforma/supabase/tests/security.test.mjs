// Pruebas de seguridad y reglas de negocio de la base de datos.
// Corren sobre Postgres embebido (PGlite) imitando lo que Supabase expone: roles anon/authenticated y auth.uid().
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = readFileSync(new URL('../migrations/20261010000001_plataforma.sql', import.meta.url), 'utf8');
const seed = readFileSync(new URL('../seed.sql', import.meta.url), 'utf8');

const U = {
  ana: '11111111-1111-1111-1111-111111111111',
  beto: '22222222-2222-2222-2222-222222222222',
  caja: '33333333-3333-3333-3333-333333333333',
  jefe: '44444444-4444-4444-4444-444444444444',
  sinPerfil: '55555555-5555-5555-5555-555555555555',
};

async function asUser(id) { await db.exec(`reset role; set request.jwt.claim.sub = '${id}'; set role authenticated;`); }
async function asAnon() { await db.exec(`reset role; set request.jwt.claim.sub = ''; set role anon;`); }
async function asOwner() { await db.exec(`reset role; set request.jwt.claim.sub = '';`); }
const q = (sql, params) => db.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];
async function fails(sql, params, pattern) {
  await assert.rejects(q(sql, params), (e) => { if (pattern) assert.match(e.message, pattern); return true; });
}
async function signup(id, alias, ref = null) {
  await asUser(id);
  return one(`select public.complete_signup($1, $2, '3001234567', 'Robledo', true, true, false, $3) as r`, [alias + ' Nombre', alias, ref]);
}
async function xpOf(id) { await asOwner(); return (await one(`select coalesce(sum(amount),0)::int as x from public.xp_ledger where user_id = $1`, [id])).x; }
async function fichasOf(id) { await asOwner(); return (await one(`select coalesce(sum(delta),0)::int as f from public.ficha_ledger where user_id = $1`, [id])).f; }
async function order(id, items = [{ slug: 'clasica', qty: 1 }], barrio = 'Robledo') {
  await asUser(id);
  return (await one(`select public.place_order($1::jsonb, 'delivery', $2, 'Calle 1 # 2-3', 'Casa azul', 'cash', 50000, null) as r`, [JSON.stringify(items), barrio])).r;
}
async function resetLimits() { await asOwner(); await q('delete from app_private.rate_limits'); }

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
  `);
  await db.exec(migration);
  await db.exec(seed);
  for (const id of Object.values(U)) await q('insert into auth.users (id) values ($1)', [id]);
  // la campaña empieza antes de las pruebas para que el ranking cuente
  await q(`update public.settings set value = jsonb_set(value, '{starts_at}', '"2020-01-01T00:00:00-05:00"') where key = 'campaign'`);
  await q(`update public.settings set value = jsonb_set(value, '{ends_at}', '"2099-01-01T00:00:00-05:00"') where key = 'campaign'`);
});

test('registro: crea el perfil, da 100 XP de bienvenida y no se puede repetir', async () => {
  const r = await signup(U.ana, 'AnaGamer');
  assert.ok(r.r.player_no >= 1);
  assert.equal(await xpOf(U.ana), 100);
  await asUser(U.ana);
  await fails(`select public.complete_signup('Ana', 'Otro', null, null, true, true, false, null)`, [], /PERFIL_YA_EXISTE/);
  assert.equal(await xpOf(U.ana), 100);
});

test('registro: exige mayoría de edad, autorización de datos y alias libre', async () => {
  await asUser(U.beto);
  await fails(`select public.complete_signup('Beto', 'BetoX', null, null, false, true, false, null)`, [], /MAYOR_DE_EDAD/);
  await fails(`select public.complete_signup('Beto', 'BetoX', null, null, true, false, false, null)`, [], /AUTORIZACION_DATOS/);
  await fails(`select public.complete_signup('Beto', 'anagamer', null, null, true, true, false, null)`, [], /ALIAS_OCUPADO/);
  await fails(`select public.complete_signup('Beto', 'a b<script>', null, null, true, true, false, null)`, []);
  const ana = await (async () => { await asOwner(); return one('select player_no from public.profiles where id = $1', [U.ana]); })();
  await signup(U.beto, 'BetoPro', '#' + String(ana.player_no).padStart(4, '0'));
  await asOwner();
  assert.equal((await one('select referred_by from public.profiles where id = $1', [U.beto])).referred_by, U.ana);
});

test('ataque: un cliente no puede escribir XP, fichas ni su rol directamente', async () => {
  await asUser(U.ana);
  await fails(`insert into public.xp_ledger (user_id, amount, reason, ref) values ('${U.ana}', 99999, 'code', 'hack')`, [], /permission denied/);
  await fails(`insert into public.ficha_ledger (user_id, delta, reason, ref) values ('${U.ana}', 50, 'purchase', 'hack')`, [], /permission denied/);
  await fails(`update public.profiles set role = 'admin' where id = '${U.ana}'`, [], /permission denied/);
  await fails(`delete from public.xp_ledger`, [], /permission denied/);
  await fails(`update public.orders set total = 1`, [], /permission denied/);
  await fails(`select app_private.grant_xp('${U.ana}', 5000, 'code', 'x')`, [], /permission denied/);
  await fails(`select app_private.award_purchase('${U.ana}', 5, 5, 'x')`, [], /permission denied/);
  await fails(`select app_private.rate_limit('x', 1, 1)`, [], /permission denied/);
  await fails(`select * from public.settings`, [], /permission denied/);
  await fails(`select * from public.codes`, [], /permission denied/);
  assert.equal(await xpOf(U.ana), 100);
});

test('privacidad: cada cliente solo ve sus propios datos', async () => {
  await asUser(U.ana);
  const profiles = await q('select id from public.profiles');
  assert.deepEqual(profiles.rows.map((r) => r.id), [U.ana]);
  const ledger = await q('select distinct user_id from public.xp_ledger');
  assert.deepEqual(ledger.rows.map((r) => r.user_id), [U.ana]);
});

test('anónimo: ve el menú y el ranking, pero no datos de clientes ni funciones privadas', async () => {
  await asAnon();
  assert.equal((await q('select * from public.menu_items')).rows.length, 3);
  await q('select * from public.leaderboard(10)');
  await fails('select * from public.profiles', [], /permission denied/);
  await fails('select * from public.orders', [], /permission denied/);
  await fails('select public.my_summary()', [], /permission denied/);
  await fails(`select public.place_order('[]'::jsonb, 'pickup', null, null, null, 'cash', null, null)`, [], /permission denied/);
});

test('sin perfil completo no se puede pedir ni jugar', async () => {
  await asUser(U.sinPerfil);
  await fails('select public.my_summary()', [], /PERFIL_INCOMPLETO/);
  await fails('select public.start_game()', [], /PERFIL_INCOMPLETO/);
});

test('pedido: el servidor calcula precios y valida zona, cantidades y pedidos abiertos', async () => {
  await resetLimits();
  const r = await order(U.ana, [{ slug: 'clasica', qty: 2, price: 1 }, { slug: 'montanera', qty: 1 }]);
  assert.equal(r.total, 22100 * 2 + 29100);
  await asUser(U.ana);
  await fails(`select public.place_order('[{"slug":"clasica","qty":1}]'::jsonb, 'delivery', 'Laureles', 'Cra 70', null, 'cash', null, null)`, [], /FUERA_DE_ZONA/);
  await fails(`select public.place_order('[{"slug":"clasica","qty":0}]'::jsonb, 'pickup', null, null, null, 'cash', null, null)`, [], /CANTIDAD_INVALIDA/);
  await fails(`select public.place_order('[{"slug":"hamburguesa-gratis","qty":1}]'::jsonb, 'pickup', null, null, null, 'cash', null, null)`, [], /PRODUCTO_NO_DISPONIBLE/);
  await fails(`select public.place_order('[{"slug":"clasica","qty":1}]'::jsonb, 'delivery', 'Robledo', '', null, 'cash', null, null)`, [], /FALTA_DIRECCION/);
  await order(U.ana);
  await asUser(U.ana);
  await fails(`select public.place_order('[{"slug":"clasica","qty":1}]'::jsonb, 'pickup', null, null, null, 'cash', null, null)`, [], /TIENES_PEDIDOS_ABIERTOS|DEMASIADOS_INTENTOS/);
});

test('roles: un cliente no puede usar funciones del personal ni del administrador', async () => {
  await asUser(U.ana);
  const o = await one(`select id from public.orders where user_id = $1 limit 1`, [U.ana]);
  await fails(`select public.staff_set_order_status($1, 'delivered', null)`, [o.id], /NO_AUTORIZADO/);
  await fails(`select public.staff_find_player('1')`, [], /NO_AUTORIZADO/);
  await fails(`select public.admin_adjust_xp($1, 9999, 'yo')`, [U.ana], /NO_AUTORIZADO/);
  await fails(`select public.admin_set_role($1, 'admin')`, [U.ana], /NO_AUTORIZADO/);
});

test('entrega: el pedido entregado da XP y ficha una sola vez, con tope diario y referido', async () => {
  await signup(U.caja, 'CajaPB'); await signup(U.jefe, 'JefePB');
  await asOwner();
  await q(`update public.profiles set role = 'staff' where id = $1`, [U.caja]);
  await q(`update public.profiles set role = 'admin' where id = $1`, [U.jefe]);
  // un administrador no puede cambiarse su propio rol, el personal no puede asignar roles
  await asUser(U.caja);
  await fails(`select public.admin_set_role($1, 'admin')`, [U.caja], /NO_AUTORIZADO/);
  await asUser(U.jefe);
  await fails(`select public.admin_set_role($1, 'customer')`, [U.jefe], /NO_PUEDES_CAMBIAR_TU_ROL/);

  await resetLimits();
  const betoOrder = await order(U.beto, [{ slug: 'clasica', qty: 3 }, { slug: 'montanera', qty: 2 }]);
  const before = await xpOf(U.beto);
  const anaBefore = await xpOf(U.ana);
  await asUser(U.caja);
  const r = (await one(`select public.staff_set_order_status($1, 'delivered', null) as r`, [betoOrder.id])).r;
  // 300 por pedido + 4 hamburguesas extra x100 + 2 Montañeras x50
  assert.equal(r.xp, 300 + 400 + 100);
  assert.equal(await xpOf(U.beto), before + 800);
  assert.equal(await fichasOf(U.beto), 1);
  assert.equal(await xpOf(U.ana), anaBefore + 400, 'quien invitó gana 400 XP');
  await asUser(U.caja);
  await fails(`select public.staff_set_order_status($1, 'delivered', null)`, [betoOrder.id], /PEDIDO_CERRADO/);
  assert.equal(await xpOf(U.beto), before + 800);

  // segunda compra el mismo día: no suma (máximo 1 compra con XP al día)
  await resetLimits();
  const second = await order(U.beto);
  await asUser(U.caja);
  const r2 = (await one(`select public.staff_set_order_status($1, 'delivered', null) as r`, [second.id])).r;
  assert.equal(r2.xp, 0);
  assert.equal(await xpOf(U.ana), anaBefore + 400, 'el referido paga una sola vez');
});

test('compra en el local: el mismo ticket no suma dos veces', async () => {
  await asOwner(); await q(`delete from public.xp_ledger where user_id = $1 and reason in ('purchase','extra_burger','montanera_bonus')`, [U.ana]);
  await asUser(U.caja);
  const p = (await one(`select public.staff_find_player('#' || (select player_no from public.profiles where id = $1)::text) as r`, [U.ana])).r;
  assert.equal(p.alias, 'AnaGamer');
  const a = (await one(`select public.staff_register_purchase($1, 1, 0, 'T-001') as r`, [U.ana])).r;
  assert.equal(a.xp, 300);
  const b = (await one(`select public.staff_register_purchase($1, 1, 0, 'T-001') as r`, [U.ana])).r;
  assert.equal(b.xp, 0);
  await fails(`select public.staff_register_purchase($1, 2, 3, 'T-002')`, [U.ana], /CANTIDAD_INVALIDA/);
});

test('juego: gasta fichas en el servidor, una partida no se cierra dos veces y hay tope diario', async () => {
  await resetLimits();
  await asUser(U.jefe);
  await fails('select public.start_game()', [], /SIN_FICHAS/);

  // Beto tiene 1 ficha (por su pedido)
  await asUser(U.beto);
  const s1 = (await one('select public.start_game() as r')).r;
  await fails('select public.start_game()', [], /PARTIDA_EN_CURSO|SIN_FICHAS/);
  assert.equal(await fichasOf(U.beto), 0);
  await asUser(U.beto);
  // demasiado rápido para una partida real → marcada y sin XP
  const fast = (await one(`select public.finish_game($1, 'dorada', '{"tap_error_ms": 30}'::jsonb) as r`, [s1.session])).r;
  assert.equal(fast.xp, 0); assert.equal(fast.flagged, true);
  await fails(`select public.finish_game($1, 'dorada', '{}'::jsonb)`, [s1.session], /PARTIDA_CERRADA/);

  // Partidas válidas (se simula el paso del tiempo) hasta el tope diario de 80 XP
  await asOwner();
  for (let i = 0; i < 4; i++) await q(`insert into public.ficha_ledger (user_id, delta, reason, ref) values ($1, 1, 'admin_adjust', 'test-${i}')`, [U.beto]);
  const won = [];
  for (const prize of ['dorada', 'byte', 'clasica']) {
    await asUser(U.beto);
    const s = (await one('select public.start_game() as r')).r;
    await asOwner(); await q(`update public.game_sessions set started_at = now() - interval '20 seconds' where id = $1`, [s.session]);
    await asUser(U.beto);
    won.push((await one(`select public.finish_game($1, $2, '{"tap_error_ms": 41}'::jsonb) as r`, [s.session, prize])).r.xp);
  }
  assert.deepEqual(won, [80, 0, 0], 'la Dorada vale 100 pero el tope diario es 80');

  // premio inventado y partida ajena
  await asUser(U.beto);
  const s4 = (await one('select public.start_game() as r')).r;
  await fails(`select public.finish_game($1, 'hamburguesa-gratis', '{}'::jsonb)`, [s4.session], /PREMIO_INVALIDO/);
  await asUser(U.ana);
  await fails(`select public.finish_game($1, 'clasica', '{}'::jsonb)`, [s4.session], /PARTIDA_NO_EXISTE/);
  // bot: precisión casi perfecta repetida → la tercera vez en el día queda marcada y sin XP
  await asOwner(); await q(`update public.game_sessions set started_at = now() - interval '20 seconds' where id = $1`, [s4.session]);
  await asUser(U.beto);
  const lucky = (await one(`select public.finish_game($1, 'clasica', '{"tap_error_ms": 0.4}'::jsonb) as r`, [s4.session])).r;
  assert.equal(lucky.flagged, false, 'una vez puede ser suerte');
  const flags = [];
  for (let i = 0; i < 2; i++) {
    await asOwner(); await q(`insert into public.ficha_ledger (user_id, delta, reason, ref) values ($1, 1, 'admin_adjust', 'bot-${i}')`, [U.beto]);
    await asUser(U.beto);
    const s = (await one('select public.start_game() as r')).r;
    await asOwner(); await q(`update public.game_sessions set started_at = now() - interval '20 seconds' where id = $1`, [s.session]);
    await asUser(U.beto);
    flags.push((await one(`select public.finish_game($1, 'chorizo', '{"tap_error_ms": 1.1}'::jsonb) as r`, [s.session])).r.flagged);
  }
  assert.deepEqual(flags, [false, true]);
});

test('códigos: se canjean una vez por persona y la fuerza bruta se bloquea', async () => {
  await resetLimits();
  await asUser(U.jefe);
  await q(`select public.admin_create_code('CARTEL-ROBLEDO-7', 'Cartel secreto Robledo', 150, 100, null)`);
  await asUser(U.ana);
  const before = await xpOf(U.ana);
  await asUser(U.ana);
  const r = (await one(`select public.redeem_code(' cartel-robledo-7 ') as r`)).r;
  assert.equal(r.ok, true); assert.equal(r.xp, 150);
  const again = (await one(`select public.redeem_code('CARTEL-ROBLEDO-7') as r`)).r;
  assert.deepEqual(again, { ok: false, error: 'CODIGO_YA_USADO' });
  assert.equal(await xpOf(U.ana), before + 150);
  await asUser(U.beto);
  let blocked = false;
  for (let i = 0; i < 12; i++) {
    try { const x = (await one(`select public.redeem_code('ADIVINA-${i}') as r`)).r; assert.equal(x.ok, false); }
    catch (e) { if (/DEMASIADOS_INTENTOS/.test(e.message)) { blocked = true; break; } throw e; }
  }
  assert.ok(blocked, 'después de 10 intentos por hora se bloquea');
});

test('ranking: solo alias y XP, sin personal ni administradores', async () => {
  await asAnon();
  const rows = (await q('select * from public.leaderboard(10)')).rows;
  const aliases = rows.map((r) => r.alias);
  assert.ok(aliases.includes('AnaGamer') && aliases.includes('BetoPro'));
  assert.ok(!aliases.includes('CajaPB') && !aliases.includes('JefePB'));
  assert.deepEqual(Object.keys(rows[0]).sort(), ['alias', 'rank', 'xp']);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].xp >= rows[i].xp);
});

test('auditoría: las acciones del personal quedan registradas y solo el administrador las lee', async () => {
  await asUser(U.caja);
  assert.equal((await q('select * from public.audit_log')).rows.length, 0);
  await asUser(U.jefe);
  const actions = (await q('select distinct action from public.audit_log')).rows.map((r) => r.action);
  assert.ok(actions.includes('order_status') && actions.includes('register_purchase') && actions.includes('create_code'));
});

test('borrar cuenta: se eliminan los datos personales', async () => {
  await asUser(U.ana);
  await q('select public.delete_my_account()');
  await asOwner();
  const p = await one('select display_name, whatsapp, barrio, deleted_at from public.profiles where id = $1', [U.ana]);
  assert.equal(p.display_name, 'Jugador eliminado');
  assert.equal(p.whatsapp, null); assert.equal(p.barrio, null); assert.ok(p.deleted_at);
  const o = await one('select count(*)::int as n from public.orders where user_id = $1 and address is not null', [U.ana]);
  assert.equal(o.n, 0);
  await asUser(U.ana);
  await fails('select public.my_summary()', [], /PERFIL_INCOMPLETO/);
});
