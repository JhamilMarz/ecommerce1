import { Request, Response, NextFunction } from 'express';
import { CreateCategoryUseCase } from '../../../application/use-cases/create-category';
import { ListCategoriesUseCase } from '../../../application/use-cases/list-categories';
import { createCategorySchema } from '../schemas/product-schemas';

export class CategoryController {
  constructor(
    private createCategoryUseCase: CreateCategoryUseCase,
    private listCategoriesUseCase: ListCategoriesUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createCategorySchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const category = await this.createCategoryUseCase.execute(value);

      res.status(201).json(category.toJSON());
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.listCategoriesUseCase.execute();

      res.status(200).json(categories.map((c) => c.toJSON()));
    } catch (error) {
      next(error);
    }
  };
}
