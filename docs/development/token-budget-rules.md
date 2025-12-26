# TOKEN BUDGET RULES

## Reglas de Segmentación Automática

Este documento define **criterios objetivos** para determinar cuándo un checkpoint debe dividirse en fases.

---

## 📏 Criterios Cuantitativos

### DIVIDIR si cumple ≥2 de estos criterios:

| Criterio                        | Umbral             | Razón                                              |
| ------------------------------- | ------------------ | -------------------------------------------------- |
| **Archivos a crear**            | ≥15 archivos       | Riesgo de código condensado                        |
| **Endpoints/Use Cases**         | ≥5 endpoints       | Complejidad de validación alta                     |
| **Líneas de código estimadas**  | ≥2000 líneas       | Excede budget típico de tokens                     |
| **Servicios externos**          | ≥3 servicios       | Integración compleja (DB + RabbitMQ + Redis, etc.) |
| **Capas de Clean Architecture** | ≥3 capas completas | Domain + Application + Infrastructure              |
| **Tests requeridos**            | ≥10 test suites    | Volumen alto de validación                         |
| **Modelos de base de datos**    | ≥4 models          | Complejidad de schema                              |

---

## 🎯 Aplicación por Tipo de Checkpoint

### CHECKPOINT de Arquitectura (ej: CHECKPOINT 0)

✅ **NO dividir** - Son documentos de diseño, no código

### CHECKPOINT de Monorepo Base (ej: CHECKPOINT 1)

✅ **NO dividir** - Setup inicial simple

### CHECKPOINT de API Gateway (ej: CHECKPOINT 2)

🟡 **EVALUAR** según criterios:

- Si ≥5 middlewares → Dividir
- Si integración compleja → Dividir

### CHECKPOINT de Microservicio (ej: CHECKPOINT 3+)

🔴 **DIVIDIR SIEMPRE** en:

- X.A — CORE (Domain + Application)
- X.B — INFRASTRUCTURE DATA
- X.C — INFRASTRUCTURE HTTP
- X.D — TESTING + DOCS

---

## 📊 Tabla de Estimación Rápida

| Tipo de Servicio | Archivos | Líneas | Endpoints | Segmentar                      |
| ---------------- | -------- | ------ | --------- | ------------------------------ |
| Auth Service     | ~25      | ~3000  | 5         | ✅ SÍ (4 fases)                |
| Products Service | ~30      | ~3500  | 8         | ✅ SÍ (4 fases)                |
| Orders Service   | ~35      | ~4000  | 7         | ✅ SÍ (4 fases)                |
| Payments Service | ~28      | ~3200  | 6         | ✅ SÍ (4 fases)                |
| Notifications    | ~20      | ~2000  | 4         | 🟡 EVALUAR (puede ser 3 fases) |
| API Gateway      | ~18      | ~1500  | 0         | 🟡 EVALUAR                     |
| Shared Packages  | ~10      | ~800   | 0         | ✅ NO                          |

---

## 🚨 Señales de Alerta Durante Implementación

### Red Flags que Indican Segmentación Necesaria

Si aparecen estas frases en respuestas:

```
❌ "Debido al límite de espacio..."
❌ "Voy a crear de forma condensada..."
❌ "Por el límite de tokens..."
❌ "Necesito hacer esto optimizado..."
❌ "Saltaré algunos tests por espacio..."
❌ "Documentación resumida..."
```

**ACCIÓN INMEDIATA:**

1. Detener generación de código
2. Guardar progreso actual (commit)
3. Proponer nueva división más granular
4. Esperar confirmación del usuario

---

## 📐 Cálculo de Token Budget

### Estimación de Tokens por Tipo de Contenido

| Tipo de Contenido         | Tokens Promedio | Ejemplo                            |
| ------------------------- | --------------- | ---------------------------------- |
| Entity (Domain)           | ~150-250 tokens | User.ts con 5 métodos              |
| Use Case completo         | ~300-500 tokens | RegisterUserUseCase con validación |
| Repository Implementation | ~200-400 tokens | UserRepository con CRUD            |
| Controller                | ~250-400 tokens | AuthController con 5 endpoints     |
| Test Suite                | ~300-600 tokens | 10 tests unitarios                 |
| Sequelize Model           | ~200-350 tokens | User model con indexes             |
| Middleware                | ~100-200 tokens | CorrelationId middleware           |
| Documentation             | ~400-800 tokens | TEST-SERVICE.md                    |

### Budget Total Disponible

- **Límite seguro por turno**: ~70,000 tokens
- **Reserva para contexto**: ~20,000 tokens
- **Disponible para código**: ~50,000 tokens

### Ejemplo de Cálculo: Auth Service

```
Auth Service Completo:
- 6 Entities: 6 × 200 = 1,200
- 5 Use Cases: 5 × 400 = 2,000
- 2 Repositories: 2 × 300 = 600
- 2 Services: 2 × 300 = 600
- 2 Models: 2 × 250 = 500
- 1 Controller: 400
- 1 Routes: 300
- 5 Middlewares: 5 × 150 = 750
- 10 Test Suites: 10 × 400 = 4,000
- Documentation: 1,000
- Server setup: 500
TOTAL: ~12,000 tokens

Contexto + Respuestas: ~30,000 tokens adicionales
GRAN TOTAL: ~42,000 tokens

✅ Cabe en un turno PERO con riesgo de condensación al final
🎯 RECOMENDACIÓN: Dividir en 4 fases para calidad óptima
```

---

## 🔄 Workflow de Evaluación

```mermaid
START
  ↓
¿Checkpoint de microservicio?
  ├─ NO → Evaluar criterios cuantitativos
  │        ├─ Cumple ≥2 criterios → DIVIDIR
  │        └─ Cumple <2 criterios → NO DIVIDIR
  │
  └─ SÍ → DIVIDIR SIEMPRE en 4 fases
           (X.A, X.B, X.C, X.D)
```

---

## 📋 Checklist Pre-Implementation

Antes de empezar cualquier checkpoint, responder:

```markdown
□ 1. ¿Es un microservicio completo? → Auto-dividir en 4 fases
□ 2. ¿Cuántos archivos se crearán? → Si ≥15, dividir
□ 3. ¿Cuántos endpoints? → Si ≥5, dividir
□ 4. ¿Cuántas líneas estimadas? → Si ≥2000, dividir
□ 5. ¿Cuántos servicios externos? → Si ≥3, dividir
□ 6. ¿Cumple ≥2 criterios de división? → Proponer fases al usuario
□ 7. Usuario confirmó la división → Proceder con fase X.A
```

---

## 🎓 Ejemplos Prácticos

### Ejemplo 1: Auth Service (CHECKPOINT 3)

**Evaluación:**

- ✅ Microservicio completo → AUTO-DIVIDIR
- ✅ ~25 archivos → Excede umbral
- ✅ 5 endpoints → En el límite
- ✅ 3 servicios externos (PostgreSQL, RabbitMQ, JWT)
- ✅ 3 capas (Domain, Application, Infrastructure)

**Decisión**: DIVIDIR en 4 fases (3.A, 3.B, 3.C, 3.D)

### Ejemplo 2: Shared Logger Package

**Evaluación:**

- ❌ No es microservicio
- ❌ ~5 archivos → Bajo umbral
- ❌ 0 endpoints
- ❌ 1 servicio externo (Winston)
- ✅ ~500 líneas → Bajo

**Decisión**: NO DIVIDIR - Implementar en 1 turno

### Ejemplo 3: API Gateway Simple

**Evaluación:**

- ❌ No es microservicio
- ✅ ~18 archivos → Cerca del umbral
- ❌ 0 endpoints propios (solo proxy)
- 🟡 2 servicios externos (rate limiter, JWT validation)
- ✅ ~1500 líneas

**Decisión**: EVALUAR - Si incluye muchos middlewares → Dividir en 2-3 fases

---

## 📝 Template de Propuesta de División

Cuando se cumplan criterios, usar este template:

```markdown
📊 EVALUACIÓN DE TOKEN BUDGET - CHECKPOINT X

Análisis:

- Archivos estimados: [N] (umbral: 15)
- Endpoints: [N] (umbral: 5)
- Líneas de código: ~[N] (umbral: 2000)
- Servicios externos: [N] (umbral: 3)
- Capas Clean Architecture: [N] (umbral: 3)

Criterios cumplidos: [N]/7

🎯 RECOMENDACIÓN: DIVIDIR en [N] fases

Propuesta de división:

- X.A — CORE: [alcance]
- X.B — INFRASTRUCTURE DATA: [alcance]
- X.C — INFRASTRUCTURE HTTP: [alcance]
- X.D — TESTING + DOCS: [alcance]

Estimación por fase:

- X.A: ~[N] archivos, ~[N] líneas, ~[N] tokens
- X.B: ~[N] archivos, ~[N] líneas, ~[N] tokens
- X.C: ~[N] archivos, ~[N] líneas, ~[N] tokens
- X.D: ~[N] archivos, ~[N] líneas, ~[N] tokens

¿Confirmas esta división?
```

---

## ⚖️ Balance: Calidad vs Velocidad

**Regla de Oro:**

> Es mejor invertir 4 turnos con código limpio y testeado,
> que 1 turno con código condensado e incompleto.

**Métricas de Éxito:**

- ✅ Coverage >= 75% en cada fase
- ✅ Tests pasan al finalizar cada fase
- ✅ Documentación clara y completa
- ✅ Código revisable y mantenible
- ✅ Cero "TODOs" por falta de tiempo
