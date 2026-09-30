import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const products = [
  { name: 'Cinnamon', slug: 'cinnamon', sku: 'YTH-CIN', basePrice: 149 },
  { name: 'Cloves', slug: 'cloves', sku: 'YTH-CLO', basePrice: 179 },
  { name: 'Green Cardamom', slug: 'green-cardamom', sku: 'YTH-GCA', basePrice: 299 },
  { name: 'Black Cardamom', slug: 'black-cardamom', sku: 'YTH-BCA', basePrice: 199 },
  { name: 'Black Pepper', slug: 'black-pepper', sku: 'YTH-BPE', basePrice: 169 },
  { name: 'Cumin Seeds', slug: 'cumin-seeds', sku: 'YTH-CUM', basePrice: 129 },
  { name: 'Coriander Seeds', slug: 'coriander-seeds', sku: 'YTH-COR', basePrice: 99 },
  { name: 'Fennel Seeds', slug: 'fennel-seeds', sku: 'YTH-FEN', basePrice: 109 },
  { name: 'Mustard Seeds', slug: 'mustard-seeds', sku: 'YTH-MUS', basePrice: 89 },
  { name: 'Fenugreek Seeds', slug: 'fenugreek-seeds', sku: 'YTH-FGR', basePrice: 89 },
  { name: 'Dry Red Chilli', slug: 'dry-red-chilli', sku: 'YTH-CHI', basePrice: 139 },
  { name: 'Raw Turmeric', slug: 'raw-turmeric', sku: 'YTH-TUR', basePrice: 119 },
  { name: 'Bay Leaf', slug: 'bay-leaf', sku: 'YTH-BAY', basePrice: 79 },
  { name: 'Star Anise', slug: 'star-anise', sku: 'YTH-STA', basePrice: 189 },
  { name: 'Mace', slug: 'mace', sku: 'YTH-MAC', basePrice: 349 },
  { name: 'Poppy Seeds', slug: 'poppy-seeds', sku: 'YTH-POP', basePrice: 399 },
  { name: 'Til', slug: 'til-sesame-seeds', sku: 'YTH-TIL', basePrice: 119 },
  { name: 'Shahi Jeera', slug: 'shahi-jeera', sku: 'YTH-SJE', basePrice: 179 },
] as const;

const packSizes = [
  { weightGrams: 100, multiplier: 1, stock: 40 },
  { weightGrams: 250, multiplier: 2.15, stock: 25 },
  { weightGrams: 500, multiplier: 4.05, stock: 15 },
  { weightGrams: 1000, multiplier: 7.6, stock: 8 },
];

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: 'whole-spices' },
    update: { name: 'Whole Spices', isActive: true, homepageEnabled: true, imageUrl: '/references/Yutika_image_referneces1.jpeg' },
    create: {
      name: 'Whole Spices',
      slug: 'whole-spices',
      description: 'Whole spices and traditional kitchen ingredients.',
      imageUrl: '/references/Yutika_image_referneces1.jpeg',
      homepageEnabled: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  const categorySeeds = [
    { name: 'Spice Powders', slug: 'spice-powders', description: 'Freshly ground everyday spices.', imageUrl: '/references/Yutika_image_referneces2.jpeg', sortOrder: 2 },
    { name: 'Blended Spices', slug: 'blended-spices', description: 'Balanced masalas inspired by regional kitchens.', imageUrl: '/references/Yutika_organic.jpeg', sortOrder: 3 },
    { name: 'Special / Seasonal Spices', slug: 'special-seasonal-spices', description: 'Limited and seasonal spice selections.', imageUrl: '/references/Yutika_image_referneces1.jpeg', sortOrder: 4 },
  ];
  for (const item of categorySeeds) {
    await prisma.category.upsert({
      where: { slug: item.slug },
      update: { ...item, isActive: true, homepageEnabled: true },
      create: { ...item, isActive: true, homepageEnabled: true },
    });
  }

  for (const product of products) {
    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        categoryId: category.id,
        status: 'ACTIVE',
        isFeatured: ['cinnamon', 'green-cardamom', 'black-pepper'].includes(product.slug),
      },
      create: {
        name: product.name,
        slug: product.slug,
        categoryId: category.id,
        shortDescription: `${product.name} - product content can be edited from the admin panel.`,
        description: `Premium ${product.name.toLowerCase()} for everyday cooking.`,
        status: 'ACTIVE',
        isFeatured: ['cinnamon', 'green-cardamom', 'black-pepper'].includes(product.slug),
      },
    });

    for (const pack of packSizes) {
      const price = Number((product.basePrice * pack.multiplier).toFixed(2));
      const sku = `${product.sku}-${pack.weightGrams}G`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: record.id,
          weightGrams: pack.weightGrams,
          mrp: price,
          sellingPrice: price,
          isActive: true,
        },
        create: {
          productId: record.id,
          name: pack.weightGrams >= 1000 ? `${pack.weightGrams / 1000}kg` : `${pack.weightGrams}g`,
          weightGrams: pack.weightGrams,
          sku,
          mrp: price,
          sellingPrice: price,
          isActive: true,
          inventory: {
            create: { quantity: pack.stock, reservedQuantity: 0, lowStockThreshold: 5 },
          },
        },
      });
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: { quantity: pack.stock, reservedQuantity: 0 },
        create: {
          variantId: variant.id,
          quantity: pack.stock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
      });
    }
  }

  if ((await prisma.heroBanner.count()) === 0) {
    await prisma.heroBanner.createMany({ data: [
      { eyebrow: "INDIA'S REGIONAL SPICES", title: 'One Spice. Many Lands. Infinite Flavours.', description: 'Authentic spices sourced from trusted farms across India.', imageUrl: '/references/Landing_Page.jpeg', ctaLabel: 'Explore Products', ctaLink: '/shop', sortOrder: 1, isActive: true },
      { eyebrow: 'PURE • NATURAL • AUTHENTIC', title: 'From Farm to Your Family', description: 'Thoughtfully sourced and packed for modern Indian kitchens.', imageUrl: '/references/Yutika_organic.jpeg', ctaLabel: 'Our Story', ctaLink: '/about', sortOrder: 2, isActive: true },
    ] });
  }

  if ((await prisma.popularSpice.count()) === 0) {
    await prisma.popularSpice.createMany({ data: [
      { name: 'Turmeric', slug: 'turmeric', imageUrl: '/images/products/turmeric-finger.jpg', link: '/shop?search=turmeric', sortOrder: 1, isActive: true },
      { name: 'Cumin', slug: 'cumin', imageUrl: '/images/products/cumin-seeds.jpg', link: '/shop?search=cumin', sortOrder: 2, isActive: true },
      { name: 'Red Chilli', slug: 'red-chilli', imageUrl: '/images/products/red-chilli-whole.jpg', link: '/shop?search=chilli', sortOrder: 3, isActive: true },
      { name: 'Coriander', slug: 'coriander', imageUrl: '/images/products/coriander-seeds.jpg', link: '/shop?search=coriander', sortOrder: 4, isActive: true },
      { name: 'Black Pepper', slug: 'black-pepper-popular', imageUrl: '/images/products/black-pepper-whole.jpg', link: '/shop?search=black%20pepper', sortOrder: 5, isActive: true },
      { name: 'Cardamom', slug: 'cardamom', imageUrl: '/images/products/green-cardamom.jpg', link: '/shop?search=cardamom', sortOrder: 6, isActive: true },
    ] });
  }

  await prisma.brandStory.upsert({
    where: { key: 'default' },
    update: { eyebrow: 'OUR STORY', title: 'Rooted in Tradition. Grown for a Healthier Tomorrow.', description: 'We bring pure, natural and authentic spices sourced from trusted farms while supporting sustainable and honest sourcing.', imageUrl: '/references/Yutika_organic.jpeg', buttonLabel: 'Know Our Story', buttonLink: '/about', isActive: true },
    create: { key: 'default', eyebrow: 'OUR STORY', title: 'Rooted in Tradition. Grown for a Healthier Tomorrow.', description: 'We bring pure, natural and authentic spices sourced from trusted farms while supporting sustainable and honest sourcing.', imageUrl: '/references/Yutika_organic.jpeg', buttonLabel: 'Know Our Story', buttonLink: '/about', isActive: true },
  });

  if ((await prisma.whyChooseItem.count()) === 0) {
    await prisma.whyChooseItem.createMany({ data: [
      { title: 'Pure & Natural', description: 'No unnecessary chemicals or preservatives.', icon: 'leaf', sortOrder: 1, isActive: true },
      { title: 'Traditional Flavours', description: 'Authentic taste inspired by Indian kitchens.', icon: 'sparkles', sortOrder: 2, isActive: true },
      { title: 'Farm Sourced', description: 'Directly sourced from trusted growers.', icon: 'farm', sortOrder: 3, isActive: true },
      { title: 'Better for You', description: 'Thoughtful ingredients for everyday cooking.', icon: 'heart', sortOrder: 4, isActive: true },
    ] });
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({ data: [
      { customerName: 'Priya S.', location: 'Mumbai', quote: 'The freshness and aroma are unmatched. Finally, real spices that make a difference.', rating: 5, sortOrder: 1, isActive: true },
      { customerName: 'Rahul K.', location: 'Bengaluru', quote: 'I love the purity and authentic taste. Yutikaa Organics is my go-to for spices.', rating: 5, sortOrder: 2, isActive: true },
      { customerName: 'Neha M.', location: 'Delhi', quote: 'Excellent quality and packaging. Highly recommended!', rating: 5, sortOrder: 3, isActive: true },
    ] });
  }

  if ((await prisma.certification.count()) === 0) {
    await prisma.certification.createMany({ data: [
      { title: 'Certified Organic', description: 'As applicable to eligible products.', icon: 'badge', sortOrder: 1, isActive: true },
      { title: 'No Artificial Additives', description: 'Clean ingredient approach.', icon: 'leaf', sortOrder: 2, isActive: true },
      { title: 'Sustainable Sourcing', description: 'Responsible sourcing practices.', icon: 'globe', sortOrder: 3, isActive: true },
      { title: 'Support Indian Farmers', description: 'A sourcing model built around growers.', icon: 'farm', sortOrder: 4, isActive: true },
    ] });
  }

  if ((await prisma.recipe.count()) === 0) {
    await prisma.recipe.createMany({ data: [
      { title: 'Classic Chicken Curry with Organic Spices', slug: 'classic-chicken-curry', excerpt: 'A comforting curry built around balanced whole spices.', mediaType: 'IMAGE', mediaUrl: '/references/Yutika_image_referneces1.jpeg', isFeatured: true, isPublished: true, sortOrder: 1 },
      { title: 'Homemade Garam Masala Recipe', slug: 'homemade-garam-masala', excerpt: 'Make a fragrant everyday masala at home.', mediaType: 'IMAGE', mediaUrl: '/references/Yutika_image_referneces2.jpeg', isFeatured: true, isPublished: true, sortOrder: 2 },
      { title: 'Aromatic Vegetable Biryani', slug: 'aromatic-vegetable-biryani', excerpt: 'Aromatic rice, vegetables and regional spice notes.', mediaType: 'IMAGE', mediaUrl: '/references/Yutika_organic.jpeg', isFeatured: true, isPublished: true, sortOrder: 3 },
      { title: 'Spiced Lentil Soup', slug: 'spiced-lentil-soup', excerpt: 'A warm, simple bowl layered with cumin and turmeric.', mediaType: 'IMAGE', mediaUrl: '/references/Yutika_image_referneces1.jpeg', isFeatured: true, isPublished: true, sortOrder: 4 },
    ] });
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: 'SUPER_ADMIN', isActive: true },
      create: {
        email: adminEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        firstName: 'Super',
        lastName: 'Admin',
      },
    });
    console.log(`Super admin seeded: ${adminEmail}`);
  }

  console.log(`Seeded ${products.length} products with ${packSizes.length} pack sizes each.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
