# DEVELOPMENT STRATEGY

## Estrategia de Implementación por Fases

### Problema Identificado

Durante el desarrollo se detectó que implementar microservicios completos en un solo turno genera:

- Limitaciones por tokens disponibles
- Código condensado/incompleto al final
- Tests y documentación apresurados
- Dificultad para validar cada capa antes de avanzar

### Solución: Checkpoints Divididos

**Cada checkpoint grande se divide en sub-checkpoints verificables de forma independiente**

```
CHECKPOINT X (Original)
    ↓
CHECKPOINT X.A - CORE (Domain + Application)
CHECKPOINT X.B - INFRASTRUCTURE DATA (DB + Repositories)
CHECKPOINT X.C - INFRASTRUCTURE HTTP (Controllers + Routes + Messaging)
CHECKPOINT X.D - TESTING + DOCUMENTATION
```

---

## 🔄 Invocación Automática en Cada Iteración

### PASO 1: Al Inicio de Cada Checkpoint

**ANTES de escribir código, SIEMPRE ejecutar:**

```markdown
📋 PRE-CHECKPOINT CHECKLIST

1. Leer: docs/development/token-budget-rules.md
2. Evaluar: ¿Este checkpoint necesita segmentación?
3. Si cumple criterios → Dividir según checkpoint-templates.md
4. Actualizar: docs/project/CHECKPOINTS.md con fases planificadas
5. Confirmar con usuario antes de empezar
```

### PASO 2: Durante la Implementación

**En cada respuesta, monitorear:**

```markdown
⚠️ TOKEN BUDGET MONITORING

Si detecto frases como:

- "Debido al límite de..."
- "Voy a condensar..."
- "Por falta de espacio..."

ACCIÓN INMEDIATA:

1. DETENER generación de código
2. GUARDAR progreso actual
3. INFORMAR: "Límite de tokens alcanzado, dividiendo en sub-fase"
4. PROPONER: Nueva división más granular
5. ESPERAR confirmación del usuario
```

### PASO 3: Al Finalizar Cada Fase

**Antes de marcar como completo:**

```markdown
✅ POST-PHASE VALIDATION

□ Tests ejecutados y pasando
□ Coverage >= umbral definido
□ Documentación de fase creada
□ Actualizar docs/project/CHECKPOINTS.md
□ Preguntar: "¿Confirmas avanzar a siguiente fase?"
```

---

## 📐 Criterios de Segmentación Automática

Ver: `docs/development/token-budget-rules.md`

**Resumen rápido:**

- ≥15 archivos → DIVIDIR
- ≥5 endpoints → DIVIDIR
- ≥3 servicios externos → DIVIDIR
- ≥2000 líneas estimadas → DIVIDIR

---

## 📚 Referencias

- **Templates detallados**: `docs/development/checkpoint-templates.md`
- **Reglas de segmentación**: `docs/development/token-budget-rules.md`
- **Estado del proyecto**: `docs/project/CHECKPOINTS.md`
- **Guías de prompts**: `docs/development/prompt-guidelines.md`

---

## 🎯 Aplicación Práctica

### Para el Usuario (Developer)

**Al solicitar un nuevo checkpoint:**

```
👤 USER PROMPT TEMPLATE:

"Implementa CHECKPOINT X - [NOMBRE]

Antes de empezar:
1. Revisa token-budget-rules.md
2. Si necesita división, propón fases X.A, X.B, X.C, X.D
3. Espera mi confirmación

Luego procede con la fase aprobada."
```

### Para el Asistente (AI)

**Al recibir solicitud de checkpoint:**

```
🤖 AI WORKFLOW:

1. CHECK: ¿Ya existe división en CHECKPOINTS.md?
2. EVALUATE: Aplicar token-budget-rules.md
3. IF segmentación necesaria:
   - Proponer división con checkpoint-templates.md
   - Listar archivos estimados por fase
   - WAIT for user approval
4. ELSE:
   - Proceder con implementación directa
5. DURING implementation:
   - Monitor token usage
   - Si llega a 70% de tokens → Alertar usuario
6. AFTER each phase:
   - Run tests
   - Update CHECKPOINTS.md
   - Request confirmation
```

---

## 📊 Tracking de Progreso

Todos los checkpoints se rastrean en: **`docs/project/CHECKPOINTS.md`**

Formato:

```markdown
## CHECKPOINT 3 — AUTH SERVICE

Estado: 🟡 En progreso (60%)

### 3.A — CORE

- ✅ Domain entities
- ✅ Use cases
- ✅ Tests unitarios
- Status: COMPLETADO

### 3.B — INFRASTRUCTURE DATA

- 🟡 Sequelize setup
- ⏳ Repositories (pendiente)
- Status: EN PROGRESO

### 3.C — INFRASTRUCTURE HTTP

- ⏳ Pendiente
```

---

## 🔐 Compromiso de Calidad

**Nunca sacrificar:**

- ❌ Tests (coverage >= 75%)
- ❌ Documentación clara
- ❌ Código limpio y legible
- ❌ Validación de cada fase

**Por culpa de:**

- Límites de tokens
- Prisa por terminar
- "Optimización" de espacio
