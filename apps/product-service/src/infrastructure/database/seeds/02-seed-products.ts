import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const now = new Date();

  // Get categories
  const categories = await queryInterface.sequelize.query(
    `SELECT id, slug FROM categories WHERE slug IN ('smartphones', 'laptops')`,
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  ) as Array<{ id: string; slug: string }>;

  const smartphoneCategory = categories.find((c) => c.slug === 'smartphones');
  const laptopCategory = categories.find((c) => c.slug === 'laptops');

  if (!smartphoneCategory || !laptopCategory) {
    throw new Error('Categories not found');
  }

  const sellerId = uuidv4(); // Sample seller

  const products = [
    {
      id: uuidv4(),
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
      price: 999.99,
      category_id: smartphoneCategory.id,
      seller_id: sellerId,
      sku: 'IPHONE-15-PRO-256GB',
      status: 'active',
      images: ['https://example.com/iphone15-1.jpg', 'https://example.com/iphone15-2.jpg'],
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      name: 'MacBook Pro 16"',
      description: 'Powerful laptop with M3 Max chip, 36GB RAM, and 1TB SSD',
      price: 2499.99,
      category_id: laptopCategory.id,
      seller_id: sellerId,
      sku: 'MACBOOK-PRO-16-M3',
      status: 'active',
      images: ['https://example.com/macbook-1.jpg'],
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Flagship Android phone with S Pen, 200MP camera, and AI features',
      price: 1199.99,
      category_id: smartphoneCategory.id,
      seller_id: sellerId,
      sku: 'SAMSUNG-S24-ULTRA-512GB',
      status: 'active',
      images: ['https://example.com/s24-1.jpg'],
      created_at: now,
      updated_at: now,
    },
  ];

  await queryInterface.bulkInsert('products', products);

  // Create inventory for products
  const inventory = products.map((p) => ({
    id: uuidv4(),
    product_id: p.id,
    quantity: 100,
    reserved_quantity: 0,
    updated_at: now,
  }));

  await queryInterface.bulkInsert('inventory', inventory);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('inventory', {}, {});
  await queryInterface.bulkDelete('products', {}, {});
}
