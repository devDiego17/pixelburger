# Juego de la garra — diseño y auditoría

Prototipo 2D: [`juego-garra/garra-pixel-burger.html`](../juego-garra/garra-pixel-burger.html) (se abre en cualquier navegador). Versión publicada: https://claude.ai/artifact/TCptQmnD5VJBfusW1q4wjw

## Cómo se juega

1. **Apuntar (10 s):** la garra cuelga del carro como un péndulo y el carro tiene inercia. Una sombra amarilla muestra dónde caería. Al pulsar AGARRAR baja recta desde donde estaba.
2. **Barra de agarre estilo FIFA:** al tocar el peluche aparece una barra rojo → amarillo → verde → amarillo → rojo con una aguja que va y viene. Verde = agarre firme; amarillo = se resbala en el camino; rojo = no agarra; sin tocar en 3,2 s = falla. El verde se achica con mala puntería, peluches pesados o enterrados; la aguja va más rápido con menos fuerza.
3. **Llevar y soltar (8 s):** el jugador lo lleva a la SALIDA y pulsa SOLTAR. Sale con la inercia del carro y parte del balanceo; puede rebotar fuera.

Peluches: Clásica, Montañera, Cheese, Chorizo, Byte (difícil), Dorada (rara, muy difícil). Todo es habilidad; no hay azar en el agarre.

## Calibración (simulación, fuerza Normal)

| Precisión al apretar | Muy fuerte | Normal | Muy débil |
|---|---|---|---|
| Buenos reflejos (±50 ms) | 88% | ~50–59% | 30% |
| Promedio (±80 ms) | 69% | ~38–43% | 24% |
| Torpe (±130 ms) | 44% | ~31% | 9% |

Meta: 25–40% de premios en Normal con jugadores reales. Validar con 10–20 personas.

Historial de ajustes: tolerancia de puntería (demasiado estricta al inicio), dedos que empujaban las hamburguesas al bajar, balanceo durante la bajada, salida demasiado angosta, inercia del balanceo al soltar, «enterrado» que contaba vecinos laterales.

## Auditoría (8 de octubre de 2026)

| # | Problema | Severidad | Estado |
|---|---|---|---|
| V1 | Fichas infinitas con un guardado corrupto (`fichas: "abc"`) | Alta | Corregido |
| V2 | Guardado sin validar (`__proto__`, fuerza inválida) | Moderada | Corregido |
| V3 | Cámara lenta con FPS bajos facilitaba la barra | Moderada | Corregido (reloj real) |
| V4 | «Borrar progreso» a mitad de turno reembolsaba fichas | Moderada | Corregido |
| V5 | Varias pestañas duplicaban fichas | Moderada | Mitigado (relee el saldo) |
| V6 | Un bot que lee la aguja gana 100% | Crítica en producción | Solo se acota con servidor |
| V7 | El jugador controla su saldo en el navegador | Crítica en producción | Requiere servidor |
| F1 | Estadísticas que no cuadraban | Baja | Corregido |
| F2 | Teclas sin soltar al perder el foco | Baja | Corregido |

Además: aguja dibujada una vez por cuadro y marcas en los bordes del verde (daltonismo). 12/12 pruebas de regresión pasan.

## Antes de producción

1. Quitar el panel de Prueba.
2. Servidor que emita fichas con cada compra, con un identificador único por partida y el resultado registrado en el servidor.
3. Topes diarios de partidas y de XP.
4. Validación de tiempos de toque en el servidor para detectar bots.
5. Revisión legal (Coljuegos) si la XP cuenta para premios.
6. Prueba con 10–20 personas reales.
