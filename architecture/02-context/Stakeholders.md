# Stakeholders

## 📋 Propósito del Documento

Identifica y documenta a **todos los actores involucrados** en el sistema: quiénes son, qué necesitan, qué esperan y cómo impactan en las decisiones arquitectónicas. Es fundamental para gestión de requisitos y comunicación efectiva.

## 🎯 Qué Debe Contener

- Lista completa de stakeholders
- Roles y responsabilidades
- Intereses y preocupaciones
- Nivel de influencia y poder
- Canales de comunicación
- Criterios de éxito específicos por stakeholder

## 🏗️ Impacto en la Arquitectura

- **Priorización**: Define qué requisitos son más críticos
- **Trade-offs**: Ayuda a balancear necesidades conflictivas
- **Comunicación**: Determina qué informar y cómo
- **Buy-in**: Asegura apoyo para decisiones técnicas

## ⚠️ Criticidad en Sistemas de Gran Escala

Sin stakeholder management claro:

- Requisitos contradictorios generan re-trabajo
- Falta de buy-in bloquea decisiones críticas
- Comunicación ineficiente genera fricción
- Expectativas no alineadas causan conflicto

---

## 🎭 Matriz de Stakeholders

### Clasificación por Poder e Interés

```plaintext
                    Alto Interés
                         │
        Mantener         │         Gestionar
       Satisfechos       │        Activamente
    ──────────────────────────────────────────
    │                    │                    │
    │   - Finance        │   - Product Owner  │
    │   - Legal/         │   - Tech Lead      │
Alto│     Compliance     │   - Customers      │
Poder                    │   - Sellers        │
    │                    │                    │
    ├────────────────────┼────────────────────┤
    │                    │                    │
    │   - Marketing      │   - Developers     │
Bajo│   - Customer       │   - QA Team        │
Poder    Support         │   - End Users      │
    │                    │                    │
    ──────────────────────────────────────────
         Monitorear      │       Mantener
                         │       Informados
                    Bajo Interés
```

---

## 👔 Stakeholders de Negocio

### 1. Product Owner / Product Manager

**Rol**: Define la visión del producto y prioriza features.

**Responsabilidades**:

- Mantener el product backlog
- Definir acceptance criteria
- Priorizar entre features vs tech debt
- Tomar decisiones de trade-off negocio vs técnico

**Intereses**:

- Time-to-market rápido
- Features que generen revenue
- UX excelente para usuarios
- Métricas de adopción y conversión

**Preocupaciones**:

- Over-engineering que retrase MVP
- Falta de visibilidad del progreso
- Bugs que afecten reputación
- Escalabilidad para crecimiento

**Criterios de éxito**:

- Lanzar MVP en 6 meses
- Lograr 1,000 transacciones/día en 3 meses
- Mantener NPS > 40

**Comunicación**: Weekly sprint reviews, daily async updates (Slack)

**Poder/Interés**: Alto/Alto → **Gestionar Activamente**

---

### 2. Finance / CFO

**Rol**: Gestiona presupuesto e inversiones.

**Responsabilidades**:

- Aprobar presupuesto de tecnología
- Evaluar ROI de inversiones
- Controlar gastos operativos (cloud, licencias)

**Intereses**:

- Maximizar ROI
- Minimizar costos operativos
- Predictibilidad de gastos
- Cumplimiento regulatorio (SOX, auditorías)

**Preocupaciones**:

- Costo de infraestructura cloud fuera de control
- Inversiones sin retorno claro
- Vendor lock-in costoso
- Compliance penalties

**Criterios de éxito**:

- ROI > 50% en 18 meses
- Costo por transacción < $0.02
- Presupuesto cloud predecible (±10%)

**Comunicación**: Monthly financial reports, quarterly business reviews

**Poder/Interés**: Alto/Medio → **Mantener Satisfecho**

---

### 3. Legal / Compliance

**Rol**: Asegura cumplimiento legal y regulatorio.

**Responsabilidades**:

- Validar cumplimiento GDPR, PCI-DSS, SOC 2
- Revisar términos y condiciones
- Gestionar contratos con vendors
- Auditorías de seguridad

**Intereses**:

- Zero breaches de seguridad
- Compliance completo con regulaciones
- Auditoría trail completo
- Contratos vendor favorables

**Preocupaciones**:

- Data breaches que resulten en multas
- Incumplimiento regulatorio
- Falta de controles de acceso
- Datos personales mal gestionados

**Criterios de éxito**:

- Pasar auditorías de compliance (PCI-DSS nivel 1)
- Zero incidentes de privacidad
- Logs de auditoría completos

**Comunicación**: Quarterly compliance reviews, ad-hoc for incidents

**Poder/Interés**: Alto/Medio → **Mantener Satisfecho**

---

## 👨‍💻 Stakeholders Técnicos

### 4. Tech Lead / Software Architect

**Rol**: Define arquitectura técnica y estándares de calidad.

**Responsabilidades**:

- Diseñar arquitectura del sistema
- Establecer estándares de código
- Revisar code reviews críticos
- Mentoría técnica del equipo
- Decisiones de trade-off técnicos

**Intereses**:

- Arquitectura sostenible y escalable
- Alta calidad del código
- Developer experience excelente
- Tech stack moderno
- Documentación completa

**Preocupaciones**:

- Tech debt fuera de control
- Arquitectura que no escale
- Falta de ownership del código
- Decisiones apresuradas sin análisis

**Criterios de éxito**:

- Arquitectura documentada (ADRs completos)
- Code coverage > 80%
- MTTR < 1 hora
- Deploy sin downtime

**Comunicación**: Daily stand-ups, weekly architecture reviews

**Poder/Interés**: Alto/Alto → **Gestionar Activamente**

---

### 5. Development Team (Backend, Frontend, Mobile)

**Rol**: Implementa features y mantiene el sistema.

**Responsabilidades**:

- Escribir código de calidad
- Testing exhaustivo (unit, integration, e2e)
- Code reviews
- Documentación técnica
- Bug fixing y soporte

**Intereses**:

- Herramientas modernas y eficientes
- Specs claras y completas
- Autonomía técnica
- Feedback rápido (CI/CD)
- Ambiente de trabajo colaborativo

**Preocupaciones**:

- Requisitos ambiguos o cambiantes
- Technical debt que bloquee features
- Herramientas lentas o inestables
- Interrupciones constantes (support)

**Criterios de éxito**:

- Features entregadas on-time
- Bugs < 5% de features
- Code review turnaround < 4 horas
- Build time < 10 minutos

**Comunicación**: Daily stand-ups, Slack (async), retrospectives

**Poder/Interés**: Medio/Alto → **Mantener Informados**

---

### 6. DevOps / SRE Team

**Rol**: Gestiona infraestructura, CI/CD y observabilidad.

**Responsabilidades**:

- Mantener infraestructura cloud (Kubernetes, databases)
- Configurar pipelines CI/CD
- Monitoreo y alerting
- Incident response (on-call)
- Capacity planning
- Disaster recovery

**Intereses**:

- Sistemas confiables y auto-heal
- Infraestructura como código (IaC)
- Observabilidad completa
- Deploys automatizados
- SLAs cumplidos

**Preocupaciones**:

- Deploys manuales propensos a error
- Lack of observability (black box)
- Incidentes frecuentes que causen burnout
- Escalamiento manual

**Criterios de éxito**:

- Uptime > 99.9%
- Deploy frequency > 5/week
- MTTR < 1 hora
- Zero manual intervention for scaling

**Comunicación**: Incident channels (PagerDuty, Slack), weekly ops reviews

**Poder/Interés**: Medio/Alto → **Mantener Informados**

---

### 7. QA / Testing Team

**Rol**: Valida calidad funcional y no-funcional.

**Responsabilidades**:

- Testing funcional (manual + automatizado)
- Performance testing (load, stress)
- Security testing (OWASP ZAP, penetration)
- Regression testing
- Test automation

**Intereses**:

- Testability del sistema
- Ambientes de testing estables
- Herramientas de automation
- Specs detalladas

**Preocupaciones**:

- Features mal documentadas
- Tests flaky (intermittentes)
- Falta de tiempo para testing exhaustivo
- Presión para "skip testing"

**Criterios de éxito**:

- Zero critical bugs en producción
- Automated test coverage > 80%
- Test execution time < 15 minutos

**Comunicación**: Sprint planning, bug triage meetings

**Poder/Interés**: Bajo/Alto → **Mantener Informados**

---

## 🛒 Stakeholders de Usuario

### 8. Customers (Compradores)

**Rol**: Usuarios finales que compran productos.

**Responsabilidades**: N/A (son clientes, no colaboradores)

**Intereses**:

- Compra rápida y fácil
- Seguridad en pagos
- Tracking de pedidos en tiempo real
- Atención al cliente eficiente
- Precios competitivos

**Preocupaciones**:

- Sitio lento o que falle
- Información de pago comprometida
- Pedidos que no lleguen
- Mala experiencia de usuario

**Criterios de éxito**:

- Conversion rate > 3%
- CSAT > 4.5/5
- Repeat purchase rate > 30%

**Comunicación**: Encuestas NPS, customer support tickets, analytics

**Poder/Interés**: Alto/Alto → **Gestionar Activamente**

---

### 9. Sellers (Vendedores)

**Rol**: Comerciantes que venden en la plataforma.

**Responsabilidades**:

- Listar productos de calidad
- Mantener inventario actualizado
- Procesar pedidos a tiempo
- Brindar buen servicio

**Intereses**:

- Vender más (visibilidad en búsqueda)
- Herramientas eficientes de gestión
- Payout rápido y confiable
- Analytics de ventas
- Comisiones bajas

**Preocupaciones**:

- Comisiones altas
- Plataforma inestable (pérdida de ventas)
- Falta de visibilidad de productos
- Pagos retrasados

**Criterios de éxito**:

- GMV (Gross Merchandise Value) creciendo
- Payout < 7 días
- Churn rate < 5%

**Comunicación**: Seller portal, email newsletters, webinars

**Poder/Interés**: Alto/Alto → **Gestionar Activamente**

---

## 🔧 Stakeholders de Soporte

### 10. Customer Support Team

**Rol**: Atiende consultas y resuelve problemas de usuarios.

**Responsabilidades**:

- Responder tickets de soporte
- Escalar bugs al equipo técnico
- Educar usuarios sobre la plataforma
- Gestionar disputas y devoluciones

**Intereses**:

- Sistema estable (menos tickets)
- Herramientas de admin eficientes
- Documentación clara para usuarios
- Visibilidad del estado del sistema

**Preocupaciones**:

- Bugs frecuentes que generen tickets
- Falta de herramientas para resolver issues
- Downtime sin notificación previa
- Documentación desactualizada

**Criterios de éxito**:

- Ticket resolution time < 24 horas
- CSAT de soporte > 4/5
- Escalation rate < 10%

**Comunicación**: Bug reports, weekly sync con producto/tech

**Poder/Interés**: Bajo/Medio → **Monitorear**

---

### 11. Marketing Team

**Rol**: Adquisición y retención de usuarios.

**Responsabilidades**:

- Campañas de adquisición (Google Ads, Facebook Ads)
- Email marketing
- SEO y contenido
- Analytics de marketing

**Intereses**:

- Landing pages rápidas (SEO)
- Tracking de conversión detallado
- A/B testing capabilities
- Integraciones con herramientas marketing (Google Analytics, Mixpanel)

**Preocupaciones**:

- Sitio lento (bounce rate alto)
- Falta de tracking de conversión
- Inability to run experiments

**Criterios de éxito**:

- CAC (Customer Acquisition Cost) < $10
- Conversion rate mejorando
- SEO ranking improving

**Comunicación**: Monthly marketing reviews, analytics dashboards

**Poder/Interés**: Bajo/Medio → **Monitorear**

---

## 📊 Matriz de Comunicación

| Stakeholder      | Frecuencia | Canal            | Formato           | Owner             |
| ---------------- | ---------- | ---------------- | ----------------- | ----------------- |
| Product Owner    | Diaria     | Slack, Jira      | Async updates     | Tech Lead         |
| Tech Lead        | Diaria     | Stand-up         | Sync (15 min)     | Scrum Master      |
| Developers       | Diaria     | Stand-up, Slack  | Sync + Async      | Tech Lead         |
| DevOps/SRE       | Diaria     | Slack, PagerDuty | Async + Incidents | DevOps Lead       |
| QA Team          | Semanal    | Sprint review    | Sync (1 hora)     | QA Lead           |
| Finance          | Mensual    | Email report     | Written           | Product Owner     |
| Legal/Compliance | Trimestral | Meeting          | Sync (2 horas)    | Tech Lead + Legal |
| Customers        | Continuo   | In-app surveys   | Analytics         | Product Manager   |
| Sellers          | Mensual    | Newsletter       | Email             | Account Manager   |
| Customer Support | Semanal    | Sync meeting     | Sync (30 min)     | Product Owner     |
| Marketing        | Mensual    | Dashboard review | Analytics         | Product Manager   |

---

## 🎯 Gestión de Conflictos

### Conflicto 1: Velocidad vs Calidad

**Stakeholders**: Product Owner (velocidad) vs Tech Lead (calidad)

**Estrategia de resolución**:

- Definir "Definition of Done" clara con ambos
- Tech debt controlado (< 5% del roadmap)
- Metrics objetivos (code coverage, bug rate)

---

### Conflicto 2: Features vs Costos

**Stakeholders**: Product Owner (features) vs Finance (costos)

**Estrategia de resolución**:

- ROI analysis por feature
- Fases de MVP iterativo
- Cloud cost optimization continuo

---

### Conflicto 3: Seguridad vs Usabilidad

**Stakeholders**: Legal/Security vs UX/Product

**Estrategia de resolución**:

- Security by design (no afterthought)
- UX research con constraints de seguridad
- Progressive enhancement (MFA opcional → obligatorio)

---

## 📖 Referencias

- [Product-Vision.md](../01-vision/Product-Vision.md): Visión alineada con stakeholders
- [Business-Goals.md](../01-vision/Business-Goals.md): Objetivos por stakeholder
- [Risks-Register.md](../12-risk-and-roadmap/Risks-Register.md): Riesgos por stakeholder

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Product Owner & Tech Lead  
**Próxima revisión**: Trimestral
