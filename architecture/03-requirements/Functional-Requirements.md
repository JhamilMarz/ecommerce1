# Functional Requirements

## 📋 Propósito

Define **QUÉ debe hacer el sistema** desde perspectiva funcional. Son capacidades y comportamientos observables por usuarios.

## 🎯 Qué Contiene

- User stories y casos de uso
- Flujos funcionales por bounded context
- Reglas de negocio
- Criterios de aceptación

## 🏗️ Impacto

- **Scope definition**: Define qué construir
- **Testing**: Base para test cases
- **Estimación**: Input para planificación

## ⚠️ Criticidad

Sin requisitos funcionales claros se construye lo incorrecto, generando re-trabajo masivo.

---

## 🛒 Functional Requirements por Contexto

### FR-IAM: Identity & Access Management

**FR-IAM-01**: Registro de Usuario  
**Como** visitante  
**Quiero** registrarme con email y contraseña  
**Para** tener una cuenta en la plataforma

**Criterios de Aceptación**:

- Email único en el sistema
- Password mínimo 8 caracteres (1 mayúscula, 1 número, 1 especial)
- Confirmación de email obligatoria
- Opción de registro con OAuth2 (Google, Facebook)

---

**FR-IAM-02**: Autenticación  
**Como** usuario registrado  
**Quiero** hacer login con mis credenciales  
**Para** acceder a funcionalidades privadas

**Criterios de Aceptación**:

- Login con email + password
- JWT token con expiración de 24 horas
- Refresh token con 30 días de validez
- Rate limiting: 5 intentos fallidos bloquean cuenta por 15 minutos

---

**FR-IAM-03**: Recuperación de Contraseña  
**Como** usuario  
**Quiero** recuperar mi contraseña olvidada  
**Para** volver a acceder a mi cuenta

**Criterios de Aceptación**:

- Link de reset enviado por email
- Token de reset válido por 1 hora
- Nuevo password debe cumplir política de seguridad

---

### FR-CATALOG: Product Catalog

**FR-CATALOG-01**: Crear Producto (Seller)  
**Como** seller  
**Quiero** crear un nuevo producto  
**Para** listarlo en la plataforma

**Criterios de Aceptación**:

- Campos obligatorios: nombre, descripción, precio, categoría, SKU
- Hasta 10 imágenes por producto
- Variantes opcionales (talla, color)
- Estado inicial: Draft (no visible públicamente)

---

**FR-CATALOG-02**: Búsqueda de Productos (Customer)  
**Como** customer  
**Quiero** buscar productos por nombre o categoría  
**Para** encontrar lo que necesito

**Criterios de Aceptación**:

- Full-text search (Elasticsearch)
- Filtros: precio, categoría, rating, disponibilidad
- Ordenamiento: relevancia, precio (asc/desc), más vendidos
- Paginación: 24 productos por página

---

### FR-INVENTORY: Inventory Management

**FR-INVENTORY-01**: Actualizar Stock (Seller)  
**Como** seller  
**Quiero** actualizar cantidad de stock  
**Para** reflejar mi inventario real

**Criterios de Aceptación**:

- Incremento/decremento de stock
- Log de movimientos (auditoría)
- Alerta automática cuando stock < umbral mínimo

---

### FR-ORDER: Order Management

**FR-ORDER-01**: Agregar al Carrito  
**Como** customer  
**Quiero** agregar productos al carrito  
**Para** comprarlos después

**Criterios de Aceptación**:

- Agregar/remover/modificar cantidad
- Carrito persiste por 7 días (usuario autenticado)
- Validar disponibilidad de stock en tiempo real
- Calcular subtotal automáticamente

---

**FR-ORDER-02**: Checkout y Creación de Orden  
**Como** customer  
**Quiero** finalizar mi compra  
**Para** recibir los productos

**Criterios de Aceptación**:

- Validar stock antes de crear orden
- Reservar stock durante checkout (15 minutos)
- Aplicar descuentos/cupones si existen
- Calcular shipping cost según dirección
- Crear orden con estado "Pending Payment"

---

**FR-ORDER-03**: Ver Historial de Órdenes  
**Como** customer  
**Quiero** ver mis órdenes pasadas  
**Para** hacer tracking y soporte

**Criterios de Aceptación**:

- Listar todas las órdenes del usuario
- Filtrar por estado: pending, confirmed, shipped, delivered, cancelled
- Ver detalle completo de cada orden
- Descargar factura (PDF)

---

### FR-PAYMENT: Payment Processing

**FR-PAYMENT-01**: Procesar Pago  
**Como** customer  
**Quiero** pagar mi orden con tarjeta  
**Para** confirmarla

**Criterios de Aceptación**:

- Integración con Stripe (PCI compliant)
- Soportar tarjetas de crédito/débito
- Validación de pago en < 5 segundos
- Retry automático si falla (hasta 3 intentos)
- Notificar resultado al usuario

---

**FR-PAYMENT-02**: Reembolso (Admin)  
**Como** admin  
**Quiero** procesar un reembolso  
**Para** devolver dinero al customer

**Criterios de Aceptación**:

- Reembolso parcial o total
- Notificación automática al customer
- Actualizar estado de orden
- Log de auditoría del reembolso

---

### FR-SHIPPING: Shipping & Tracking

**FR-SHIPPING-01**: Crear Envío (Seller)  
**Como** seller  
**Quiero** crear un envío para una orden  
**Para** despacharla al customer

**Criterios de Aceptación**:

- Seleccionar carrier (FedEx, UPS, DHL)
- Generar número de tracking
- Imprimir etiqueta de envío
- Actualizar orden a estado "Shipped"

---

**FR-SHIPPING-02**: Tracking de Envío (Customer)  
**Como** customer  
**Quiero** ver el estado de mi envío  
**Para** saber cuándo llegará

**Criterios de Aceptación**:

- Ver tracking number
- Ver estado actual (Processing, Shipped, InTransit, Delivered)
- Ver historial de eventos (timestamps y ubicaciones)
- Estimación de fecha de entrega

---

### FR-NOTIFICATION: Notifications

**FR-NOTIFICATION-01**: Notificación de Orden Confirmada  
**Cuando** una orden es confirmada  
**Entonces** enviar email al customer  
**Con** detalles de la orden y tracking

**Criterios de Aceptación**:

- Email enviado en < 1 minuto
- Template personalizado con logo
- Link a página de tracking
- Notificación in-app también

---

## 📊 Matriz de Priorización (MoSCoW)

| Requisito                        | Prioridad       | Fase   | Complejidad |
| -------------------------------- | --------------- | ------ | ----------- |
| FR-IAM-01, 02, 03                | **Must Have**   | MVP    | Media       |
| FR-CATALOG-01, 02                | **Must Have**   | MVP    | Alta        |
| FR-INVENTORY-01                  | **Must Have**   | MVP    | Baja        |
| FR-ORDER-01, 02, 03              | **Must Have**   | MVP    | Alta        |
| FR-PAYMENT-01                    | **Must Have**   | MVP    | Alta        |
| FR-SHIPPING-01, 02               | **Should Have** | Fase 2 | Media       |
| FR-NOTIFICATION-01               | **Should Have** | Fase 2 | Baja        |
| Multi-currency                   | **Could Have**  | Fase 3 | Alta        |
| Machine Learning Recommendations | **Won't Have**  | Futuro | Muy Alta    |

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Product Owner
