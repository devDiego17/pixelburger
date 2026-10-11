# Pixel Burger

Hamburguesería con identidad gamer en Robledo – Santa Margarita (Medellín). Apertura: 1 de noviembre de 2026. Este repositorio reúne el sistema financiero y administrativo, la campaña de apertura, las compras y el juego de la garra.

## Estructura

| Carpeta / archivo | Qué contiene |
|---|---|
| `Documento Maestro - Pixel Burger.docx` | Visión, etapas del negocio y decisiones clave |
| `NumerosBurger.xlsx` / `.pdf` | Modelo financiero: capital inicial, ventas, recetas, food cost, compras, operación mensual, punto de equilibrio, flujo de caja |
| Documentos `*.docx` de la raíz | Políticas y manuales: compras, distribución del dinero, manejo de caja, apertura y cierre, producción, servicio, domicilios, inventario, canales, competencia, concepto y cronograma |
| `RangoDeDomicilios.png` | Mapa del radio de domicilios |
| `Mision Pixel - Sistema de XP.xlsx` | Sistema de XP de la Misión Pixel: jugadores, movimientos, ranking, logros, mensajes y formulario |
| `campana/` | Presentación «Cargando» para la campaña de apertura (PDF y fuente de las diapositivas) |
| `compras/` | Cotización de proveedores, investigación de abastecimiento (ChatGPT y Perplexity), solicitud a Distrimonster y precios de carne |
| `cronograma/camino-a-la-apertura.html` | Cronograma interactivo de las 7 semanas previas a la apertura |
| `juego-garra/garra-pixel-burger.html` | Prototipo 2D del juego de la garra (abrir en el navegador) |
| `notas/` | Análisis: guía de fondos y liquidez, auditoría de costos, comparativo Distrimonster, diseño y auditoría de la garra, propuesta de XP |
| `herramientas/generar-sistema-xp.py` | Script que genera la hoja del sistema de XP (requiere `openpyxl`) |
| `marca/` | Imágenes de marca |

## Versiones en línea (Claude)

- Presentación de la campaña: https://claude.ai/artifact/6KX1jD92e8AXqDS6L91Sun
- Juego de la garra: https://claude.ai/artifact/TCptQmnD5VJBfusW1q4wjw
- Cronograma: https://claude.ai/artifact/DRdyhRUmMFAdM2mj8rv4Gz
- Solicitud de cotización a Distrimonster: https://claude.ai/code/artifact/24801eb1-b216-4c66-b3d0-64f929842d98

Estos enlaces son privados: solo los ve quien tenga acceso en Claude.

## Estado (8 de octubre de 2026)

- Proveedores en prueba: Distrimonster (carne 73/27, pan brioche, BBQ, cheddar, aceite, salsa cheddar), Mundo Huevo, carnicería y Merca Líder.
- Pendiente medir en la prueba de producción: loncha de queso, hojas por lechuga, porción de cebolla caramelizada, merma de cocción.
- Capital inicial corregido: ≈ $4.273.000 + revisión de la moto + equipos pequeños (la moto fue un aporte del socio).
- La garra da XP (no hamburguesas); lanzamiento sugerido en una tablet del mostrador.

## Cómo trabajamos con ramas (Git Flow)

| Rama | Para qué | Quién escribe |
|---|---|---|
| `main` | Lo que está en producción (lo que ven los clientes). | Nadie directo: solo se fusiona desde `develop` o un `hotfix/*`. |
| `develop` | Integración: lo que ya funciona y va para la próxima versión. | Se fusiona desde las ramas de cada socio. |
| `feature/diego` | Trabajo en curso de Diego. | Diego |
| `feature/juan` | Trabajo en curso de Juan. | Juan |

Para tareas grandes se puede abrir una rama por tarea, por ejemplo `feature/juan-papas`, siempre saliendo de `develop`.

**Día a día**

```bash
git checkout feature/juan          # tu rama
git pull origin develop            # trae lo último que integró el equipo
# ... trabajas y haces commits ...
git push origin feature/juan
```

Cuando algo está listo, se abre un Pull Request de `feature/juan` → `develop` en GitHub y el otro socio lo revisa.

**Sacar una versión:** Pull Request de `develop` → `main` y una etiqueta (`git tag v1.0.0`).

**Arreglo urgente en producción:** rama `hotfix/descripcion` desde `main`, se fusiona a `main` y también a `develop`.
