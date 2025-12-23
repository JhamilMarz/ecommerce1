import { z } from 'zod'

export const ProductDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  sellerId: z.string().uuid(),
  createdAt: z.date(),
})

export type ProductDto = z.infer<typeof ProductDtoSchema>
