import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Local demo data for Shop by Origin. Links the seeded products (npm run prisma:seed) to origins
 * so every storefront and admin state can be checked by hand.
 *
 * Usage:
 *   npm run prisma:seed
 *   npm run seed:origin-demo
 *
 * It only runs against a local database and can be re-run: the links of the products listed
 * below are replaced each time.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const host = new URL(connectionString).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`Refusing to write demo data to "${host}". This script is for local databases only.`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Copy and images that the migration leaves empty. Image paths are served by the storefront.
const originDetails: Record<string, { description?: string; imageUrl?: string }> = {
  kerala: {
    description:
      'Rain-fed hills along the Western Ghats give Kerala pepper, cardamom and clove their depth. Most lots come from smallholder farms in Wayanad and Idukki.',
    imageUrl: '/references/Yutika_organic.jpeg',
  },
  'tamil-nadu': {
    description: 'Erode is the turmeric capital of the south, and its manjal carries a GI tag.',
  },
  gujarat: { imageUrl: '/references/Yutika_image_referneces1.jpeg' },
};

// Extra origins: one more state on the map, and one that is switched off (visible in admin only).
const extraOrigins = [
  { name: 'Odisha', slug: 'odisha', stateCode: 'OR', tagline: 'Kandhamal turmeric from tribal farms', sortOrder: 11, isActive: true },
  { name: 'Goa', slug: 'goa', stateCode: 'GA', tagline: 'Switched off: should not appear on the storefront', sortOrder: 12, isActive: false },
];

type Link = [originSlug: string, locality?: string, note?: string];

// Madhya Pradesh is left without products on purpose (empty region), and Mustard Seeds without an origin.
const links: Record<string, Link[]> = {
  // One spice across many regions, including the grouped one.
  'raw-turmeric': [
    ['tamil-nadu', 'Erode', 'GI-tagged Erode manjal'],
    ['telangana', 'Nizamabad', 'Large trading market'],
    ['maharashtra', 'Waigaon, Wardha', 'GI-tagged'],
    ['odisha', 'Kandhamal', 'GI-tagged, tribal farms'],
    ['other-regions', 'Lakadong, Meghalaya', 'Heirloom, prized for high curcumin'],
  ],
  // A region with a long list.
  'black-pepper': [
    ['kerala', 'Wayanad', 'Bold Malabar garbled'],
    ['karnataka', 'Coorg', 'Shade grown with coffee'],
  ],
  'green-cardamom': [['kerala', 'Idukki', '8mm bold pods']],
  cloves: [
    ['kerala', 'Kottayam'],
    ['tamil-nadu', 'Kanyakumari', 'Hill-grown, hand picked'],
  ],
  cinnamon: [['kerala', 'Kannur']],
  // Linked with no locality and no note.
  mace: [['kerala']],
  'dry-red-chilli': [
    ['andhra-pradesh', 'Guntur', 'Sannam S4, sun dried'],
    ['karnataka', 'Byadgi', 'Deep colour, mild heat'],
    ['rajasthan', 'Mathania'],
  ],
  'cumin-seeds': [
    ['gujarat', 'Unjha', 'Asia’s largest cumin market'],
    ['rajasthan', 'Jodhpur'],
  ],
  'fennel-seeds': [['gujarat', 'Unjha']],
  'til-sesame-seeds': [['gujarat', 'Saurashtra']],
  'coriander-seeds': [['rajasthan', 'Kota', 'Ramganj Mandi lots']],
  'fenugreek-seeds': [['rajasthan', 'Nagaur', 'Source of Nagauri methi']],
  // Grouped region only.
  'black-cardamom': [['other-regions', 'Sikkim', 'Smoke dried']],
  'bay-leaf': [['other-regions', 'Uttarakhand']],
  'shahi-jeera': [['other-regions', 'Kashmir']],
  // Sold out everywhere: the card should read "Sold out".
  'star-anise': [['other-regions', 'Arunachal Pradesh']],
  // Not ACTIVE: must be hidden on the storefront but still listed in admin.
  'poppy-seeds': [['rajasthan', 'Chittorgarh']],
  // Linked to an inactive origin only: no "Sourced from" pill on its product page.
  'mustard-seeds': [['goa']],
};

async function main() {
  for (const origin of extraOrigins) {
    await prisma.origin.upsert({ where: { slug: origin.slug }, update: origin, create: origin });
  }
  for (const [slug, data] of Object.entries(originDetails)) {
    await prisma.origin.update({ where: { slug }, data });
  }

  const origins = new Map((await prisma.origin.findMany()).map((origin) => [origin.slug, origin.id]));
  let linked = 0;
  for (const [productSlug, productLinks] of Object.entries(links)) {
    const product = await prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) {
      console.warn(`Skipped ${productSlug}: product not found. Run "npm run prisma:seed" first.`);
      continue;
    }
    await prisma.productOrigin.deleteMany({ where: { productId: product.id } });
    await prisma.productOrigin.createMany({
      data: productLinks.map(([originSlug, locality, note], index) => {
        const originId = origins.get(originSlug);
        if (!originId) throw new Error(`Origin "${originSlug}" not found. Apply the migrations first.`);
        return { productId: product.id, originId, locality: locality ?? null, note: note ?? null, sortOrder: index };
      }),
    });
    linked += productLinks.length;
  }

  await prisma.product.updateMany({ where: { slug: 'poppy-seeds' }, data: { status: 'INACTIVE' } });
  await prisma.inventory.updateMany({
    where: { variant: { product: { slug: 'star-anise' } } },
    data: { quantity: 0, reservedQuantity: 0 },
  });

  console.log(`Linked ${linked} product origins across ${Object.keys(links).length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
