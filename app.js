// DOM Elements
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

// State
let products = [];
let cart = [];

// Switch between views
function switchTab(view) {
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
        loadManagerData();
    }
}

// Format currency (no decimals for BDT)
function formatCurrency(amount) {
    return `BDT ${parseInt(amount)}`;
}

// Show notification popup
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <span class="notification-close" onclick="this.parentElement.remove()">&times;</span>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Load products for customer view
async function loadProducts() {
    try {
        const response = await fetch('db.php?action=get_products');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const jsonData = JSON.parse(text);
        products = jsonData;
        // Sort by category for better UX
        products.sort((a, b) => a.category.localeCompare(b.category));
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
        productGrid.innerHTML = '<p class="error">Error loading products</p>';
    }
}

// Render products in grid (sorted by category)
function renderProducts() {
    productGrid.innerHTML = '';
    
    if (products.length === 0) {
        productGrid.innerHTML = '<p>No products available</p>';
        return;
    }
    
    // Group products by category
    const groupedProducts = {};
    products.forEach(product => {
        if (!groupedProducts[product.category]) {
            groupedProducts[product.category] = [];
        }
        groupedProducts[product.category].push(product);
    });
    
    // Render by category
    Object.keys(groupedProducts).sort().forEach(category => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `<h3>${category}</h3>`;
        productGrid.appendChild(categoryHeader);
        
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
            
            productCard.addEventListener('click', () => {
                addToCart(product);
            });
            
            productGrid.appendChild(productCard);
        });
    });
}

// Add product to cart
function addToCart(product) {
    // Check if already in cart
    const existingItem = cart.find(item => item.product_id === parseInt(product.product_id));
    
    if (existingItem) {
        // If already in cart, increase quantity (if stock allows)
        if (existingItem.quantity < product.stock_quantity) {
            existingItem.quantity += 1;
            showNotification(`${product.name} quantity increased to ${existingItem.quantity}`, 'success');
        } else {
            showNotification(`Sorry, only ${product.stock_quantity} items available in stock`, 'warning');
            return;
        }
    } else {
        // Add new item to cart
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

// Highlight selected product card
function highlightProductCard(productId) {
    document.querySelectorAll('.product-card').forEach(card => {
        if (parseInt(card.dataset.id) === productId) {
            card.classList.add('selected');
            setTimeout(() => {
                card.classList.remove('selected');
            }, 1000);
        }
    });
}

// Update cart display
function updateCartDisplay() {
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (parseInt(item.price) * parseInt(item.quantity)), 0);
    totalAmount.textContent = formatCurrency(total);
    
    // Update selected items display
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
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(button.dataset.id);
            removeFromCart(productId);
        });
    });
}

// Remove item from cart
function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.product_id === productId);
    if (itemIndex !== -1) {
        const itemName = cart[itemIndex].name;
        cart.splice(itemIndex, 1);
        showNotification(`${itemName} removed from cart`, 'info');
        updateCartDisplay();
    }
}

// Handle order submission
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
        showNotification('Please select at least one product', 'warning');
        return;
    }
    
    // Validate form
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    
    if (!customerName || !customerPhone || !customerAddress) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const orderData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        customerEmail: document.getElementById('customerEmail').value.trim(),
        totalAmount: cart.reduce((sum, item) => sum + (parseInt(item.price) * parseInt(item.quantity)), 0),
        items: cart
    };
    
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
            // Reset form and cart
            orderForm.reset();
            cart = [];
            updateCartDisplay();
            loadProducts(); // Refresh stock
        } else {
            showNotification('Error placing order: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while placing your order', 'error');
    }
});

// Manager functions
async function loadManagerData() {
    await loadManagerProducts();
    await loadTransactions();
}

async function loadManagerProducts() {
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
        
        // Sort by category
        products.sort((a, b) => a.category.localeCompare(b.category));
        
        // Group by category
        const groupedProducts = {};
        products.forEach(product => {
            if (!groupedProducts[product.category]) {
                groupedProducts[product.category] = [];
            }
            groupedProducts[product.category].push(product);
        });
        
        // Render with management options
        Object.keys(groupedProducts).sort().forEach(category => {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `<h3>${category}</h3>`;
            managerProducts.appendChild(categoryHeader);
            
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

// Edit product - FULL IMPLEMENTATION
async function editProduct(productId) {
    // Find the product in the current products array
    const product = products.find(p => p.product_id == productId);
    
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Populate the edit form
    document.getElementById('editProductId').value = product.product_id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price_per_unit;
    document.getElementById('editProductStock').value = product.stock_quantity;
    
    // Show the modal
    document.getElementById('editModal').classList.add('show');
}

// Close modal function
function closeModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('editModal');
    if (modal.classList.contains('show') && e.target === modal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Handle edit product form submission
document.getElementById('editProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const updatedProduct = {
        product_id: document.getElementById('editProductId').value,
        name: document.getElementById('editProductName').value.trim(),
        category: document.getElementById('editProductCategory').value,
        price: parseInt(document.getElementById('editProductPrice').value),
        stock: parseInt(document.getElementById('editProductStock').value)
    };
    
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
            loadProducts(); // Refresh customer view
        } else {
            showNotification('Error updating product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while updating the product', 'error');
    }
});

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
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
            loadProducts(); // Refresh customer view
        } else {
            showNotification('Error deleting product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while deleting the product', 'error');
    }
}

async function loadTransactions() {
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

// Update order status
async function updateOrderStatus(orderId, status) {
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
            loadTransactions();
        } else {
            showNotification('Error updating order: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while updating the order', 'error');
    }
}

// Handle product form submission
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate form
    const productName = document.getElementById('productName').value.trim();
    const productCategory = document.getElementById('productCategory').value;
    const productPrice = document.getElementById('productPrice').value;
    const productStock = document.getElementById('productStock').value;
    
    if (!productName || !productCategory || !productPrice || !productStock) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const productData = {
        name: productName,
        category: productCategory,
        price: parseInt(productPrice),
        stock: parseInt(productStock)
    };
    
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
            loadProducts(); // Refresh customer view
        } else {
            showNotification('Error adding product: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while adding the product', 'error');
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});