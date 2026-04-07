# Lógica conceptual del Cubo de Rubik 3x3

El cubo de Rubik es un rompecabezas tridimensional que se presenta como un cubo dividido en veintiséis pequeñas piezas lógicas dispuestas en una cuadrícula de tres por tres por tres. Externamente muestra seis caras, cada una conformada por nueve casillas de color que representan las facetas visibles de las piezas. Convencionalmente se utilizan seis colores emparejados en lados opuestos: el blanco es opuesto al amarillo, el rojo al naranja, y el azul al verde. El objetivo lógico del rompecabezas es partir de un estado desordenado y, mediante una serie de rotaciones permitidas, agrupar los colores hasta que cada una de las seis caras muestre un solo color sólido e ininterrumpido.

## Tipos de piezas

Las piezas ocupan posiciones y roles específicos dentro de un sistema espacial, y se dividen en tres tipos fundamentales.

**Piezas centrales (6):** Poseen una única cara de color. Sus posiciones relativas nunca cambian entre sí, sin importar cuántos movimientos se realicen. El centro blanco siempre estará opuesto al centro amarillo y adyacente a los otros cuatro colores. Estas piezas son los puntos de referencia absolutos que determinan de qué color deberá ser cada cara cuando el cubo esté resuelto.

**Piezas de arista (12):** Tienen dos colores visibles y siempre ocupan las posiciones intermedias de los bordes, conectando dos caras adyacentes.

**Piezas de esquina (8):** Tienen tres colores visibles y siempre ocupan los vértices del cubo.

La identidad geométrica de cada pieza es inmutable: una esquina jamás podrá ocupar el espacio de una arista, y viceversa.

## Movimientos válidos

El único mecanismo de movimiento permitido es la rotación de caras completas. Una cara está compuesta por un centro, las cuatro aristas y las cuatro esquinas que lo rodean: nueve piezas en total. Al aplicar un movimiento, estas nueve piezas giran en bloque alrededor del eje del centro en incrementos de noventa grados. Es conceptualmente imposible mover, alterar o rotar una sola pieza de manera individual sin hacer girar a todo su grupo.

## Notación estándar (Singmaster)

Los movimientos se nombran por la cara que rotan, en sentido horario por defecto:

| Notación | Cara    | Dirección         |
|----------|---------|-------------------|
| U        | Superior (Up)   | Horario           |
| U'       | Superior        | Antihorario       |
| D        | Inferior (Down) | Horario           |
| D'       | Inferior        | Antihorario       |
| F        | Frontal (Front) | Horario           |
| F'       | Frontal         | Antihorario       |
| B        | Trasera (Back)  | Horario           |
| B'       | Trasera         | Antihorario       |
| L        | Izquierda (Left)| Horario           |
| L'       | Izquierda       | Antihorario       |
| R        | Derecha (Right) | Horario           |
| R'       | Derecha         | Antihorario       |
| X2       | Cualquiera      | Doble giro (180°) |

El sentido horario se define mirando la cara de frente desde el exterior del cubo.

## Leyes de paridad (estados imposibles)

Si un cubo se inicializa en su estado resuelto y se mezcla usando exclusivamente giros legales, siempre existirá una secuencia de movimientos para resolverlo. Sin embargo, si los colores o posiciones de las piezas se alteran directamente saltándose las reglas de rotación, el cubo puede caer en un estado matemáticamente irresoluble.

Existen tres anomalías que definen un cubo imposible de resolver:

1. **Arista invertida única:** No puede existir un estado en el que una sola pieza de arista esté invertida en su lugar mientras el resto del cubo está correcto.
2. **Esquina rotada única:** No puede haber una sola pieza de esquina rotada sobre sí misma (con sus colores desplazados) mientras el resto está correcto.
3. **Intercambio de exactamente dos piezas:** Es imposible que solo dos piezas (aristas o esquinas) hayan intercambiado sus posiciones mientras el resto del cubo permanece resuelto.

Si se detecta cualquiera de estas tres condiciones, el cubo está en un estado defectuoso y no puede resolverse mediante rotaciones válidas. Requiere una reestructuración del estado base para volver a ser lógicamente consistente.

## Implicaciones para la implementación virtual

- El estado del cubo debe inicializarse siempre desde el estado resuelto y modificarse únicamente mediante movimientos válidos, para garantizar que sea resoluble.
- Generar un estado aleatorio asignando colores directamente a las casillas sin respetar las reglas de paridad producirá con alta probabilidad un cubo irresoluble.
- La forma correcta de mezclar el cubo es aplicar una secuencia aleatoria de movimientos válidos sobre el estado resuelto.
