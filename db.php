<?php
// API Response Setup: Ensure consistent JSON responses for frontend communication
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Security Configuration: Enable error logging for development but hide from users
error_reporting(E_ALL);
ini_set('display_errors', 0); // Prevent exposing errors to frontend

// Database Connection: Using MySQLi for reliable database operations
$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'organic_farm';

$conn = new mysqli($host, $user, $pass, $db);

// Connection Validation: Fail fast with clear error message
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Request Routing: Action-based approach for clean API endpoints
$action = $_GET['action'] ?? '';

// Product Retrieval: Sorted by category for better frontend organization
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

// Transaction History: Limited to 20 recent orders for performance
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

// Product Creation: Validate all required fields before database insertion
if ($action === 'add_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Input Validation: Ensure we have valid JSON data
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Required Field Check: Prevent incomplete product creation
    if (!isset($input['name']) || !isset($input['category']) || !isset($input['price']) || !isset($input['stock'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    // Data Preparation: Convert to integers for BDT whole number handling
    $name = $input['name'];
    $category = $input['category'];
    $price = intval($input['price']); // Integer conversion for Bangladesh currency
    $stock = intval($input['stock']);
    
    // Prepared Statement: Prevent SQL injection attacks
    $stmt = $conn->prepare("INSERT INTO products (name, category, price_per_unit, stock_quantity) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("ssii", $name, $category, $price, $stock);
    
    // Execution Result: Provide clear success/failure feedback
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    
    $stmt->close();
    exit;
}

// Product Deletion: Prevent deletion of products with existing orders
if ($action === 'delete_product' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $product_id = intval($_GET['id'] ?? 0);
    
    // ID Validation: Prevent invalid deletion attempts
    if ($product_id <= 0) {
        echo json_encode(['error' => 'Invalid product ID']);
        exit;
    }
    
    // Dependency Check: Ensure no orders reference this product
    $check_stmt = $conn->prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?");
    if (!$check_stmt) {
        echo json_encode(['error' => 'Prepare failed for check: ' . $conn->error]);
        exit;
    }
    
    $check_stmt->bind_param("i", $product_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    $row = $result->fetch_assoc();
    
    // Business Rule Enforcement: Protect data integrity
    if ($row['count'] > 0) {
        echo json_encode(['error' => 'Cannot delete product that has been ordered']);
        $check_stmt->close();
        exit;
    }
    $check_stmt->close();
    
    // Actual Deletion: Remove product if no dependencies exist
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

// Product Update: Comprehensive validation for data integrity
if ($action === 'update_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Input Validation: Ensure valid JSON structure
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Required Fields Check: All update fields must be present
    if (!isset($input['product_id']) || !isset($input['name']) || !isset($input['category']) || 
        !isset($input['price']) || !isset($input['stock'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    // Data Preparation: Convert to appropriate types
    $product_id = intval($input['product_id']);
    $name = $input['name'];
    $category = $input['category'];
    $price = intval($input['price']); // Integer for BDT compatibility
    $stock = intval($input['stock']);
    
    // Prepared Statement: Secure update operation
    $stmt = $conn->prepare("UPDATE products SET name = ?, category = ?, price_per_unit = ?, stock_quantity = ? WHERE product_id = ?");
    if (!$stmt) {
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("ssiii", $name, $category, $price, $stock, $product_id);
    
    // Update Execution: Verify changes were made
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

// Order Status Management: Controlled status transitions for order lifecycle
if ($action === 'update_order_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Request Validation: Ensure required data is present
    if (!$input || !isset($input['orderId']) || !isset($input['status'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    $order_id = intval($input['orderId']);
    $status = $input['status'];
    
    // Status Validation: Prevent invalid status values
    $valid_statuses = ['Pending', 'Delivered', 'Cancelled'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['error' => 'Invalid status']);
        exit;
    }
    
    // Status Update: Change order status with prepared statement
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

// Order Processing: Transaction-safe order creation with stock management
if ($action === 'place_order' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Input Validation: Ensure valid order data
    if (!$input) {
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    // Required Fields Check: All order information must be present
    if (!isset($input['customerName']) || !isset($input['customerPhone']) || 
        !isset($input['customerAddress']) || !isset($input['totalAmount']) || 
        !isset($input['items']) || !is_array($input['items'])) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    // Transaction Management: Ensure data consistency across multiple operations
    $conn->autocommit(FALSE);
    
    try {
        // Order Creation: Insert main order record
        $stmt = $conn->prepare("INSERT INTO orders (customer_name, customer_phone, customer_address, customer_email, total_amount) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception('Prepare failed for orders: ' . $conn->error);
        }
        
        $email = isset($input['customerEmail']) ? $input['customerEmail'] : '';
        $total_amount = intval($input['totalAmount']); // Integer conversion for BDT
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
        
        // Order Items Processing: Handle each product in the order
        foreach ($input['items'] as $item) {
            // Item Validation: Ensure complete item data
            if (!isset($item['product_id']) || !isset($item['quantity']) || !isset($item['price'])) {
                throw new Exception('Invalid item data');
            }
            
            // Order Item Creation: Record each product in the order
            $stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Prepare failed for order_items: ' . $conn->error);
            }
            
            $price = intval($item['price']); // Integer conversion for BDT
            $stmt->bind_param("iiii", $order_id, $item['product_id'], $item['quantity'], $price);
            
            if (!$stmt->execute()) {
                throw new Exception('Execute failed for order_items: ' . $stmt->error);
            }
            $stmt->close();
            
            // Stock Update: Decrease product availability
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
        
        // Transaction Commit: Save all changes atomically
        $conn->commit();
        echo json_encode(['success' => true, 'order_id' => $order_id]);
        
    } catch (Exception $e) {
        // Transaction Rollback: Undo all changes on error
        $conn->rollback();
        echo json_encode(['error' => $e->getMessage()]);
    }
    
    // Transaction Reset: Return to auto-commit mode
    $conn->autocommit(TRUE);
    exit;
}

// Connection Cleanup: Free database resources
$conn->close();
?>