import { z } from 'zod'

export const UserDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['customer', 'seller', 'admin']),
  createdAt: z.date(),
})

export type UserDto = z.infer<typeof UserDtoSchema>
