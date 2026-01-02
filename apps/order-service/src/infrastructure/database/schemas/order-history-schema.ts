import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus } from '@/domain/entities/order-status';

/**
 * OrderHistory Document Interface (MongoDB)
 */
export interface OrderHistoryDocument extends Document {
  _id: string;
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * OrderHistory Schema (MongoDB)
 * 
 * Stores audit trail of all order status changes
 */
const OrderHistorySchema = new Schema<OrderHistoryDocument>(
  {
    _id: { type: String, required: true },
    orderId: { type: String, required: true, index: true },
    oldStatus: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
    },
    newStatus: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
    },
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: String, required: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false, // We use changedAt instead
    collection: 'order_history',
  },
);

// Indexes for query performance
OrderHistorySchema.index({ orderId: 1, changedAt: -1 }); // Get history for order
OrderHistorySchema.index({ changedAt: -1 }); // Recent changes

export const OrderHistoryModel = mongoose.model<OrderHistoryDocument>(
  'OrderHistory',
  OrderHistorySchema,
);
