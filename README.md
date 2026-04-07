# 🎲 Cubo Mágico Web

Juego de cubo Rubik 3x3 para navegador, con colores personalizados según la bandera del país del usuario.

## Cómo jugar

1. Abre `index.html` en Chrome (móvil Android 13 o PC).
2. Concede permiso de ubicación para obtener los colores de la bandera de tu país.
3. Usa las flechas sobre el cubo para girar las capas.
4. Usa los botones de vista (▲▼◀▶) para rotar la perspectiva y ver todas las caras.
5. **Revolver** mezcla el cubo aleatoriamente. **Resolver** lo devuelve al estado resuelto animando cada paso. **Reiniciar** lo vuelve al estado inicial sin animación.
6. El estado se guarda automáticamente: al reabrir la pestaña, el cubo queda exactamente como lo dejaste.

## Controles

| Acción | Móvil | PC |
|---|---|---|
| Girar capa | Toca la flecha correspondiente | Click en flecha / teclas `u d f b l r` (mayúscula = antihorario) |
| Girar vista | Botones ▲▼◀▶ | Mismos botones |
| Movimiento inverso | Click derecho en flecha | Click derecho en flecha |
| Swipe rápido | Desliza sobre el cubo | — |

## Tecnologías utilizadas

### Vanilla JavaScript (ES6+ con módulos)
Sin frameworks ni librerías externas. El código está dividido en módulos ES6 (`import/export`) para mantener la separación de responsabilidades.

### CSS3 3D Transforms
El cubo se renderiza completamente en CSS usando `transform-style: preserve-3d`, `perspective`, `rotateX/Y/Z` y `translateZ`. Cada cara es un `div` posicionado en el espacio 3D. No se usa WebGL ni Canvas.

### Geolocation API
Se usa `navigator.geolocation.getCurrentPosition()` para obtener las coordenadas del usuario. Luego se hace una llamada a la API pública de [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org/) para obtener el código de país (ISO 3166-1 alpha-2) a partir de las coordenadas.

### Colores de banderas
Los colores de cada bandera están definidos como paleta hardcodeada por código de país. Si la bandera tiene menos de 6 colores, se completan con los complementos RGB (`255 - R`, `255 - G`, `255 - B`) de los colores existentes, garantizando siempre exactamente 6 colores únicos para las 6 caras del cubo.

### localStorage
Toda la sesión (estado del cubo, colores, ángulos de vista) se serializa a JSON y se guarda en `localStorage` bajo la clave `rubik_session` en cada movimiento. Al cargar la página, se restaura automáticamente.

### Solver capa por capa (BFS)
El botón "Resolver" usa un algoritmo BFS (Breadth-First Search) por fases inspirado en el método principiante:
1. Cruz superior
2. Esquinas superiores
3. Capa media
4. Cruz inferior
5. Resolución final

Cada fase busca la secuencia de movimientos más corta que satisface su condición objetivo, trabajando sobre clones del estado para no modificar el cubo hasta confirmar la solución.

## Estructura del proyecto

```
index.html          # Estructura HTML
style.css           # Estilos y layout 3D
js/
  app.js            # Bootstrap y coordinación
  cube.js           # Modelo de estado del cubo (rotaciones, serialización)
  renderer.js       # Renderizado CSS 3D
  controls.js       # Botones, flechas, teclado y touch
  location.js       # Geolocalización y paletas de banderas
  session.js        # Persistencia en localStorage
  solver.js         # Algoritmo de solución BFS
.kiro/
  steering/
    rubik-game.md   # Reglas de desarrollo del proyecto
  hooks/
    session-save.json    # Hook: verifica persistencia al editar JS
    no-dependencies.json # Hook: previene dependencias externas
```

## Requisitos

- Navegador moderno con soporte ES6 modules (Chrome 61+, Firefox 60+, Safari 11+)
- Para geolocalización: HTTPS o `localhost` (requerido por el navegador)
- Para servir localmente: `npx serve .` o cualquier servidor estático
