CREATE TABLE IF NOT EXISTS `admin` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cart` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cart_quantity_positive" CHECK("cart"."quantity">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_cart_owner_variant` ON `cart` (`owner`,`variant_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`percent` integer NOT NULL,
	`active` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`size` text NOT NULL,
	`color` text NOT NULL,
	`price` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_quantity_positive" CHECK("order_items"."quantity">0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`idempotency` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`postal` text NOT NULL,
	`shipping` text NOT NULL,
	`shipping_cost` integer NOT NULL,
	`payment` text NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`status` text DEFAULT 'جدید' NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer NOT NULL,
	`tracking` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `orders_idempotency_unique` ON `orders` (`idempotency`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_orders_owner` ON `orders` (`owner`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_orders_created` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`old_price` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`material` text NOT NULL,
	`fit` text NOT NULL,
	`wash` text NOT NULL,
	`images` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "price_positive" CHECK("products"."price">0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_products_category` ON `products` (`category`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`color` text NOT NULL,
	`size` text NOT NULL,
	`stock` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_nonnegative" CHECK("variants"."stock">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_variants_options` ON `variants` (`product_id`,`color`,`size`);
--> statement-breakpoint
DROP TRIGGER IF EXISTS reserve_stock;
--> statement-breakpoint
DROP TRIGGER IF EXISTS release_stock;
