# Main API endpoints

## Public

- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/categories`
- `GET /api/v1/categories/:id`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/products/slug/:slug`
- `GET /api/v1/origins` (active origins with their active products)
- `GET /api/v1/origins/slug/:slug`

`GET /api/v1/products` accepts `origin=<origin id or slug>` alongside `category`, `search` and `isFeatured`. Every product response carries an `origins` array (`id`, `name`, `slug`, `stateCode`, `locality`, `note`).

## Auth

- `POST /api/v1/auth/send-otp` (customers: mobile OTP)
- `POST /api/v1/auth/verify-otp` (customers: mobile OTP, signs up on first use)
- `POST /api/v1/auth/login` (staff only: email + password)
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

## Customer

- `GET/POST/PATCH/DELETE /api/v1/addresses`
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id/cancel`
- `GET /api/v1/shipping/orders/:orderId`
- `GET /api/v1/payments/orders/:orderId`
- `POST /api/v1/payments/razorpay/verify`

## Admin

- Category CRUD
- Product CRUD/status/images (`origins: [{ originId, locality?, note? }]` on create/update replaces the product's origin list)
- Origin CRUD: `GET /api/v1/origins/admin/list`, `POST /api/v1/origins`, `PATCH /api/v1/origins/:id`, `DELETE /api/v1/origins/:id` (deactivates) — SUPER_ADMIN, PRODUCT_ADMIN
- Variant and inventory management
- Order list/detail/status
- Shipment/tracking management
- Dashboard metrics
- User/role management
- Razorpay webhook
