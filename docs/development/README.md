# DEVELOPMENT DOCUMENTATION

Documentación de procesos de desarrollo y estrategias de implementación.

---

## 📂 Archivos en este Directorio

### [DEVELOPMENT-STRATEGY.md](./DEVELOPMENT-STRATEGY.md)

**Propósito:** Estrategia maestra para implementación por fases

**Contenido:**

- Workflow de 3 pasos (pre-checkpoint, durante, post-fase)
- Cuándo aplicar segmentación por fases
- Compromiso de calidad sin atajos

**Cuándo consultar:**

- ✅ Antes de iniciar CUALQUIER checkpoint
- ✅ Al detectar "red flags" durante implementación
- ✅ Al finalizar cada fase para validar

---

### [token-budget-rules.md](./token-budget-rules.md)

**Propósito:** Reglas cuantitativas para segmentación automática

**Contenido:**

- Umbrales objetivos (≥15 archivos, ≥5 endpoints, ≥2000 líneas, ≥3 servicios externos)
- Cálculo de tokens por componente (entity ~200, use case ~400, controller ~300, test ~400)
- Red flags que activan stop inmediato
- Ejemplo de Auth Service (42,000 tokens estimados)

**Cuándo consultar:**

- ✅ Durante la evaluación pre-checkpoint (paso 1 del workflow)
- ✅ Cuando tienes dudas si segmentar o no
- ✅ Para calcular número de fases necesarias

---

### [checkpoint-templates.md](./checkpoint-templates.md)

**Propósito:** Templates detallados para cada fase de implementación

**Contenido:**

- **Fase A — CORE:** Domain + Application layers
- **Fase B — DATA:** Infrastructure data (DB, repositories, services)
- **Fase C — HTTP:** Controllers, routes, middlewares, messaging
- **Fase D — TESTING + DOCS:** Tests completos, manual tests, documentación

Cada template incluye:

- Alcance específico
- Estructura de archivos
- Entregables mínimos
- Tests requeridos con coverage mínimo
- Criterios de aceptación
- Prompts sugeridos

**Cuándo consultar:**

- ✅ Al iniciar cada fase (X.A, X.B, X.C, X.D)
- ✅ Para verificar entregables mínimos
- ✅ Para copiar estructura de prompts

---

## 🔄 Workflow de Uso

### 1️⃣ Pre-Checkpoint (Planificación)

```bash
# 1. Lee DEVELOPMENT-STRATEGY.md (sección "Paso 1")
# 2. Consulta token-budget-rules.md
# 3. Decide si segmentar el checkpoint
# 4. Si segmentas, planifica fases usando checkpoint-templates.md
```

**Resultado:** Plan de ejecución claro (1 turno o múltiples fases)

---

### 2️⃣ Durante Implementación (Monitoreo)

```bash
# 1. Lee DEVELOPMENT-STRATEGY.md (sección "Paso 2")
# 2. Monitorea red flags de token-budget-rules.md
# 3. Si detectas red flag: DETÉN, genera checkpoint, y segmenta
# 4. Sigue template de fase actual en checkpoint-templates.md
```

**Resultado:** Implementación controlada sin condensación de código

---

### 3️⃣ Post-Fase (Validación)

```bash
# 1. Lee DEVELOPMENT-STRATEGY.md (sección "Paso 3")
# 2. Verifica checklist de checkpoint-templates.md para fase actual
# 3. Ejecuta tests: `pnpm test:coverage`
# 4. Confirma coverage >= mínimo de fase
# 5. Si hay siguiente fase, repite workflow desde paso 2️⃣
# 6. Si es última fase, genera validation report
```

**Resultado:** Fase completa y validada antes de continuar

---

## 🎯 Ejemplo de Aplicación: Auth Service

### Evaluación Inicial

```
✓ Consulté token-budget-rules.md
✓ Auth Service: ~42,000 tokens (umbral: 30,000)
✓ 25+ archivos (umbral: 15)
✓ 5 endpoints (umbral: 5)
✓ 3 servicios externos: Sequelize, RabbitMQ, Argon2
→ RESULTADO: Segmentar en 4 fases
```

### Ejecución

```
Fase 3.A (CORE):
- Consulté checkpoint-templates.md — Fase A
- Implementé Domain + Application (9 archivos)
- Tests unitarios: 85% coverage ✅
- Validé checklist de Fase A ✅

Fase 3.B (DATA):
- Consulté checkpoint-templates.md — Fase B
- Implementé Sequelize + Models + Services (8 archivos)
- PROBLEMA: Llegué a repositories y apareció "Debido al límite..."
- ACCIÓN: Detuve, marqué fase 3.B al 60%, generé checkpoint
→ Pendiente: Completar repositories en siguiente turno

Fase 3.C (HTTP): ⏳ Pendiente
Fase 3.D (TESTING + DOCS): ⏳ Pendiente
```

---

## 📋 Checklist Rápido

Antes de cada checkpoint:

- [ ] ¿Leí [DEVELOPMENT-STRATEGY.md](./DEVELOPMENT-STRATEGY.md)?
- [ ] ¿Evalué con [token-budget-rules.md](./token-budget-rules.md)?
- [ ] ¿Planifiqué fases con [checkpoint-templates.md](./checkpoint-templates.md)?
- [ ] ¿Actualicé [CHECKPOINTS.md](../project/CHECKPOINTS.md)?

Durante implementación:

- [ ] ¿Monitoreo red flags?
- [ ] ¿Sigo template de fase actual?
- [ ] ¿Escribo tests mientras implemento?

Al finalizar fase:

- [ ] ¿Tests pasan?
- [ ] ¿Coverage >= mínimo?
- [ ] ¿Checklist de fase completo?
- [ ] ¿Actualicé estado en CHECKPOINTS.md?

---

## 🚀 Prompts Recomendados

### Para Iniciar Checkpoint Nuevo

```
Implementa CHECKPOINT X.A — [SERVICE] CORE

CONTEXTO:
- Consulté DEVELOPMENT-STRATEGY.md
- Evalué con token-budget-rules.md
- Decidí segmentar en 4 fases

ALCANCE FASE A:
[copiar de checkpoint-templates.md]

ENTREGABLES:
[copiar de checkpoint-templates.md]

VALIDACIÓN:
- Tests coverage >= 80%
- Checklist de Fase A completo
```

### Para Continuar Fase Pendiente

```
Continúa CHECKPOINT X.B — [SERVICE] DATA

CONTEXTO:
- Fase X.A completada (100%)
- Fase X.B iniciada (60% - repositories pendientes)

PENDIENTE:
- UserRepository implementation
- RefreshTokenRepository implementation
- Integration tests de repositories

VALIDACIÓN:
- Tests coverage >= 75%
- Checklist de Fase B completo
```

---

## 📖 Referencias Adicionales

- [CHECKPOINTS.md](../project/CHECKPOINTS.md) — Estado actual del proyecto
- [docs/architecture/](../architecture/) — Documentación de arquitectura del sistema

---

**Última actualización:** 2025-12-26
