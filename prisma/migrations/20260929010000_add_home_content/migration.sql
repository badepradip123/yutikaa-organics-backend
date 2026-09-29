-- AlterTable
ALTER TABLE "categories"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "homepageEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "ContentMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "hero_banners" (
  "id" TEXT NOT NULL,
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "ctaLabel" TEXT,
  "ctaLink" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hero_banners_isActive_sortOrder_idx" ON "hero_banners"("isActive", "sortOrder");

CREATE TABLE "popular_spices" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "imageUrl" TEXT,
  "link" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "popular_spices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "popular_spices_slug_key" ON "popular_spices"("slug");
CREATE INDEX "popular_spices_isActive_sortOrder_idx" ON "popular_spices"("isActive", "sortOrder");

CREATE TABLE "brand_story" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'default',
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "buttonLabel" TEXT,
  "buttonLink" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brand_story_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_story_key_key" ON "brand_story"("key");

CREATE TABLE "why_choose_items" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "why_choose_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "why_choose_items_isActive_sortOrder_idx" ON "why_choose_items"("isActive", "sortOrder");

CREATE TABLE "testimonials" (
  "id" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "location" TEXT,
  "quote" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "testimonials_isActive_sortOrder_idx" ON "testimonials"("isActive", "sortOrder");

CREATE TABLE "certifications" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "certifications_isActive_sortOrder_idx" ON "certifications"("isActive", "sortOrder");

CREATE TABLE "recipes" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT,
  "content" TEXT,
  "mediaType" "ContentMediaType" NOT NULL DEFAULT 'IMAGE',
  "mediaUrl" TEXT,
  "thumbnailUrl" TEXT,
  "category" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");
CREATE INDEX "recipes_isPublished_sortOrder_idx" ON "recipes"("isPublished", "sortOrder");
CREATE INDEX "recipes_isFeatured_isPublished_idx" ON "recipes"("isFeatured", "isPublished");

CREATE TABLE "newsletter_subscriptions" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
