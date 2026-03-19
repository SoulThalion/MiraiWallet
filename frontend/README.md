# Mirai Wallet — Vue 3 App

Interfaz de finanzas personales construida con **Vue 3 Composition API**, **Tailwind CSS** y **Vitest**.

## Stack

| Tecnología | Uso |
|---|---|
| Vue 3 + Composition API | UI reactiva con `<script setup>` |
| Pinia | Estado global (wallet store) |
| Vue Router 4 | Navegación entre pantallas |
| Tailwind CSS 3 | Estilos utility-first + dark mode |
| Vite 5 | Build tool & dev server |
| Vitest + @vue/test-utils | Unit & component testing |

## Estructura

```
src/
├── assets/
│   └── main.css              # Tailwind + componentes globales (@layer)
├── components/
│   ├── AlertCard.vue         # Tarjeta de alerta con tipos y acciones
│   ├── BarChart.vue          # Gráfico de barras SVG-free con Tailwind
│   ├── BottomNav.vue         # Navegación inferior con RouterLink
│   ├── BudgetBar.vue         # Barra de progreso por categoría
│   ├── DonutChart.vue        # Gráfico donut SVG con leyenda
│   ├── MwLogo.vue            # Logo cartera azul + monedas + flecha verde
│   └── TransactionItem.vue   # Fila de movimiento bancario
├── composables/
│   ├── useCurrency.js        # formatEuro, amountColor, formatPct
│   └── useTheme.js           # isDark + clases Tailwind condicionales
├── stores/
│   └── wallet.js             # Pinia store: state, computed, actions
├── views/
│   ├── OnboardingView.vue    # Pantalla de bienvenida
│   ├── HomeView.vue          # Dashboard principal
│   ├── StatsView.vue         # Gráficos y estadísticas
│   ├── AlertsView.vue        # Alertas + presupuesto
│   ├── AddView.vue           # Formulario nuevo gasto
│   └── SettingsView.vue      # Ajustes + toggle de tema
├── App.vue                   # Shell del teléfono + router-view
└── main.js                   # Bootstrap: Pinia + Router + App

tests/
├── wallet.test.js            # 30+ tests del store (state, computed, actions)
├── useCurrency.test.js       # Tests del composable de moneda
├── TransactionItem.test.js   # Tests del componente de movimiento
├── AlertCard.test.js         # Tests del componente de alerta
└── BarChart.test.js          # Tests del gráfico de barras
```

## Primeros pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo
npm run dev

# 3. Ejecutar todos los tests
npm test

# 4. Tests con UI interactiva
npm run test:ui

# 5. Cobertura de tests
npm run test:coverage

# 6. Build de producción
npm run build
```

## Dark / Light mode

El tema se controla desde el **Pinia store** (`store.toggleDark()`).  
El componente `SettingsView` incluye un botón para cambiarlo en runtime.  
Tailwind usa `darkMode: 'class'` — el componente raíz aplica la clase `dark` o `light` según el estado.

## Añadir un gasto

`store.addTransaction({ description, category, amount, date })` actualiza reactivamente:
- La lista de `transactions`
- El `balance` total
- Los computed `totalExpenses` y `saved`

## Tests

```
✓ wallet store           (30 tests)
✓ useCurrency            (9 tests)
✓ TransactionItem.vue    (8 tests)
✓ AlertCard.vue          (9 tests)
✓ BarChart.vue           (4 tests)
─────────────────────────
  Total: 60 tests
```

## Layout responsive

| Breakpoint | Layout |
|---|---|
| `< md` (< 768px) | Sin sidebar. Bottom nav fija en la parte inferior. Contenido a pantalla completa. |
| `md` (768–1023px) | Sidebar colapsado (iconos, 64px). Top bar con título y acciones. Sin bottom nav. |
| `lg` (≥ 1024px) | Sidebar expandido (iconos + texto, 224px) colapsable. Top bar con saldo visible. Grids de 3 columnas. |

El tema dark/light se aplica como clase `dark` / `light` en el div raíz y todas las clases Tailwind usan el selector `.dark .class` / `.light .class` para adaptarse.
