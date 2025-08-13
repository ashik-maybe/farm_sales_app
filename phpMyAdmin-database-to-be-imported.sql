-- Create database
CREATE DATABASE IF NOT EXISTS organic_farm;
USE organic_farm;

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;

-- Create products table (removed image column, changed to INT for price)
CREATE TABLE products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  category VARCHAR(30) NOT NULL,
  price_per_unit INT NOT NULL,  -- Changed to INT for whole taka amounts
  stock_quantity INT NOT NULL
);

-- Insert sample products (removed image filenames, using whole taka amounts)
-- Prices are taken from https://www.shwapno.com/ and https://ghorerbazar.com/ (Aug 13, 2025) ; যদি থাকে
INSERT INTO products (name, category, price_per_unit, stock_quantity) VALUES
-- Milk
('Cow Milk', 'Dairy', 80, 70),
('Goat Milk', 'Dairy', 60, 50),
('Camel Milk', 'Dairy', 110, 40),

-- Eggs
('Chicken Egg', 'Eggs', 13, 500),
('Duck Egg', 'Eggs', 30, 200),
('Quail Egg', 'Eggs', 4, 150),
('Pigeon Egg', 'Eggs', 50, 50),

-- Fish (পুকুর থেকে ধরা)
('Rui Fish', 'Fish', 380, 170),
('Katla Fish', 'Fish', 395, 160),
('Pangas Fish', 'Fish', 190, 250),
('Tilapia Fish', 'Fish', 285, 165),
('Boal Fish', 'Fish', 850, 120),
('Carpu Fish', 'Fish', 295, 130),
('Koi Fish', 'Fish', 375, 145),

-- Meat
('Beef', 'Meat', 795, 60),
('Mutton', 'Meat', 1115, 40),
('Chicken Meat', 'Meat', 310, 80),
('Duck Meat', 'Meat', 750, 50),
('Turkey Meat', 'Meat', 600, 45),
('Sheep Meat', 'Meat', 1300, 35),
('Pigeon Meat', 'Meat', 500, 55),
('Camel Meat', 'Meat', 2000, 20),
('Quail Meat', 'Meat', 270, 65),

-- Honey
('Black Seed Honey', 'Honey', 1600, 20),
('Lichu Flower Honey', 'Honey', 1200, 15),
('Mixed Flower Honey', 'Honey', 1000, 30),

-- Wool Products
('Wool Sweater', 'Wool', 800, 25),
('Wool Socks', 'Wool', 100, 100),
('Wool Scarf', 'Wool', 400, 30),

-- Leather Products
('Leather Jacket', 'Leather', 2500, 15),
('Leather Wallet', 'Leather', 600, 40),
('Leather Gloves', 'Leather', 400, 35),
('Leather Bag', 'Leather', 1800, 20);

-- Orders table (simplified customer info storage)
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(50) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_email VARCHAR(50),
  total_amount INT NOT NULL,  -- Changed to INT for whole taka amounts
  status VARCHAR(20) DEFAULT 'Pending',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table (changed price to INT)
CREATE TABLE order_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT NOT NULL,
  price INT NOT NULL,  -- Changed to INT for whole taka amounts
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);