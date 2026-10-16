# Paleta de Colores & Guía Visual de Arquitectura
## Velasquez Builders Native CMS & CRM Ecosystem

Este documento detalla exhaustivamente las especificaciones de color, contrastes, roles semánticos y tokens cromáticos aplicados en cada sección del sitio web público y del panel administrativo nativo (VB Admin CMS / CRM).

---

## 1. Sistema Global de Tokens Cromáticos (Tailwind Design Tokens)

### 1.1 Paleta Primaria: `mint` (Verde Esmeralda / Marca & Acentos)
Representa construcción moderna, confianza ecológica, vitalidad y precisión técnica.
* **mint-50 (`#f0fdf6`)**: Fondos de tarjetas suaves, badges con fondo ligero, estados hover en navegación.
* **mint-100 (`#d1fae5`)**: Contenedores de iconos, bordes de realce sutiles.
* **mint-200 (`#a7f3d0`)**: Bordes de acento de tarjetas informativas.
* **mint-300 (`#6ee7b7`)**: Textos secundarios destacados en temas oscuros.
* **mint-400 (`#34d399`)**: Titulares iluminados (highlights), indicadores en vivo "Live Sync Active" y texto de héroe en `<span>`.
* **mint-500 (`#10b981`)**: Color principal de acento, bordes activos y radios de input.
* **mint-600 (`#059669`)**: Botones primarios ("Request Your Free Estimate", "Save & Publish", "Save"), tags de categorías.
* **mint-700 (`#047857`)**: Estado hover de botones primarios, badges de alerta positiva.
* **mint-800 (`#065f46`)**: Texto con fuerte contraste sobre fondos mint claros.
* **mint-900 (`#064e3b`)**: Sombras de acento y gradientes profundos.

### 1.2 Paleta Neutra: `charcoal` (Gris Pizarra / Construcción y Tipografía)
Equilibrio arquitectónico sobrio, sólido y de alta legibilidad.
* **charcoal-50 (`#f6f6f7`)**: Fondo de secciones alternas (Services, Process, Homes detail).
* **charcoal-100 (`#e2e3e5`)**: Bordes de tarjetas de servicios, inputs (`.qform-input`), divisores sutiles.
* **charcoal-200 (`#c5c6ca`)**: Párrafos sobre fondos oscuros (subtítulo de hero, overlay text).
* **charcoal-300 (`#9ea0a7`)**: Textos secundarios de estadísticas y footers.
* **charcoal-400 (`#7a7d86`)**: Labels de formularios, subtítulos de dirección y teléfono.
* **charcoal-500 (`#5e6069`)**: Cuerpo de párrafos en tarjetas claras.
* **charcoal-600 (`#4d4f56`)**: Descripciones y listas de características.
* **charcoal-700 (`#3f4147`)**: Enlaces de navegación inactivos, títulos de tarjetas de contacto.
* **charcoal-800 (`#2c2e33`)**: Títulos de servicios, íconos de hamburguesa.
* **charcoal-900 (`#1a1b1f`)**: Títulos de sección `H1/H2`, botones secundarios de portafolio, tarjetas oscuras de stats.
* **charcoal-950 (`#0e0f11`)**: Footer principal, overlays de video/lightbox, barra de navegación sticky.

### 1.3 Paleta Tierra: `earth` (Calidez & Materiales de Construcción)
* **earth-50 (`#fdf8f0`)** a **earth-500 (`#a8723a`)**: Utilizada en detalles decorativos de carpintería y acabados residenciales.

### 1.4 Paleta de Estado y Acciones
* **Esmeralda / Éxito**: `#10b981` / `#059669` (Live Sync, Guardado con éxito, badges aprobados).
* **Amarillo / Alerta / Preview**: `#eab308` / `#facc15` (Botón "👁️ Preview Site").
* **Azul / Configuración**: `#2563eb` / `#3b82f6` (Botones "💾 Export Config" y "📂 Import Config").
* **Rojo / Destructivo / Salida**: `#dc2626` / `#ef4444` (Botón "🚪 Logout" y eliminación de elementos).
* **Púrpura / CRM Leads**: `#8b5cf6` / `#7c3aed` (Etiquetas de estado de clientes potenciales).

---

## 2. Paleta Específica por Sección del Sitio Web Público

### A. Barra Superior y Navegación Principal (`<nav>`)
* **Fondo**: `bg-white/95` con `backdrop-blur-md` (efecto cristal esmerilado translúcido).
* **Borde inferior**: `border-b border-charcoal-100` (`#e2e3e5`).
* **Enlaces de navegación**: `text-charcoal-700` (`#3f4147`) con hover `text-mint-600` (`#059669`).
* **Enlace activo**: `text-mint-600 font-bold`.
* **Botón CTA "Get a Quote"**: Fondo `bg-mint-600` hover `bg-mint-700`, texto blanco `#ffffff`, sombra `shadow-mint-600/20`.

### B. Hero Section (Video de Fondo & Presentación de Marca)
* **Video Overlay**: Gradiente oscuro con superposición `from-charcoal-950/90 via-charcoal-950/70 to-charcoal-950/90`.
* **Badge Superior**: Fondo translúcido `bg-mint-600/20`, borde `border-mint-500/30`, texto `text-mint-300` con punto pulsante `bg-mint-400`.
* **Titular Principal**: Texto blanco `#ffffff` con realce `text-mint-400` (`#34d399`).
* **Descripción**: `text-charcoal-200` (`#c5c6ca`).
* **Botón Principal**: `bg-mint-600` hover `bg-mint-500`, texto blanco con sombra `shadow-mint-600/30`.
* **Botón Secundario (Teléfono)**: `bg-white/10` con borde `border-white/20`, texto `#ffffff` con backdrop blur.

### C. Bloque de Estadísticas Flotantes (Stats Bar)
* **Contenedor**: `bg-charcoal-900/80` (`#1a1b1f`) con `backdrop-blur-xl`, borde `border-white/10`, sombra `shadow-2xl`.
* **Cifras**: `text-mint-400` (`#34d399`) en tipografía tabular `tabular-nums`.
* **Etiquetas**: `text-charcoal-300` (`#9ea0a7`).

### D. Sección "Professional Construction Services"
* **Fondo de sección**: `bg-charcoal-50` (`#f6f6f7`).
* **Tarjetas de Servicio**: Fondo blanco `#ffffff`, borde `border-charcoal-100`, sombra suave.
* **Contenedor de Icono**: `bg-mint-50` (`#f0fdf6`), en hover cambia a `bg-mint-100` (`#d1fae5`).
* **Títulos de servicio**: `text-charcoal-900` (`#1a1b1f`).
* **Descripciones**: `text-charcoal-500` (`#5e6069`).
* **Tarjeta "View All Services"**: Gradiente `from-mint-600 to-mint-700` con texto blanco.

### E. Sección "Featured Projects" (Portfolio Galería)
* **Fondo de sección**: Blanco puro `#ffffff`.
* **Tarjetas de Galería**: Imagen con overlay gradiente oscuro `from-charcoal-950/80 to-transparent`.
* **Badge de Categoría**: `bg-mint-600` (`#059669`) con texto blanco.
* **Títulos & Ubicaciones**: Texto blanco `#ffffff` con subtítulos `text-white/80`.
* **Botón "View All Portfolio"**: `bg-charcoal-900` hover `bg-charcoal-800`, texto blanco.

### F. Sección "Homes We’ve Built" (Viviendas Residenciales de Autor)
* **Fondo de sección**: `bg-charcoal-50` (`#f6f6f7`).
* **Tarjetas de Proyectos**: Fondo blanco `bg-white`, borde `border-charcoal-100`, con hover shadow de alta elevación.
* **Badge Proyecto**: `bg-mint-600/90` con backdrop blur, texto blanco.
* **Badge Dirección**: Caja informativa `bg-mint-50/80` con borde `border-mint-200/80` y enlace `text-mint-800` subrayado en `decoration-mint-400`.
* **Lista de Atributos**: Iconos check en `text-mint-500`, texto descriptivo `text-charcoal-700`.
* **Botón "Inquire About Building Similar"**: `bg-mint-600` hover `bg-mint-700`, texto blanco con sombra.
* **Banner de Construcción Personalizada**: Gradiente oscuro `from-charcoal-950 via-charcoal-900 to-charcoal-950` con borde `border-charcoal-800`.

### G. Sección "Process" (Línea de Tiempo)
* **Fondo**: `bg-charcoal-50` (`#f6f6f7`).
* **Línea conectora vertical**: Gradiente `bg-gradient-to-b from-mint-500 to-mint-700`.
* **Burbuja de Paso (#)**: Fondo `bg-mint-600` con texto blanco y anillo perimetral `ring-4 ring-mint-100`.

### H. Sección "Our Team"
* **Fondo**: Blanco `#ffffff` con tarjetas `bg-charcoal-50`.
* **Nombre de miembro**: `text-charcoal-900`.
* **Cargo / Rol**: `text-mint-600 font-medium`.

### I. Formulario "Request Free Estimate"
* **Inputs & Selects (`.qform-input`)**: Fondo blanco `#ffffff`, borde `border-charcoal-100` (`#e2e3e5`), texto `text-charcoal-800`.
* **Enfoque (Focus state)**: Borde `border-mint-600` con anillo de brillo `ring-3 ring-mint-500/15`.
* **Botón de Envío**: `bg-mint-600` hover `bg-mint-700`, texto blanco, tipografía en negrita.
* **Mensaje de Éxito**: `bg-mint-50` con borde `border-mint-200`, texto `text-mint-600`.

### J. Footer & Copyright
* **Fondo**: `bg-charcoal-950` (`#0e0f11`).
* **Texto de derechos**: `text-charcoal-400` (`#7a7d86`).
* **Enlace CMS / CRM Engine**: `text-mint-400` hover `text-mint-300`, badge `bg-charcoal-900` con borde `border-charcoal-700`.

---

## 3. Paleta de la Interfaz del Panel Administrativo (VB Admin CMS / CRM)

### A. Barra Lateral Izquierda (Sidebar)
* **Fondo del sidebar**: Azul oscuro profundo / Pizarra `bg-slate-900` (`#0f172a`), borde derecho `border-slate-800` (`#1e293b`).
* **Cabecera "⚙️ VB Admin"**: Fondo `bg-slate-900/90`, texto blanco `#ffffff`, subtítulo `text-slate-400`.
* **Ítems de Menú Inactivos**: `text-slate-400 hover:text-white hover:bg-slate-800/60`.
* **Ítem de Menú Activo**: Fondo seleccionado `bg-slate-800 text-white font-bold` con barra lateral de acento verde `border-l-4 border-mint-500`.
* **Botón Amarillo Preview**: `bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold`.
* **Botón Azul Export/Import**: `bg-blue-600 hover:bg-blue-500 text-white font-semibold`.
* **Botón Rojo Logout**: `bg-rose-700/80 hover:bg-rose-600 text-white font-semibold`.

### B. Barra Superior de Control (Top Status Bar)
* **Fondo**: `bg-slate-900/95` con borde `border-slate-800`.
* **Indicador en tiempo real**: Insignia con círculo verde brillante `🟢 Live Sync Active` en `text-emerald-400`.
* **Botón Principal "💾 Save & Publish"**: Color verde esmeralda idéntico a la captura `bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-950/50`.

### C. Modal "Edit Portfolio"
* **Overlay**: Fondo semitransparente con desenfoque `bg-black/75 backdrop-blur-sm`.
* **Cuerpo del Modal**: `bg-slate-900`, borde sutil `border-slate-700`, sombra `shadow-2xl`.
* **Cabecera**: Título en blanco `text-white text-xl font-bold`, botón de cierre "✕" en `text-slate-400 hover:text-white`.
* **Inputs y Textarea**: Fondo `bg-slate-800`, borde `border-slate-700`, texto en blanco `text-white`, placeholder en `text-slate-500`, foco en `border-emerald-500 ring-2 ring-emerald-500/20`.
* **Botón "Cancel"**: Borde gris secundario `bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300`.
* **Botón "Save"**: Verde esmeralda `bg-emerald-600 hover:bg-emerald-500 text-white font-bold`.

---

## 4. Matriz Resumen de Códigos Hexadecimales

| Nombre del Token | Valor Hex | Uso Principal |
| :--- | :--- | :--- |
| `mint-50` | `#f0fdf6` | Fondos claros de iconos, badges ligeros |
| `mint-100` | `#d1fae5` | Anillos decorativos de estado |
| `mint-400` | `#34d399` | Resaltados de títulos y métricas en vivo |
| `mint-500` | `#10b981` | Enfoques de formularios y bordes activos |
| `mint-600` | `#059669` | Botones de llamada a la acción y categorías |
| `mint-700` | `#047857` | Hover de botones y gradientes |
| `charcoal-50` | `#f6f6f7` | Fondo alternado de secciones de contenido |
| `charcoal-100` | `#e2e3e5` | Bordes de inputs y líneas de división |
| `charcoal-200` | `#c5c6ca` | Textos claros sobre fondos oscuros |
| `charcoal-700` | `#3f4147` | Enlaces y tipografía secundaria |
| `charcoal-900` | `#1a1b1f` | Tipografía principal H1/H2 y tarjetas oscuras |
| `charcoal-950` | `#0e0f11` | Footer principal y fondo de video overlay |
| `slate-900` | `#0f172a` | Fondo de sidebar y paneles del VB Admin CMS |
| `slate-800` | `#1e293b` | Fondo de inputs y tarjetas en modo oscuro |
| `emerald-600` | `#059669` | Botón "Save & Publish" y botón "Save" modal |
| `amber-400` | `#fbbf24` | Botón "Preview Site" en sidebar |
| `rose-700` | `#be123c` | Botón "Logout" en sidebar |
