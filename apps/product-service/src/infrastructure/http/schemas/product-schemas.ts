import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().min(10).max(5000).required(),
  price: Joi.number().positive().required(),
  categoryId: Joi.string().uuid().required(),
  sellerId: Joi.string().uuid().required(),
  sku: Joi.string().min(3).max(100).required(),
  status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().min(10).max(5000).optional(),
  price: Joi.number().positive().optional(),
  categoryId: Joi.string().uuid().optional(),
  status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
}).min(1);

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  parentId: Joi.string().uuid().optional().allow(null),
  slug: Joi.string()
    .min(2)
    .max(150)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .required(),
});
