import { Request, Response, NextFunction } from 'express';
import { CreateProductUseCase } from '../../../application/use-cases/create-product';
import { GetProductUseCase } from '../../../application/use-cases/get-product';
import { ListProductsUseCase } from '../../../application/use-cases/list-products';
import { UpdateProductUseCase } from '../../../application/use-cases/update-product';
import { DeleteProductUseCase } from '../../../application/use-cases/delete-product';
import { createProductSchema, updateProductSchema } from '../schemas/product-schemas';

export class ProductController {
  constructor(
    private createProductUseCase: CreateProductUseCase,
    private getProductUseCase: GetProductUseCase,
    private listProductsUseCase: ListProductsUseCase,
    private updateProductUseCase: UpdateProductUseCase,
    private deleteProductUseCase: DeleteProductUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createProductSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const correlationId = req.headers['x-correlation-id'] as string;
      const product = await this.createProductUseCase.execute(value, correlationId);

      res.status(201).json(product.toJSON());
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const product = await this.getProductUseCase.execute(id);

      res.status(200).json(product.toJSON());
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        categoryId: req.query.categoryId as string | undefined,
        sellerId: req.query.sellerId as string | undefined,
      };

      const products = await this.listProductsUseCase.execute(filters);

      res.status(200).json(products.map((p) => p.toJSON()));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = updateProductSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const correlationId = req.headers['x-correlation-id'] as string;
      const product = await this.updateProductUseCase.execute(id, value, correlationId);

      res.status(200).json(product.toJSON());
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const correlationId = req.headers['x-correlation-id'] as string;
      
      await this.deleteProductUseCase.execute(id, correlationId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}
