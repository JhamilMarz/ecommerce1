import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus } from '@/domain/entities/order-status';

/**
 * OrderItem Sub-document Schema
 */
interface OrderItemDocument {
  productId: string;
  productName: string;
  quantity: number;
  priceSnapshot: number;
}

const OrderItemSchema = new Schema<OrderItemDocument>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceSnapshot: { type: Number, required: true, min: 0 },
  },
  { _id: false }, // Don't create _id for subdocuments
);

/**
 * Order Document Interface (MongoDB)
 */
export interface OrderDocument extends Document {
  _id: string;
  userId: string;
  items: OrderItemDocument[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  correlationId?: string;
  paymentReference?: string;
}

/**
 * Order Schema (MongoDB)
 * 
 * Maps Order entity to MongoDB document
 */
const OrderSchema = new Schema<OrderDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true, validate: [(val: OrderItemDocument[]) => val.length > 0, 'items array cannot be empty'] },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      index: true,
      default: OrderStatus.PENDING,
    },
    correlationId: { type: String, index: true },
    paymentReference: { type: String },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'orders',
  },
);

// Indexes for query performance
OrderSchema.index({ userId: 1, createdAt: -1 }); // User orders sorted by date
OrderSchema.index({ status: 1, createdAt: -1 }); // Orders by status
OrderSchema.index({ correlationId: 1 }); // For event correlation

// Virtual for calculating total
OrderSchema.virtual('totalAmount').get(function (this: OrderDocument) {
  return this.items.reduce(
    (sum, item) => sum + item.quantity * item.priceSnapshot,
    0,
  );
});

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema);
