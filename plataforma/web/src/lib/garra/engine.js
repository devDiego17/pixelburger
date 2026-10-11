// Motor del juego de la garra (física, péndulo, barra de agarre estilo FIFA).
// Es la versión auditada del prototipo, sin fichas ni álbum locales: eso lo maneja el servidor.
// El servidor gasta la ficha al empezar (start_game) y decide la XP al terminar (finish_game).
import { PAL, SPRITES } from "../sprites";

const W = 360, H = 520;
const LEFT = 12, RIGHT = 348, FLOOR = 470;
const DIV_X1 = 90, DIV_X2 = 100, DIV_TOP = 300;
const RAIL = 44, HOME_X = 51, MIN_X = 51, MAX_X = 322;
const FL = 30, G = 980;
const MOVE_SPEED = 125, LOWER_SPEED = 120, RAISE_SPEED = 115, RETURN_SPEED = 150;
const ACCEL = 320;
const SW_K = 10.5, SW_C = 0.8, SW_B = 0.85;
const TURN_TIME = 10, CARRY_TIME = 8;
const BOUNCE = 0.5, BOUNCE_MIN = 120;
const GREEN = 0.05, SWEEP = 1.0, GRIP_TIMEOUT = 3.2; // dificultad «Normal» calibrada
const HANG = RAIL + 30;
const STEP = 1 / 240;

const TYPES = {
  clasica: { name: "Clásica", r: 23, w: 0.08 },
  montanera: { name: "Montañera", r: 23, w: 0.1 },
  cheese: { name: "Cheese", r: 24, w: 0.1 },
  chorizo: { name: "Chorizo", r: 17, w: 0.04 },
  byte: { name: "Byte", r: 25, w: 0.16 },
  dorada: { name: "Dorada", r: 19, w: 0.3, rare: true },
};
const MIX = ["clasica", "clasica", "clasica", "clasica", "montanera", "montanera", "montanera", "cheese", "cheese", "cheese", "chorizo", "chorizo", "byte", "dorada"];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSprite(map) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 16;
  const x = c.getContext("2d");
  map.forEach((row, j) => { for (let i = 0; i < 16; i++) { const ch = row[i] || "."; if (ch !== "." && PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } } });
  return c;
}

export function createGarra(canvas, { onState = () => {}, onTimer = () => {}, onResult = () => {}, sound = true } = {}) {
  const ctx = canvas.getContext("2d");
  const sprites = {};
  Object.keys(TYPES).forEach((t) => { sprites[t] = makeSprite(SPRITES[t]); });
  let rand = mulberry32(Date.now() & 0xffffffff);
  let soundOn = sound;

  // ---------- Sonido ----------
  let ac = null, motor = null;
  function actx() { if (!soundOn) return null; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(freq, dur, type = "square", vol = 0.06, when = 0) {
    const a = actx(); if (!a) return; const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    coin() { tone(988, 0.08); tone(1319, 0.18, "square", 0.06, 0.08); },
    clack() { tone(180, 0.06, "square", 0.09); tone(120, 0.08, "square", 0.07, 0.04); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "square", 0.07, i * 0.1)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.2, "triangle", 0.08, i * 0.13)); },
    boing(s) { tone(170 + Math.min(s, 900) * 0.25, 0.09, "triangle", 0.035); },
    motorOn() { const a = actx(); if (!a || motor) return; const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = 64; f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 0.035;
      o.connect(f).connect(g).connect(a.destination); o.start(); motor = { o }; },
    motorOff() { if (motor) { try { motor.o.stop(); } catch { /* */ } motor = null; } },
  };

  // ---------- Peluches ----------
  let plush = [], uid = 0;
  function spawn(type, x, y) {
    const T = TYPES[type];
    plush.push({ id: ++uid, type, x, y, vx: 0, vy: 0, r: T.r, m: (T.r * T.r) / 400 * (1 + T.w * 2), a: (rand() - 0.5) * 0.4, held: false, gone: false, sq: 0 });
  }
  function fillMachine(target = 14) {
    const alive = plush.filter((p) => !p.gone);
    const pool = MIX.slice();
    alive.forEach((p) => { const i = pool.indexOf(p.type); if (i >= 0) pool.splice(i, 1); });
    let n = target - alive.length, k = 0;
    while (n-- > 0 && pool.length) { const t = pool.splice(Math.floor(rand() * pool.length), 1)[0]; spawn(t, 125 + rand() * 200, -30 - k * 46); k++; }
  }
  let quiet = true, lastBoing = 0;
  function impact(p, speed) {
    if (speed < 140) return;
    p.sq = Math.min(0.3, speed / 1100);
    if (!quiet && performance.now() - lastBoing > 90) { lastBoing = performance.now(); sfx.boing(speed); }
  }
  function clampWalls(p) {
    if (p.x - p.r < LEFT) { p.x = LEFT + p.r; if (p.vx < 0) p.vx *= -(Math.abs(p.vx) > BOUNCE_MIN ? BOUNCE : 0.1); }
    if (p.x + p.r > RIGHT) { p.x = RIGHT - p.r; if (p.vx > 0) p.vx *= -(Math.abs(p.vx) > BOUNCE_MIN ? BOUNCE : 0.1); }
    const floorY = p.x < DIV_X1 ? H + 80 : FLOOR;
    if (p.y + p.r > floorY) { p.y = floorY - p.r; if (p.vy > 0) { const hit = p.vy; p.vy = hit > BOUNCE_MIN ? -hit * BOUNCE * 0.9 : 0; impact(p, hit); } p.vx *= 0.92; }
    const cx = Math.max(DIV_X1, Math.min(p.x, DIV_X2)), cy = Math.max(DIV_TOP, Math.min(p.y, FLOOR + 40));
    let dx = p.x - cx, dy = p.y - cy; const d2 = dx * dx + dy * dy;
    if (d2 < p.r * p.r) {
      let d = Math.sqrt(d2); if (d < 0.001) { dx = p.x < (DIV_X1 + DIV_X2) / 2 ? -1 : 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d; p.x += nx * (p.r - d); p.y += ny * (p.r - d);
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) { const k = 1 + (-vn > BOUNCE_MIN ? BOUNCE : 0.05); p.vx -= k * vn * nx; p.vy -= k * vn * ny; impact(p, -vn); }
    }
  }
  function kinematicPush(p, kx, ky, kr) {
    const dx = p.x - kx, dy = p.y - ky, d = Math.hypot(dx, dy), min = p.r + kr;
    if (d < min && d > 0.001) { const nx = dx / d, ny = dy / d; p.x += nx * (min - d); p.y += ny * (min - d); const vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; } }
  }
  function physics(dt) {
    const live = plush.filter((p) => !p.gone);
    for (const p of live) { if (p.held) continue; p.vy += G * dt; p.vx *= 0.998; p.x += p.vx * dt; p.y += p.vy * dt; p.a += (p.vx * dt) / p.r * 0.6; p.a *= 0.995; if (p.sq) p.sq *= 0.985; }
    const kin = clawColliders();
    for (let it = 0; it < 5; it++) {
      for (let i = 0; i < live.length; i++) {
        const a = live[i];
        for (let j = i + 1; j < live.length; j++) {
          const b = live[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
          if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
          const d = Math.hypot(dx, dy); if (d >= min || d < 0.0001) continue;
          const nx = dx / d, ny = dy / d, overlap = min - d;
          const ia = a.held ? 0 : 1 / a.m, ib = b.held ? 0 : 1 / b.m, sum = ia + ib; if (sum === 0) continue;
          a.x -= nx * overlap * ia / sum; a.y -= ny * overlap * ia / sum; b.x += nx * overlap * ib / sum; b.y += ny * overlap * ib / sum;
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const e = -vn > BOUNCE_MIN ? BOUNCE * 0.8 : 0.05, jimp = -(1 + e) * vn / sum;
            if (-vn > 140) { impact(a, -vn); impact(b, -vn); }
            a.vx -= jimp * nx * ia; a.vy -= jimp * ny * ia; b.vx += jimp * nx * ib; b.vy += jimp * ny * ib;
            const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, f = vt * 0.12 / sum;
            a.vx += f * tx * ia; a.vy += f * ty * ia; b.vx -= f * tx * ib; b.vy -= f * ty * ib;
          }
        }
      }
      for (const p of live) { if (p.held) continue; for (const k of kin) kinematicPush(p, k.x, k.y, k.r); clampWalls(p); }
    }
    for (const p of live) if (!p.held && p.x < DIV_X1 && p.y > FLOOR + 14) { p.gone = true; onPrize(p); }
  }

  // ---------- Garra ----------
  const claw = { x: HOME_X, y: HANG, v: 0, s: 0, vs: 0, open: 1, state: "IDLE", t: 0, held: null, travel: 0, slipAt: Infinity, timer: 0, contact: null, grip: null, gripResult: null, gripT0: 0 };
  let dir = 0, round = null, realClock = 0, lastTimerShown = -1;
  const hx = () => claw.x + claw.s;
  function setState(s) { claw.state = s; onState(publicState()); }
  function publicState() {
    return { IDLE: "idle", MOVING: "moving", GRIPPING: "gripping", CARRYING: "carrying" }[claw.state] ?? "busy";
  }
  function fingerTips() {
    const ang = 0.12 + 0.62 * claw.open, ry = claw.y + 12;
    return [{ x: hx() - 9 - Math.sin(ang) * FL, y: ry + Math.cos(ang) * FL }, { x: hx() + 9 + Math.sin(ang) * FL, y: ry + Math.cos(ang) * FL }];
  }
  function clawColliders() {
    if (!["LOWERING", "CLOSING", "RAISING", "CARRYING", "RETURNING"].includes(claw.state)) return [];
    const tips = fingerTips(), out = [{ x: hx(), y: claw.y + 6, r: 13 }];
    if (claw.state !== "CLOSING" && claw.state !== "LOWERING") out.push({ x: tips[0].x, y: tips[0].y, r: 5 }, { x: tips[1].x, y: tips[1].y, r: 5 });
    if (claw.held && !claw.held.gone) out.push({ x: claw.held.x, y: claw.held.y, r: claw.held.r });
    return out;
  }
  const tipY = () => fingerTips()[0].y;

  function startTurn(seed) {
    if (claw.state !== "IDLE") return false;
    if (Number.isFinite(seed)) { rand = mulberry32(seed); plush = []; fillMachine(); presettle(); }
    sfx.coin();
    claw.timer = TURN_TIME; claw.x = HOME_X; claw.y = HANG; claw.v = 0; claw.s = 0; claw.vs = 0; claw.open = 1; dir = 0;
    round = { prize: null, result: null, tip: "", started: performance.now(), tapErrorMs: null, releasedOver: false };
    setState("MOVING");
    return true;
  }
  function drop() { if (claw.state !== "MOVING") return; dir = 0; setState("LOWERING"); sfx.motorOn(); }
  function measureContact() {
    const live = plush.filter((p) => !p.gone); let best = null;
    for (const p of live) {
      const dx = p.x - hx();
      if (Math.abs(dx) < 26 && p.y > claw.y && p.y - claw.y < 74) {
        if (!best || Math.abs(dx) < Math.abs(best.x - hx()) - 0.5 || (Math.abs(Math.abs(dx) - Math.abs(best.x - hx())) <= 0.5 && p.y < best.y)) best = p;
      }
    }
    if (!best) { claw.contact = null; return; }
    claw.contact = { p: best, dx: best.x - hx(),
      buried: live.filter((q) => q !== best && q.y < best.y - best.r * 0.5 && Math.abs(q.x - best.x) < best.r * 0.7 && Math.hypot(q.x - best.x, q.y - best.y) < q.r + best.r + 3).length };
  }
  function startGrip() {
    const c = claw.contact, T = TYPES[c.p.type];
    const aimQ = Math.max(0, 1 - Math.abs(c.dx) / 22);
    let green = GREEN * (0.35 + 0.65 * aimQ) * (1 - T.w * 2);
    if (c.buried) green *= 0.4;
    claw.grip = { green, yellow: green + 0.1 * (0.5 + 0.5 * aimQ), aimQ, sweep: SWEEP, m: 0, dir: 1, name: T.name, verdict: "", color: "" };
    claw.t = 0; claw.gripT0 = realClock;
    setState("GRIPPING");
  }
  function squeeze(timeout) {
    if (claw.state !== "GRIPPING") return;
    const g = claw.grip, d = Math.abs(g.m - 0.5);
    const zone = timeout ? "red" : d <= g.green ? "green" : d <= g.yellow ? "yellow" : "red";
    const q = zone === "yellow" ? 1 - (d - g.green) / Math.max(0.001, g.yellow - g.green) : 0;
    const late = (g.m - 0.5) * g.dir > 0;
    claw.gripResult = { zone, q, late, timeout };
    round.tapErrorMs = timeout ? null : Math.round(d * g.sweep * 1000 * 10) / 10;
    g.verdict = zone === "green" ? "¡PERFECTO!" : zone === "yellow" ? (late ? "UN POCO TARDE" : "UN POCO PRONTO") : (timeout ? "NO APRETASTE" : late ? "MUY TARDE" : "MUY PRONTO");
    g.color = zone === "green" ? "#43C35A" : zone === "yellow" ? "#F2C230" : "#FF6B6E";
    g.shownUntil = realClock + 0.9;
    sfx.clack();
    claw.t = 0; claw.open = 0.75;
    setState("CLOSING");
  }
  function evaluateGrab() {
    const c = claw.contact, r = claw.gripResult;
    if (!c || c.p.gone) { round.result = "miss"; round.tip = "No había ningún peluche bajo la garra."; return; }
    const aimNote = claw.grip && claw.grip.aimQ < 0.6 ? " Además, la garra no quedó centrada." : "";
    if (r && r.zone === "green") hold(c.p, Infinity);
    else if (r && r.zone === "yellow") {
      hold(c.p, Math.max(18, ((claw.y - HANG) + (claw.x - HOME_X) + 40) * (0.15 + 0.7 * r.q)));
      round.tip = (r.late ? "Apretaste un poco tarde y se resbaló." : "Apretaste un poco pronto y se resbaló.") + aimNote;
    } else {
      round.result = "miss";
      c.p.vx += (c.dx > 0 ? 1 : -1) * 70; c.p.vy -= 40;
      round.tip = (!r || r.timeout ? "No apretaste a tiempo." : r.late ? "Apretaste muy tarde." : "Apretaste muy pronto.") + aimNote;
    }
  }
  function hold(p, slipAt) { p.held = true; p.vx = 0; p.vy = 0; claw.held = p; claw.travel = 0; claw.slipAt = slipAt; }
  function letGo(vx) { const p = claw.held; if (!p) return; p.held = false; p.vx = vx; p.vy = 0; claw.held = null; }
  function onPrize(p) {
    if (!round || round.prize || claw.state === "IDLE" || claw.state === "MOVING") return;
    round.prize = p.type; round.result = "win";
  }
  function release() {
    if (claw.state !== "CARRYING") return;
    dir = 0; sfx.motorOff();
    const overChute = hx() < DIV_X1;
    round.releasedOver = overChute;
    letGo(claw.v + claw.vs * 0.4);
    if (!overChute && round.result !== "win") { round.result = "drop"; round.tip = "Lo soltaste fuera de la salida."; }
    claw.t = 0; setState("RELEASING");
  }
  function moveHeld(d, vx) {
    if (!claw.held) return;
    claw.travel += d;
    if (claw.travel >= claw.slipAt) { letGo(vx * 0.5); round.result = "slip"; }
  }
  function approach(v, target, dt) { const d = target - v, m = ACCEL * dt; return v + Math.max(-m, Math.min(m, d)); }
  function moveCarriage(dt, target) {
    claw.v = approach(claw.v, target, dt); claw.x += claw.v * dt;
    if (claw.x < MIN_X) { claw.x = MIN_X; claw.v = 0; } if (claw.x > MAX_X) { claw.x = MAX_X; claw.v = 0; }
  }
  function finishRound() {
    sfx.motorOff();
    let outcome = round.result;
    if (!outcome) outcome = round.releasedOver ? "bounce" : "miss";
    if (outcome === "win") sfx.win(); else sfx.lose();
    const tips = { bounce: "Cayó sobre la salida pero rebotó fuera. Suéltalo quieto y centrado.", drop: "Suéltalo cuando la garra esté sobre el hueco de SALIDA." };
    onResult({ prize: round.prize, outcome, tip: round.tip || tips[outcome] || "", tapErrorMs: round.tapErrorMs, durationMs: Math.round(performance.now() - round.started) });
    if (plush.filter((p) => !p.gone).length < 10) fillMachine();
    plush = plush.filter((p) => !p.gone);
    round = null;
    setState("IDLE");
  }
  function updateClaw(dt) {
    const prevV = claw.v;
    switch (claw.state) {
      case "IDLE": claw.v = 0; break;
      case "MOVING": moveCarriage(dt, dir * MOVE_SPEED); claw.timer -= dt; if (claw.timer <= 0) { claw.timer = 0; drop(); } break;
      case "LOWERING": {
        moveCarriage(dt, 0); claw.y += LOWER_SPEED * dt;
        const ty = tipY(), x = hx();
        const touching = plush.some((p) => !p.gone && Math.abs(p.x - x) < p.r * 0.7 + 6 && p.y - p.r <= ty - 2);
        if (touching || ty >= FLOOR - 3) { measureContact(); sfx.motorOff(); if (claw.contact) startGrip(); else { claw.gripResult = null; claw.t = 0; setState("CLOSING"); } }
        break;
      }
      case "GRIPPING": {
        claw.t = realClock - claw.gripT0;
        const g = claw.grip, ph = (claw.t / g.sweep) % 2;
        g.m = ph < 1 ? ph : 2 - ph; g.dir = ph < 1 ? 1 : -1;
        claw.open = 0.75 + Math.sin(claw.t * 30) * 0.02;
        if (claw.t >= GRIP_TIMEOUT) squeeze(true);
        break;
      }
      case "CLOSING":
        moveCarriage(dt, 0); claw.t += dt; claw.open = Math.max(0.05, 1 - claw.t / 0.45);
        if (claw.t >= 0.45) { sfx.clack(); evaluateGrab(); setState("RAISING"); sfx.motorOn(); }
        break;
      case "RAISING": {
        moveCarriage(dt, 0);
        const dy = Math.min(RAISE_SPEED * dt, claw.y - HANG); claw.y -= dy; moveHeld(dy, 0);
        if (claw.y <= HANG + 0.01) { claw.y = HANG; if (claw.held) { claw.timer = CARRY_TIME; sfx.motorOff(); setState("CARRYING"); } else setState("RETURNING"); }
        break;
      }
      case "CARRYING": {
        const x0 = claw.x; moveCarriage(dt, dir * MOVE_SPEED); moveHeld(Math.abs(claw.x - x0), claw.v);
        claw.timer -= dt;
        if (!claw.held) { dir = 0; setState("RETURNING"); } else if (claw.timer <= 0) { claw.timer = 0; release(); }
        break;
      }
      case "RETURNING": {
        const dx = Math.min(RETURN_SPEED * dt, claw.x - HOME_X); claw.x -= dx; claw.v = -dx / dt; moveHeld(dx, -RETURN_SPEED);
        if (claw.x <= HOME_X + 0.01) { claw.x = HOME_X; claw.v = 0; claw.t = 0; sfx.motorOff(); setState("SETTLE"); }
        break;
      }
      case "RELEASING": claw.t += dt; claw.open = Math.min(1, 0.05 + claw.t / 0.3); if (claw.t >= 0.3) { claw.t = 0; setState("SETTLE"); } break;
      case "SETTLE": {
        claw.t += dt;
        if (claw.x > HOME_X) { const back = Math.min(RETURN_SPEED * dt, claw.x - HOME_X); claw.x -= back; claw.v = -back / dt; } else claw.v = 0;
        if (claw.t >= 2.2 || round.result === "win") finishRound();
        break;
      }
    }
    const a = (claw.v - prevV) / dt;
    if (claw.state === "LOWERING" || claw.state === "CLOSING" || claw.state === "GRIPPING") claw.vs = 0;
    else { const damp = claw.state === "IDLE" ? 4 : SW_C; claw.vs += (-SW_K * claw.s - damp * claw.vs - SW_B * a) * dt; claw.s += claw.vs * dt; }
    if (claw.held) { const p = claw.held; p.x = hx(); p.y = claw.y + 12 + FL * 0.72 + p.r * 0.35; p.a = claw.s * -0.01; }
  }

  // ---------- Dibujo ----------
  let tNow = 0;
  function fit() { const dpr = Math.min(window.devicePixelRatio || 1, 3); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#2B2148"); bg.addColorStop(1, "#171327");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 40; y < FLOOR; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < W; x += 16) ctx.fillRect(x, y, 8, 8);
    ctx.fillStyle = "#15131F"; ctx.fillRect(0, 0, W, 26);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 14px 'Courier New', monospace"; ctx.fillStyle = "#FFC83D"; ctx.fillText("PIXEL BURGER", W / 2, 13);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = Math.floor(tNow * 4 + i) % 2 === 0 ? "#FF4F8B" : "#5A2A44"; ctx.fillRect(10 + i * 9, 10, 5, 5); ctx.fillRect(W - 15 - i * 9, 10, 5, 5); }
    ctx.fillStyle = "#3A3450"; ctx.fillRect(LEFT, RAIL - 16, RIGHT - LEFT, 6);
    ctx.fillStyle = "#0C0A14"; ctx.fillRect(LEFT, DIV_TOP, DIV_X1 - LEFT, H - DIV_TOP);
    ctx.fillStyle = "rgba(255,200,61,0.12)"; ctx.fillRect(LEFT, DIV_TOP - 70, DIV_X1 - LEFT, 70);
    ctx.font = "700 11px 'Courier New', monospace"; ctx.fillStyle = "#FFC83D"; ctx.fillText("SALIDA", (LEFT + DIV_X1) / 2, DIV_TOP - 8);
    for (let y = DIV_TOP; y < FLOOR; y += 10) { ctx.fillStyle = ((y - DIV_TOP) / 10) % 2 ? "#15131F" : "#FFC83D"; ctx.fillRect(DIV_X1, y, DIV_X2 - DIV_X1, 10); }
    if (claw.state === "MOVING") {
      const x = hx(); let top = FLOOR;
      for (const p of plush) if (!p.gone && Math.abs(p.x - x) < p.r) top = Math.min(top, p.y - Math.sqrt(Math.max(0, p.r * p.r - (p.x - x) ** 2)));
      ctx.fillStyle = "rgba(255,200,61,0.55)"; ctx.beginPath(); ctx.ellipse(x, top - 2, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of plush) {
      if (p.gone) continue;
      const size = p.r * 2.3, sq = p.sq || 0;
      ctx.save(); ctx.translate(p.x, p.y + sq * p.r * 0.6); ctx.scale(1 + sq, 1 - sq); ctx.rotate(p.a);
      ctx.drawImage(sprites[p.type], -size / 2, -size / 2, size, size);
      if (p.type === "dorada") { const tw = (Math.sin(tNow * 6 + p.id) + 1) / 2; ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`; ctx.fillRect(size * 0.22, -size * 0.42, 3, 3); }
      ctx.restore();
    }
    drawClaw();
    ctx.fillStyle = "#15131F"; ctx.fillRect(DIV_X2, FLOOR, RIGHT - DIV_X2 + 12, H - FLOOR);
    ctx.fillStyle = "#FF4F8B"; ctx.fillRect(DIV_X2, FLOOR, RIGHT - DIV_X2 + 12, 3);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.moveTo(240, 30); ctx.lineTo(268, 30); ctx.lineTo(150, FLOOR); ctx.lineTo(122, FLOOR); ctx.fill();
    if (claw.grip && (claw.state === "GRIPPING" || realClock < (claw.grip.shownUntil ?? 0))) drawMeter();
  }
  function drawClaw() {
    const cx0 = claw.x, x = hx(), y = claw.y;
    ctx.fillStyle = "#FF4F8B"; ctx.fillRect(cx0 - 14, RAIL - 20, 28, 12);
    ctx.strokeStyle = "#B9B3C9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx0, RAIL - 8); ctx.lineTo(x, y); ctx.stroke();
    const ang = 0.12 + 0.62 * claw.open, ry = y + 12;
    for (const sgn of [-1, 1]) {
      const bx = x + sgn * 9, tx = bx + sgn * Math.sin(ang) * FL, ty = ry + Math.cos(ang) * FL;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#15131F"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(tx, ty); ctx.lineTo(tx - sgn * 8, ty + 4); ctx.stroke();
      ctx.strokeStyle = "#F5F1E8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(tx, ty); ctx.lineTo(tx - sgn * 8, ty + 4); ctx.stroke();
    }
    ctx.fillStyle = "#15131F"; ctx.fillRect(x - 17, y - 2, 34, 18);
    ctx.fillStyle = "#FFC83D"; ctx.fillRect(x - 15, y, 30, 14);
    ctx.fillStyle = "#FF4F8B"; ctx.fillRect(x - 15, y + 6, 30, 3);
  }
  // Barra estilo FIFA: placa oscura, degradé rojo-amarillo-verde-amarillo-rojo y aguja.
  function drawMeter() {
    const g = claw.grip, bx = 40, by = 404, bw = 280, bh = 14;
    ctx.fillStyle = "rgba(18,17,23,0.92)"; ctx.fillRect(bx - 14, by - 34, bw + 28, 66);
    ctx.strokeStyle = "#4A4656"; ctx.lineWidth = 2; ctx.strokeRect(bx - 14, by - 34, bw + 28, 66);
    ctx.fillStyle = "#4FA3E0"; ctx.fillRect(bx, by - 10, bw, 3);
    ctx.textAlign = "left"; ctx.font = "700 13px 'Courier New', monospace"; ctx.fillStyle = "#FFFFFF"; ctx.fillText(g.name.toUpperCase(), bx, by - 21);
    ctx.textAlign = "right"; ctx.font = "11px sans-serif"; ctx.fillStyle = "#B9B3C9"; ctx.fillText("¡Aprieta en lo verde!", bx + bw, by - 21);
    const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    const c = 0.5, gr = g.green, ye = g.yellow;
    const st = (p, col) => grd.addColorStop(Math.max(0, Math.min(1, p)), col);
    st(0, "#E5383B"); st(c - ye - 0.12, "#E5383B"); st(c - ye - 0.04, "#F28C28"); st(c - ye, "#F2C230"); st(c - gr - 0.002, "#F2C230");
    st(c - gr, "#43C35A"); st(c + gr, "#43C35A"); st(c + gr + 0.002, "#F2C230"); st(c + ye, "#F2C230"); st(c + ye + 0.04, "#F28C28"); st(c + ye + 0.12, "#E5383B"); st(1, "#E5383B");
    ctx.fillStyle = grd; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(bx + (c - gr) * bw - 1, by - 2, 2, bh + 4); ctx.fillRect(bx + (c + gr) * bw - 1, by - 2, 2, bh + 4);
    const mx = bx + g.m * bw;
    ctx.fillStyle = "#000"; ctx.fillRect(mx - 3, by - 5, 6, bh + 10);
    ctx.fillStyle = "#FFF3A6"; ctx.fillRect(mx - 2, by - 4, 4, bh + 8);
    if (g.verdict) { ctx.textAlign = "center"; ctx.font = "700 13px 'Courier New', monospace"; ctx.fillStyle = g.color; ctx.fillText(g.verdict, bx + bw / 2, by + bh + 12); }
  }

  // ---------- Bucle ----------
  function presettle() { quiet = true; for (let i = 0; i < 480; i++) physics(1 / 120); quiet = false; }
  fillMachine(); presettle(); fit();
  window.addEventListener("resize", fit);
  let last = performance.now(), acc = 0, raf = 0, alive = true;
  function loop(now) {
    if (!alive) return;
    const raw = Math.max(0, (now - last) / 1000); last = now;
    realClock += Math.min(raw, 0.25);
    const dt = Math.min(0.05, raw); tNow += dt; acc += dt;
    while (acc >= STEP) { updateClaw(STEP); physics(STEP); acc -= STEP; }
    if (claw.state === "MOVING" || claw.state === "CARRYING") { const s = Math.ceil(claw.timer); if (s !== lastTimerShown) { lastTimerShown = s; onTimer(s); } }
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    startTurn,
    setDir(d) { if (claw.state === "MOVING" || claw.state === "CARRYING") { dir = d; if (d) sfx.motorOn(); else sfx.motorOff(); } },
    action() {
      if (claw.state === "MOVING") drop();
      else if (claw.state === "GRIPPING") squeeze(false);
      else if (claw.state === "CARRYING") release();
    },
    setSound(on) { soundOn = on; if (!on) sfx.motorOff(); },
    state: () => publicState(),
    destroy() { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", fit); sfx.motorOff(); try { ac?.close(); } catch { /* */ } },
  };
}
