-- Ràng buộc viết tay không sinh được bằng cú pháp Prisma schema — xem chú thích ở cuối
-- catalog.prisma / order.prisma / chat.prisma.

-- inventory_items: reserved không vượt onHand, cả hai không âm
ALTER TABLE "inventory_items"
    ADD CONSTRAINT inv_non_negative
    CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand");

-- product_variants: giá phải dương, giá gạch ngang phải lớn hơn giá bán
ALTER TABLE "product_variants"
    ADD CONSTRAINT variant_price_positive CHECK ("price" > 0),
    ADD CONSTRAINT variant_compare_price CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" > "price");

-- product_variants: mỗi product chỉ có một variant mặc định
CREATE UNIQUE INDEX variant_one_default ON "product_variants" ("productId") WHERE "isDefault";

-- disputes: mỗi orderItemId chỉ có một tranh chấp đang mở (order-dispute.md §2)
CREATE UNIQUE INDEX dispute_one_open_per_item ON "disputes" ("orderItemId") WHERE "status" NOT IN ('CLOSED');
