import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const now = new Date();

  const categories = [
    {
      id: uuidv4(),
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      parent_id: null,
      slug: 'electronics',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      name: 'Smartphones',
      description: 'Mobile phones and smartphones',
      parent_id: null, // Will be updated after
      slug: 'smartphones',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      name: 'Laptops',
      description: 'Laptop computers',
      parent_id: null, // Will be updated after
      slug: 'laptops',
      created_at: now,
      updated_at: now,
    },
  ];

  // Set parent_id for subcategories
  categories[1].parent_id = categories[0].id;
  categories[2].parent_id = categories[0].id;

  await queryInterface.bulkInsert('categories', categories);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('categories', {}, {});
}
