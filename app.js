// DOM Element References: Cache elements for better performance and readability
const customerView = document.getElementById('customerView');
const managerView = document.getElementById('managerView');
const customerTab = document.getElementById('customerTab');
const managerTab = document.getElementById('managerTab');
const productGrid = document.getElementById('productGrid');
const orderForm = document.getElementById('orderForm');
const selectedItems = document.getElementById('selectedItems');
const totalAmount = document.getElementById('totalAmount');
const productForm = document.getElementById('productForm');
const managerProducts = document.getElementById('managerProducts');
const transactionsList = document.getElementById('transactionsList');

// Application State: Centralized data storage for products and shopping cart
let products = [];  // Why: Global access for both customer and manager views
let cart = [];      // Why: Persists across UI interactions without server calls

// View Management: Toggle between customer and manager interfaces
function switchTab(view) {
    // Why: Single responsibility for view switching logic
    if (view === 'customer') {
        customerView.classList.add('active');
        managerView.classList.remove('active');
        customerTab.classList.add('active');
        managerTab.classList.remove('active');
    } else {
        managerView.classList.add('active');
        customerView.classList.remove('active');
        managerTab.classList.add('active');
        customerTab.classList.remove('active');
        loadManagerData(); // Why: Load fresh data when switching to manager view
    }
}

// Currency Formatting: Bangladesh-specific whole number formatting
function formatCurrency(amount) {
    // Why: Integer conversion matches BDT practical usage (no decimals)
    return `BDT ${parseInt(amount)}`;
}

// Notification System: Modern popup replacement for browser alerts
function showNotification(message, type = 'info') {
    // Why: Better UX than browser alerts, auto-dismissal prevents UI blocking
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <span class="notification-close" onclick="this.parentElement.remove()">&times;</span>
    `;
    
    container.appendChild(notification);
    
    // Why: Automatic cleanup prevents memory leaks and UI clutter
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Product Loading: Fetch initial product data for customer view
async function loadProducts() {
    // Why: Async/await for cleaner error handling and readable flow
    try {
        const response = await fetch('db.php?action=get_products');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const jsonData = JSON.parse(text);
        products = jsonData;
        // Why: Category sorting improves user browsing experience
        products.sort((a, b) => a.category.localeCompare(b.category));
        renderProducts();
    } catch (error) {
        // Why: Graceful error handling with user feedback
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
        productGrid.innerHTML = '<p class="error">Error loading products</p>';
    }
}

// Product Display: Render products organized by category with emojis
function renderProducts() {
    // Why: Clear DOM manipulation pattern with early exit for empty states
    productGrid.innerHTML = '';
    
    if (products.length === 0) {
        productGrid.innerHTML = '<p>No products available</p>';
        return;
    }
    
    // Why: Grouping by category improves visual organization and scanning
    const groupedProducts = {};
    products.forEach(product => {
        if (!groupedProducts[product.category]) {
            groupedProducts[product.category] = [];
        }
        groupedProducts[product.category].push(product);
    });
    
    // Why: Sorted category rendering provides consistent user experience
    Object.keys(groupedProducts).sort().forEach(category => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `<h3>${category}</h3>`;
        productGrid.appendChild(categoryHeader);
        
        // Why: Emoji mapping provides visual product identification
        groupedProducts[category].forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.id = product.product_id;
            
            // Simple emoji mapping based on category
            const emojiMap = {
                'Dairy': '🥛',
                'Eggs': '🥚',
                'Fish': '🐟',
                'Meat': '🥩',
                'Honey': '🍯',
                'Wool': '🧶',
                'Leather': '👜'
            };
            
            const emoji = emojiMap[product.category] || '🌱';
            
            productCard.innerHTML = `
                <div class="emoji">${emoji}</div>
                <h3>${product.name}</h3>
                <div class="price">${formatCurrency(product.price_per_unit)}</div>
                <div class="stock">Stock: ${product.stock_quantity}</div>
            `;
            
            // Why: Direct event binding for immediate user feedback
            productCard.addEventListener('click', () => {
                addToCart(product);
            });
            
            productGrid.appendChild(productCard);
        });
    });
}

// Cart Management: Add products to shopping cart with stock validation
function addToCart(product) {
    // Why: Prevent duplicate cart entries while allowing quantity increases
    const existingItem = cart.find(item => item.product_id === parseInt(product.product_id));
    
    if (existingItem) {
        // Why: Stock validation prevents overselling
        if (existingItem.quantity < product.stock_quantity) {
            existingItem.quantity += 1;
            showNotification(`${product.name} quantity increased to ${existingItem.quantity}`, 'success');
        } else {
            showNotification(`Sorry, only ${product.stock_quantity} items available in stock`, 'warning');
            return;
        }
    } else {
        // Why: Stock availability check prevents adding out-of-stock items
        if (product.stock_quantity > 0) {
            cart.push({
                product_id: parseInt(product.product_id),
                name: product.name,
                price: parseInt(product.price_per_unit),
                quantity: 1
            });
            showNotification(`${product.name} added to cart`, 'success');
        } else {
            showNotification('This product is out of stock', 'warning');
            return;
        }
    }
    
    updateCartDisplay();
    highlightProductCard(parseInt(product.product_id));
}

// Visual Feedback: Temporary highlight for selected products
function highlightProductCard(productId) {
    // Why: Visual confirmation improves user confidence in selections
    document.querySelectorAll('.product-card').forEach(card => {
        if (parseInt(card.dataset.id) === productId) {
            card.classList.add('selected');
            setTimeout(() => {
                card.classList.remove('selected');
            }, 1000);
        }
    });
}

// Cart Display: Update UI with current cart contents and total
function updateCartDisplay() {
    // Why: Real-time total calculation provides immediate price feedback
    const total = cart.reduce((sum, item) => sum + (parseInt(item.price) * parseInt(item.quantity)), 0);
    totalAmount.textContent = formatCurrency(total);
    
    // Why: Clear empty state messaging improves UX
    if (cart.length === 0) {
        selectedItems.innerHTML = '<p class="placeholder">No items selected yet</p>';
        return;
    }
    
    selectedItems.innerHTML = '';
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'selected-item';
        itemElement.innerHTML = `
            <div>
                <strong>${item.name}</strong> × ${item.quantity}
            </div>
            <div>
                ${formatCurrency(item.price * item.quantity)}
                <button class="remove-item" data-id="${item.product_id}">×</button>
            </div>
        `;
        selectedItems.appendChild(itemElement);
    });
    
    // Why: Event delegation ensures remove buttons work for dynamically added items
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(button.dataset.id);
            removeFromCart(productId);
        });
    });
}

// Cart Management: Remove items from shopping cart
function removeFromCart(productId) {
    // Why: Array manipulation maintains cart integrity
    const itemIndex = cart.findIndex(item => item.product_id === productId);
    if (itemIndex !== -1) {
        const itemName = cart[itemIndex].name;
        cart.splice(itemIndex, 1);
        showNotification(`${itemName} removed from cart`, 'info');
        updateCartDisplay();
    }
}

// Order Processing: Handle customer order submission with validation
orderForm.addEventListener('submit', async (e) => {
    // Why: Prevent default form submission for custom handling
    e.preventDefault();
    
    // Why: Early validation prevents unnecessary server calls
    if (cart.length === 0) {
        showNotification('Please select at least one product', 'warning');
        return;
    }
    
    // Why: Form field validation ensures complete order data
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    
    if (!customerName || !customerPhone || !customerAddress) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    // Why: Order data preparation for server submission
    const orderData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        customerEmail: document.getElementById('customerEmail').value.trim(),
        totalAmount: cart.reduce((sum, item) => sum + (parseInt(item.price) * parseInt(item.quantity)), 0),
        items: cart
    };
    
    // Why: Async order submission with comprehensive error handling
    try {
        const response = await fetch('db.php?action=place_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            showNotification(`Order placed successfully! Order ID: ${result.order_id}`, 'success');
            // Why: Reset form and cart for fresh shopping experience
            orderForm.reset();
            cart = [];
            updateCartDisplay();
            loadProducts(); // Why: Refresh stock quantities after order
        } else {
            showNotification('Error placing order: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while placing your order', 'error');
    }
});

// Manager Data Loading: Load products and transactions for management view
async function loadManagerData() {
    // Why: Parallel loading improves manager view performance
    await loadManagerProducts();
    await loadTransactions();
}

// Manager Product Display: Render products with edit/delete controls
async function loadManagerProducts() {
    // Why: Separate manager view for product management operations
    try {
        const response = await fetch('db.php?action=get_products');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const jsonData = JSON.parse(text);
        const products = jsonData;
        
        managerProducts.innerHTML = '';
        
        if (products.length === 0) {
            managerProducts.innerHTML = '<p>No products found</p>';
            return;
        }
        
        // Why: Category sorting improves manager product scanning
        products.sort((a, b) => a.category.localeCompare(b.category));
        
        // Why: Grouping by category matches customer view for consistency
        const groupedProducts = {};
        products.forEach(product => {
            if (!groupedProducts[product.category]) {
                groupedProducts[product.category] = [];
            }
            groupedProducts[product.category].push(product);
        });
        
        // Why: Sorted category rendering provides consistent management experience
        Object.keys(groupedProducts).sort().forEach(category => {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `<h3>${category}</h3>`;
            managerProducts.appendChild(categoryHeader);
            
            // Why: Emoji mapping provides visual consistency with customer view
            groupedProducts[category].forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card manager-product';
                
                // Simple emoji mapping based on category
                const emojiMap = {
                    'Dairy': '🥛',
                    'Eggs': '🥚',
                    'Fish': '🐟',
                    'Meat': '🥩',
                    'Honey': '🍯',
                    'Wool': '🧶',
                    'Leather': '👜'
                };
                
                const emoji = emojiMap[product.category] || '🌱';
                
                productCard.innerHTML = `
                    <div class="emoji">${emoji}</div>
                    <h3>${product.name}</h3>
                    <div class="price">${formatCurrency(product.price_per_unit)}</div>
                    <div class="stock">Stock: ${product.stock_quantity}</div>
                    <div class="product-actions">
                        <button class="btn secondary small" onclick="editProduct(${product.product_id})">Edit</button>
                        <button class="btn danger small" onclick="deleteProduct(${product.product_id})">Delete</button>
                    </div>
                `;
                managerProducts.appendChild(productCard);
            });
        });
    } catch (error) {
        console.error('Error loading manager products:', error);
        showNotification('Error loading products', 'error');
        managerProducts.innerHTML = '<p class="error">Error loading products</p>';
    }
}

// Product Editing: Populate and display edit modal
async function editProduct(productId) {
    // Why: Find product in existing data to avoid extra server call
    const product = products.find(p => p.product_id == productId);
    
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Why: Direct DOM population for immediate user interaction
    document.getElementById('editProductId').value = product.product_id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price_per_unit;
    document.getElementById('editProductStock').value = product.stock_quantity;
    
    // Why: Modal display for focused editing experience
    document.getElementById('editModal').classList.add('show');
}

// Modal Management: Close edit modal
function closeModal() {
    // Why: Simple modal state management
    document.getElementById('editModal').classList.remove('show');
}

// Modal Interaction: Close modal when clicking outside
document.addEventListener('click', function(e) {
    // Why: Intuitive modal dismissal improves UX
    const modal = document.getElementById('editModal');
    if (modal.classList.contains('show') && e.target === modal) {
        closeModal();
    }
});

// Modal Interaction: Close modal with Escape key
document.addEventListener('keydown', function(e) {
    // Why: Keyboard accessibility follows web standards
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Product Update: Handle edit form submission
document.getElementById('editProductForm').addEventListener('submit', async function(e) {
    // Why: Prevent default form submission for custom handling
    e.preventDefault();
    
    // Why: Form data preparation for server update
    const updatedProduct = {
        product_id: document.getElementById('editProductId').value,
        name: document.getElementById('editProductName').value.trim(),
        category: document.getElementById('editProductCategory').value,
        price: parseInt(document.getElementById('editProductPrice').value),
        stock: parseInt(document.getElementById('editProductStock').value)
    };
    
    // Why: Async update with comprehensive error handling
    try {
        const response = await fetch('db.php?action=update_product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        });
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            showNotification('Product updated successfully!', 'success');
            closeModal();
            loadManagerProducts();
            loadProducts(); // Why: Refresh both views to show updated data
        } else {
            showNotification('Error updating product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while updating the product', 'error');
    }
});

// Product Deletion: Handle product removal with confirmation
async function deleteProduct(productId) {
    // Why: User confirmation prevents accidental deletions
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    // Why: Async deletion with comprehensive error handling
    try {
        const response = await fetch(`db.php?action=delete_product&id=${productId}`, {
            method: 'DELETE'
        });
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            showNotification('Product deleted successfully!', 'success');
            loadManagerProducts();
            loadProducts(); // Why: Refresh both views to remove deleted product
        } else {
            showNotification('Error deleting product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while deleting the product', 'error');
    }
}

// Transaction Display: Load and render recent orders
async function loadTransactions() {
    // Why: Separate transaction loading for manager order management
    try {
        const response = await fetch('db.php?action=get_transactions');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const jsonData = JSON.parse(text);
        const transactions = jsonData;
        
        transactionsList.innerHTML = '';
        
        if (transactions.length === 0) {
            transactionsList.innerHTML = '<p>No transactions found</p>';
            return;
        }
        
        // Why: Transaction rendering with status management controls
        transactions.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            transactionElement.innerHTML = `
                <div class="transaction-header">
                    <div>Order #${transaction.order_id}</div>
                    <div>${formatCurrency(transaction.total_amount)}</div>
                </div>
                <div class="transaction-details">
                    <div>
                        <span>Customer</span>
                        <span>${transaction.customer_name}</span>
                    </div>
                    <div>
                        <span>Date</span>
                        <span>${new Date(transaction.order_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span>Status</span>
                        <span class="status ${transaction.status.toLowerCase()}">${transaction.status}</span>
                    </div>
                </div>
                <div class="transaction-actions">
                    ${transaction.status === 'Pending' ? 
                        `<button class="btn small" onclick="updateOrderStatus(${transaction.order_id}, 'Delivered')">Mark as Delivered</button>` : 
                        ''}
                </div>
            `;
            transactionsList.appendChild(transactionElement);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions', 'error');
        transactionsList.innerHTML = '<p class="error">Error loading transactions</p>';
    }
}

// Order Status Management: Update order delivery status
async function updateOrderStatus(orderId, status) {
    // Why: Async status update with comprehensive error handling
    try {
        const response = await fetch('db.php?action=update_order_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, status })
        });
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            showNotification(`Order marked as ${status}!`, 'success');
            loadTransactions(); // Why: Refresh transactions to show updated status
        } else {
            showNotification('Error updating order: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while updating the order', 'error');
    }
}

// Product Creation: Handle new product form submission
productForm.addEventListener('submit', async (e) => {
    // Why: Prevent default form submission for custom handling
    e.preventDefault();
    
    // Why: Form validation prevents incomplete product creation
    const productName = document.getElementById('productName').value.trim();
    const productCategory = document.getElementById('productCategory').value;
    const productPrice = document.getElementById('productPrice').value;
    const productStock = document.getElementById('productStock').value;
    
    if (!productName || !productCategory || !productPrice || !productStock) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    // Why: Form data preparation for server creation
    const productData = {
        name: productName,
        category: productCategory,
        price: parseInt(productPrice),
        stock: parseInt(productStock)
    };
    
    // Why: Async creation with comprehensive error handling
    try {
        const response = await fetch('db.php?action=add_product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            showNotification('Product added successfully!', 'success');
            productForm.reset();
            loadManagerProducts();
            loadProducts(); // Why: Refresh both views to show new product
        } else {
            showNotification('Error adding product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while adding the product', 'error');
    }
});

// Application Initialization: Load initial data when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Why: Initial data loading ensures app is ready for user interaction
    loadProducts();
});