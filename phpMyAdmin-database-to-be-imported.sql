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
INSERT INTO products (name, category, price_per_unit, stock_quantity) VALUES
-- Milk
('Cow Milk', 'Dairy', 60, 100),
('Goat Milk', 'Dairy', 80, 50),
('Sheep Milk', 'Dairy', 90, 40),

-- Eggs
('Chicken Eggs', 'Eggs', 120, 200),
('Duck Eggs', 'Eggs', 150, 100),
('Quail Eggs', 'Eggs', 200, 150),
('Pigeon Eggs', 'Eggs', 180, 80),

-- Fish (freshwater only)
('Rui Fish', 'Fish', 200, 50),
('Katla Fish', 'Fish', 180, 60),
('Pangasius Fish', 'Fish', 150, 70),
('Tilapia Fish', 'Fish', 160, 60),

-- Meat
('Beef', 'Meat', 400, 60),
('Goat Meat', 'Meat', 450, 40),
('Chicken Meat', 'Meat', 220, 80),
('Duck Meat', 'Meat', 300, 50),
('Turkey Meat', 'Meat', 350, 45),
('Sheep Meat', 'Meat', 500, 35),
('Pigeon Meat', 'Meat', 280, 40),

-- Honey
('Sunflower Honey', 'Honey', 350, 50),
('Wildflower Honey', 'Honey', 300, 70),
('Forest Honey', 'Honey', 400, 40),

-- Wool Products
('Wool Sweater', 'Wool', 800, 25),
('Wool Socks', 'Wool', 200, 100),
('Wool Scarf', 'Wool', 500, 30),

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