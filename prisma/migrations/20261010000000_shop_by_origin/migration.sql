-- Shop by Origin: growing regions and the products sourced from each.

-- CreateTable
CREATE TABLE "origins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stateCode" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "origins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_origins" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "locality" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_origins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "origins_name_key" ON "origins"("name");

-- CreateIndex
CREATE UNIQUE INDEX "origins_slug_key" ON "origins"("slug");

-- CreateIndex
CREATE INDEX "origins_isActive_sortOrder_idx" ON "origins"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "product_origins_originId_sortOrder_idx" ON "product_origins"("originId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_origins_productId_originId_key" ON "product_origins"("productId", "originId");

-- AddForeignKey
ALTER TABLE "product_origins" ADD CONSTRAINT "product_origins_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_origins" ADD CONSTRAINT "product_origins_originId_fkey" FOREIGN KEY ("originId") REFERENCES "origins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starting set of origins for the storefront menu. Copy and images are edited from the admin panel.
INSERT INTO "origins" ("id", "name", "slug", "stateCode", "tagline", "sortOrder", "updatedAt") VALUES
    (gen_random_uuid()::text, 'Andhra Pradesh', 'andhra-pradesh', 'AP', 'Guntur chillies and bold heat', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Karnataka', 'karnataka', 'KA', 'Coorg pepper and Byadgi chilli', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Kerala', 'kerala', 'KL', 'Pepper, cardamom and the Malabar coast', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Tamil Nadu', 'tamil-nadu', 'TN', 'Erode turmeric and Chettinad kitchens', 4, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Telangana', 'telangana', 'TG', 'Nizamabad turmeric country', 5, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Maharashtra', 'maharashtra', 'MH', 'Sangli turmeric and Kolhapuri spice', 6, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Gujarat', 'gujarat', 'GJ', 'Unjha cumin and fennel', 7, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Rajasthan', 'rajasthan', 'RJ', 'Cumin, coriander and desert chillies', 8, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Madhya Pradesh', 'madhya-pradesh', 'MP', 'Coriander and chilli from the heartland', 9, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Other Regions', 'other-regions', NULL, 'From Kashmir to the North East', 10, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
