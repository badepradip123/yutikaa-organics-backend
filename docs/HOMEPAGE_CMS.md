# Homepage CMS implementation

The homepage is now served by `GET /api/v1/home` and is configured through the admin endpoints under `/api/v1/home/admin/*`.

## Managed sections
- Hero carousel: banners, images, mobile image, CTA, order and publish state.
- Popular spices: name, link, image, order and publish state.
- Shop by category: category image + `homepageEnabled`.
- Best sellers: existing Product `isFeatured` flag.
- Brand story: title, description, image and CTA.
- Why choose Yuthika: repeatable items.
- Testimonials: repeatable customer quotes.
- Certifications: repeatable trust badges.
- Recipes & spice guide: image or video media plus text content.
- Newsletter: public subscription endpoint.

## Storage
`POST /api/v1/home/admin/assets/upload` accepts images and short videos through Supabase Storage. The backend reuses the configured `SUPABASE_STORAGE_BUCKET` (default `product-images`) and stores content under folders such as `home/hero`, `home/popular-spices`, `home/brand-story` and `recipes`.

## Database
Run the new migration and regenerate Prisma Client:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed creates demo homepage content using the existing frontend reference assets. Admin uploads can replace those URLs before production launch.
