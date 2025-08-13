<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in output

$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'organic_farm';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Handle different actions
$action = $_GET['action'] ?? '';

// Get all products
if ($action === 'get_products') {
    $result = $conn->query("SELECT * FROM products ORDER BY category, name");
    if (!$result) {
        echo json_encode(['error' => 'Query failed: ' . $conn->error]);
        exit;
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    echo json_encode($products);
    exit;
}

// Get recent transactions (orders)
if ($action === 'get_transactions') {
    $result = $conn->query("
        SELECT * FROM orders 
        ORDER BY order_date DESC 
        LIMIT 20
    ");
    
    if (!$result) {
        echo json_encode(['error' => 'Query failed: ' . $conn->error]);
        exit;
    }
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    echo json_encode($transactions);
    exit;
}

// Add new product
if ($action === 'add_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Validate required fields
    if (!isset($input['name']) || !isset($input['category']) || !isset($input['price']) || !isset($input['stock'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    $name = $input['name'];
    $category = $input['category'];
    $price = intval($input['price']); // Changed to intval for whole numbers
    $stock = intval($input['stock']);
    
    $stmt = $conn->prepare("INSERT INTO products (name, category, price_per_unit, stock_quantity) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("ssii", $name, $category, $price, $stock);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    
    $stmt->close();
    exit;
}

// Delete product
if ($action === 'delete_product' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $product_id = intval($_GET['id'] ?? 0);
    
    if ($product_id <= 0) {
        echo json_encode(['error' => 'Invalid product ID']);
        exit;
    }
    
    // Check if product exists in any orders
    $check_stmt = $conn->prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?");
    if (!$check_stmt) {
        echo json_encode(['error' => 'Prepare failed for check: ' . $conn->error]);
        exit;
    }
    
    $check_stmt->bind_param("i", $product_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        echo json_encode(['error' => 'Cannot delete product that has been ordered']);
        $check_stmt->close();
        exit;
    }
    $check_stmt->close();
    
    // Delete product
    $stmt = $conn->prepare("DELETE FROM products WHERE product_id = ?");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("i", $product_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Product not found']);
        }
    } else {
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    
    $stmt->close();
    exit;
}

// Update product
if ($action === 'update_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Validate required fields
    if (!isset($input['product_id']) || !isset($input['name']) || !isset($input['category']) || 
        !isset($input['price']) || !isset($input['stock'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    $product_id = intval($input['product_id']);
    $name = $input['name'];
    $category = $input['category'];
    $price = intval($input['price']); // Changed to intval
    $stock = intval($input['stock']);
    
    $stmt = $conn->prepare("UPDATE products SET name = ?, category = ?, price_per_unit = ?, stock_quantity = ? WHERE product_id = ?");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("ssiii", $name, $category, $price, $stock, $product_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Product not found or no changes made']);
        }
    } else {
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    
    $stmt->close();
    exit;
}

// Update order status
if ($action === 'update_order_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['orderId']) || !isset($input['status'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    $order_id = intval($input['orderId']);
    $status = $input['status'];
    
    // Validate status
    $valid_statuses = ['Pending', 'Delivered', 'Cancelled'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['error' => 'Invalid status']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE order_id = ?");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("si", $status, $order_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Order not found']);
        }
    } else {
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    
    $stmt->close();
    exit;
}

// Place order
if ($action === 'place_order' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Validate required fields
    if (!isset($input['customerName']) || !isset($input['customerPhone']) || 
        !isset($input['customerAddress']) || !isset($input['totalAmount']) || 
        !isset($input['items']) || !is_array($input['items'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    // Start transaction
    $conn->autocommit(FALSE);
    
    try {
        // Insert order
        $stmt = $conn->prepare("INSERT INTO orders (customer_name, customer_phone, customer_address, customer_email, total_amount) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception('Prepare failed for orders: ' . $conn->error);
        }
        
        $email = isset($input['customerEmail']) ? $input['customerEmail'] : '';
        $total_amount = intval($input['totalAmount']); // Changed to intval
        $stmt->bind_param("ssssi", 
            $input['customerName'], 
            $input['customerPhone'], 
            $input['customerAddress'], 
            $email,
            $total_amount
        );
        
        if (!$stmt->execute()) {
            throw new Exception('Execute failed for orders: ' . $stmt->error);
        }
        
        $order_id = $conn->insert_id;
        $stmt->close();
        
        // Insert order items and update stock
        foreach ($input['items'] as $item) {
            // Validate item
            if (!isset($item['product_id']) || !isset($item['quantity']) || !isset($item['price'])) {
                throw new Exception('Invalid item data');
            }
            
            // Insert order item
            $stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Prepare failed for order_items: ' . $conn->error);
            }
            
            $price = intval($item['price']); // Changed to intval
            $stmt->bind_param("iiii", $order_id, $item['product_id'], $item['quantity'], $price);
            
            if (!$stmt->execute()) {
                throw new Exception('Execute failed for order_items: ' . $stmt->error);
            }
            $stmt->close();
            
            // Update stock
            $stmt = $conn->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?");
            if (!$stmt) {
                throw new Exception('Prepare failed for stock update: ' . $conn->error);
            }
            
            $stmt->bind_param("ii", $item['quantity'], $item['product_id']);
            
            if (!$stmt->execute()) {
                throw new Exception('Execute failed for stock update: ' . $stmt->error);
            }
            $stmt->close();
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'order_id' => $order_id]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['error' => $e->getMessage()]);
    }
    
    $conn->autocommit(TRUE);
    exit;
}

$conn->close();
?>