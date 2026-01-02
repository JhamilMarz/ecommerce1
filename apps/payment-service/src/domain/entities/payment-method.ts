/**
 * Payment Method Enum
 * 
 * Architecture: Clean Architecture - Domain Layer
 * Represents simulated payment methods (NO real processing)
 * 
 * IMPORTANT: This is a SIMULATOR. No real card processing occurs.
 * For production, integrate with real payment gateway (Stripe, PayPal, etc.)
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * Payment method metadata for display purposes
 */
export interface PaymentMethodInfo {
  method: PaymentMethod
  displayName: string
  icon: string
  requiresCard: boolean
  processingTime: string
}

/**
 * Payment method configuration
 * Used for UI display and validation
 */
export const PAYMENT_METHOD_INFO: Record<PaymentMethod, PaymentMethodInfo> = {
  [PaymentMethod.CREDIT_CARD]: {
    method: PaymentMethod.CREDIT_CARD,
    displayName: 'Credit Card',
    icon: '💳',
    requiresCard: true,
    processingTime: 'instant',
  },
  [PaymentMethod.DEBIT_CARD]: {
    method: PaymentMethod.DEBIT_CARD,
    displayName: 'Debit Card',
    icon: '💳',
    requiresCard: true,
    processingTime: 'instant',
  },
  [PaymentMethod.PAYPAL]: {
    method: PaymentMethod.PAYPAL,
    displayName: 'PayPal',
    icon: '🅿️',
    requiresCard: false,
    processingTime: '1-2 minutes',
  },
  [PaymentMethod.STRIPE]: {
    method: PaymentMethod.STRIPE,
    displayName: 'Stripe',
    icon: '💰',
    requiresCard: true,
    processingTime: 'instant',
  },
  [PaymentMethod.BANK_TRANSFER]: {
    method: PaymentMethod.BANK_TRANSFER,
    displayName: 'Bank Transfer',
    icon: '🏦',
    requiresCard: false,
    processingTime: '1-3 business days',
  },
}

/**
 * Validates if payment method is supported
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return Object.values(PaymentMethod).includes(method as PaymentMethod)
}
