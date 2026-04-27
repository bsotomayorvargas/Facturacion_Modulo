# Design System & Component Doctrine - Facturación Módulo

## 1. Visual Identity & Aesthetic Vision
Facturación Módulo es una **herramienta B2B operativa y ejecutiva**. El diseño debe inspirar control, confianza técnica y limpieza corporativa.

### Core Tenets
- **Control Center Vibe:** Usamos el azul oscuro corporativo de Copec (`blue-950`) para anclar la aplicación visualmente en la barra lateral.
- **Data-Dense Tables:** Las grillas de datos no usan colores de distracción. La información es la reina.
- **Micro-interacciones Seguras:** Transiciones de 150ms-200ms `ease-out`. Evitar rebotes infantiles.

---

## 2. Component Doctrine

### Control Sidebar (Autenticación & Configuración)
- **Visual Behavior:** Fondo azul oscuro intenso (`bg-blue-950`), textos en blanco puro o `blue-200`. Inputs semi-transparentes (`bg-white/10`, `border-white/20`, texto blanco) para sensación de panel de control avanzado.

### Top Bars & Search
- **Visual Behavior:** Altamente sutiles. `bg-white`, borde inferior suave `border-slate-200`. Inputs con sombras internas sutiles (`shadow-inner`).
- **Botones Primarios:** Azules profundos (`bg-blue-800` a `bg-blue-900`) con shadow drop ligero.
- **Geometría:** Botones y cajas `rounded-sm` o `rounded-md`.

### Tablas (Data Grid)
- **Visual Behavior:** Tablas sin divisiones internas pesadas. `border-b border-slate-100` entre filas. Encabezados "sticky" limpios. 
- **Hover States:** Un `bg-blue-50/50` translúcido al hacer hover en la fila entera, permitiendo ver qué fila se va a afectar. Selección marca un sutil borde izquierdo `border-l-blue-600`.
- **Tipografía:** Usar SIEMPRE `tabular-nums` en columnas de moneda (Total Neto) o identificadores numéricos (DocNum).

### Badges de Estado
- **Éxito (Anticipo / 100% / Cierre):** Bordes claros, fondos ultra suaves (`bg-green-50`, `text-green-700`).
- **Peligro / Bloqueo:** Rojo suave o Ámbar (`bg-amber-50`, `border-amber-200`).
- Evitar píldoras completamente rellenas de colores saturados, que cansan la vista en tablas de muchos registros.

### Modals (Pop-ups de edición)
- **Visual Behavior:** Backdrop oscuro con desenfoque medio (`bg-slate-900/40 backdrop-blur-sm`). Fondo blanco inmaculado para la tarjeta.
- **Shadows:** `shadow-2xl` para elevarlo completamente por encima del fondo.
