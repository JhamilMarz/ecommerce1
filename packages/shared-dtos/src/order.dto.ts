import { z } from 'zod'

export const OrderItemDtoSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
})

export const OrderDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(OrderItemDtoSchema),
  totalAmount: z.number().positive(),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
  createdAt: z.date(),
})

export type OrderItemDto = z.infer<typeof OrderItemDtoSchema>
export type OrderDto = z.infer<typeof OrderDtoSchema>
