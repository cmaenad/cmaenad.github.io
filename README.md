# 🎲 Cubo Mágico Web

Juego de cubo Rubik 3x3 para navegador, con colores personalizados según la bandera del país del usuario.

## Cómo jugar

1. Abre `index.html` en Chrome (móvil Android 13 o PC).
2. Concede permiso de ubicación para obtener los colores de la bandera de tu país.
3. Usa los botones centrales de cada cara para girarla (click = horario, click derecho = antihorario).
4. Usa los botones de vista (▲▼◀▶) para rotar la perspectiva y ver todas las caras.
5. **Revolver** mezcla el cubo aleatoriamente. **Resolver** lo devuelve al estado resuelto animando cada paso. **Reiniciar** lo vuelve al estado inicial.
6. El botón **🎨 Colores** permite cambiar entre colores clásicos, país al azar o tu ubicación actual.
7. El estado se guarda automáticamente: al reabrir la pestaña, el cubo queda exactamente como lo dejaste.

## Controles

| Acción | Móvil | PC |
|---|---|---|
| Girar capa | Toca el botón central de la cara | Click (horario) / Click derecho (antihorario) |
| Girar vista | Botones ▲▼◀▶ o swipe | Mismos botones o teclas `u d f b l r` |
| Movimiento inverso | Long-press en botón de cara | Click derecho |

## Tecnologías utilizadas

### Vanilla JavaScript (ES6+ con módulos)
Sin frameworks ni librerías externas. El código está dividido en módulos ES6 para mantener la separación de responsabilidades.

### CSS3 3D Transforms
El cubo se renderiza completamente en CSS usando `transform-style: preserve-3d`, `perspective`, `rotateX/Y/Z` y `translateZ`. Cada cara es un `div` posicionado en el espacio 3D. No se usa WebGL ni Canvas.

### Geolocation API
Se usa `navigator.geolocation.getCurrentPosition()` para obtener las coordenadas del usuario. Luego se hace una llamada a la API pública de [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org/) para obtener el código de país (ISO 3166-1 alpha-2).

### Colores de banderas
Los colores de cada bandera están definidos como paleta hardcodeada por código de país. Si la bandera tiene menos de 6 colores, se completan con los complementos RGB (`255 - R`, `255 - G`, `255 - B`), garantizando siempre exactamente 6 colores únicos para las 6 caras.

### localStorage
Toda la sesión (estado del cubo, colores, ángulos de vista) se serializa y se guarda en `localStorage` bajo la clave `rubik_session` en cada movimiento.

### Motor del cubo (tablas de permutación)
El estado del cubo se representa como un array plano de 54 enteros. Cada movimiento es una tabla de permutación precalculada de 54 entradas, construida una sola vez al cargar el módulo. Aplicar un movimiento es simplemente `newState[i] = oldState[perm[i]]` — O(54), sin lógica de ciclos en tiempo de ejecución.

### Web Worker para el solver
El solver corre en un Web Worker para no bloquear el hilo principal. Cuando el cubo se mezcla con el botón "Revolver", la solución se calcula como la inversa exacta de la secuencia de mezcla, garantizando que siempre funciona.

## Herramientas de desarrollo (Kiro)

Este proyecto fue desarrollado con [Kiro](https://kiro.dev), un IDE con IA. Se usaron las siguientes herramientas:

### Steering Rules (`.kiro/steering/rubik-game.md`)
Archivo de instrucciones persistentes que guían al agente en cada sesión. Define el stack tecnológico (vanilla JS, sin dependencias), la arquitectura de módulos, las convenciones de código y las reglas de persistencia. El agente las lee automáticamente en cada prompt, manteniendo consistencia a lo largo de todo el desarrollo.

### Hooks (`.kiro/hooks/`)
Automatizaciones que se disparan en respuesta a eventos del IDE:

- **`session-save.json`** — Hook de tipo `fileEdited`: cada vez que se edita un archivo JS, recuerda al agente que toda función que modifique el estado del cubo debe llamar a `session.save()`.
- **`no-dependencies.json`** — Hook de tipo `preToolUse`: antes de escribir cualquier archivo, verifica que no se introduzcan dependencias externas ni frameworks.
- **`auto-commit.json`** — Hook de tipo `agentStop`: hace `git add`, `commit` y `push` automáticamente cada vez que el agente termina de responder.

### Specs
Las especificaciones de Kiro se usaron para definir y refinar iterativamente los requisitos del juego: física del cubo, modelo de estado, colores por geolocalización y persistencia de sesión. El archivo `.kiro/rubik-logic.md` documenta la lógica conceptual del cubo que guía la implementación.

## Estructura del proyecto

```
index.html              # Estructura HTML
style.css               # Estilos y layout 3D
js/
  app.js                # Bootstrap y coordinación
  cube.js               # Motor del cubo (tablas de permutación)
  renderer.js           # Renderizado CSS 3D
  controls.js           # Botones, teclado y touch
  location.js           # Geolocalización y paletas de banderas
  session.js            # Persistencia en localStorage
  solver-worker.js      # Solver en Web Worker
test-moves.html         # Tests del motor del cubo
.kiro/
  steering/
    rubik-game.md       # Reglas de desarrollo (Steering)
  hooks/
    session-save.json   # Hook: verifica persistencia al editar JS
    no-dependencies.json # Hook: previene dependencias externas
    auto-commit.json    # Hook: commit automático tras cada respuesta
  rubik-logic.md        # Documentación conceptual del cubo
```

## Requisitos

- Navegador moderno con soporte ES6 modules (Chrome 61+, Firefox 60+, Safari 11+)
- Para geolocalización: HTTPS o `localhost`
- Para servir localmente: `npx serve .` o cualquier servidor estático
