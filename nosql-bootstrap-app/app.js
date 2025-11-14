// 1. SECURITY & CONFIGURATION
require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
// Using PORT 5000 is fine as Render injects the correct port via process.env.PORT
const PORT = process.env.PORT || 5000; 

const JWT_SECRET = process.env.JWT_SECRET || "a_very_insecure_default_secret_change_me_now"; 

// 🚨 RENDER FIX: Define the ONLY allowed origin (your Render Frontend Public URL)
// ⚠️ ENSURE this URL is EXACTLY correct and uses HTTPS!
const allowedOrigin = "https://mystor3.onrender.com";


// FIXED CORS CONFIGURATION (Must be executed before any routes)
app.use(cors({
    origin: allowedOrigin,
    // CRITICAL: Allowing all necessary methods for login/register and CRUD
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", 
    credentials: true,
    optionsSuccessStatus: 204
}));

// Middleware (Must be executed before any routes that need req.body)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// 2. MongoDB Connection
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";

mongoose.connect(DB_URL)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// 3. Schema & Model
// --- Customer User Schema ---
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } 
});
const User = mongoose.model("User", UserSchema);

// --- Admin User Schema ---
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    role: { type: String, default: 'admin' } 
});
const Admin = mongoose.model("Admin", AdminSchema);

// =========================================================
// 🚀 PRODUCT SCHEMA & MODEL
// =========================================================
const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, 
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0.01 },
    stock: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false } 
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);
// =========================================================

// =========================================================
// ⭐ ORDER ITEM SCHEMA (Needed for Sales Report)
// This model simulates records of products sold.
// =========================================================
const OrderItemSchema = new mongoose.Schema({
    productId: { type: String, required: true }, // References Product.id
    productName: { type: String, required: true }, 
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0.01 },
    saleDate: { type: Date, default: Date.now }
});

const OrderItem = mongoose.model("OrderItem", OrderItemSchema);
// =========================================================


// =========================================================
// 3.5 AUTHENTICATION MIDDLEWARE
// =========================================================
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); 
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user; 
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid or has expired.' });
    }
};


// =========================================================
// 4. Routes (Customer, Admin, Protected, and Product API)
// =========================================================

// Root route
app.get("/", (req, res) => {
    res.json({
        status: "API is Live!",
        message: "Welcome to the MongoDB CRUD API.",
        documentation: "Access routes like /api/register, /api/login, and /api/users."
    });
});


// --- CUSTOMER AUTH ROUTES (Unchanged) ---
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Please provide name, email, and password." });
    }
    
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ error: "User already exists with this email." });
        }

        // HASH the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        
        await newUser.save();
        
        // Respond with created user data (excluding the password field)
        res.status(201).json({ 
            message: "Registration successful! Please log in.",
            user: { _id: newUser._id, name: newUser.name, email: newUser.email }
        });

    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ error: "Server error during registration: " + err.message });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Please provide both email and password." });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Create Payload and Sign JWT
        const payload = { 
            user: {
                id: user._id, 
                name: user.name,
                role: 'customer'
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1d' }, 
            (err, token) => {
                if (err) throw err;
                
                // Return the token and user data to the client
                res.json({
                    message: "Login successful!",
                    token: token, 
                    user: { 
                        _id: user._id, 
                        name: user.name, 
                        email: user.email 
                    }
                });
            }
        );

    } catch (err) {
        console.error("Customer Login Error:", err.message);
        res.status(500).json({ error: "Server error during login: " + err.message });
    }
});


// --- ADMIN AUTH ROUTE (Unchanged) ---
app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            return res.status(401).json({ error: "Invalid admin credentials." });
        }

        // Compare HASHED password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid admin credentials." });
        }

        // Create Payload for Admin (Crucial: Include role for future access checks)
        const payload = { 
            user: {
                id: admin._id, 
                name: admin.username, 
                role: admin.role      
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1d' }, 
            (err, token) => {
                if (err) throw err;
                
                res.json({
                    message: "Admin login successful!",
                    token: token, 
                    user: { 
                        _id: admin._id, 
                        name: admin.username, 
                        email: admin.email,
                        role: admin.role
                    }
                });
            }
        );

    } catch (err) {
        console.error("Admin Login Error:", err.message);
        res.status(500).json({ error: "Server error during admin login: " + err.message });
    }
});


// =========================================================
// PRODUCT CRUD ROUTES (Admin Only)
// =========================================================

// --- 1A. READ Products (PUBLIC: For Store Page) ---
// This is the public endpoint and only shows non-deleted products.
app.get("/api/products", async (req, res) => {
    try {
        // Only fetch non-deleted products for the public store view
        const products = await Product.find({ isDeleted: false }).sort({ name: 1 }); 
        res.json(products);

    } catch (err) {
        console.error("Get Products Error:", err.message);
        res.status(500).json({ error: "Server error fetching products: " + err.message });
    }
});

// --- 1B. READ Products (ADMIN PROTECTED: For Dashboard) ---
// 🆕 NEW ROUTE: Provides the full list, including soft-deleted items, for the Admin dashboard
app.get("/api/admin/products", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden. Admins only.' });
        }

        // Fetch all products, including soft-deleted ones (if needed for trash view),
        // but typically the admin wants the full list: {}. You can adjust the filter if needed.
        const products = await Product.find({}).sort({ name: 1, isDeleted: 1 }); 
        res.json(products);

    } catch (err) {
        console.error("Get Admin Products Error:", err.message);
        res.status(500).json({ error: "Server error fetching admin products: " + err.message });
    }
});
// ----------------------------------------------------------------------------------

// --- 2. CREATE Product (ADMIN PROTECTED: Add New Product) ---
app.post("/api/products", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Only Admins can create products.' });
    }

    const { id, name, image, description, price, stock } = req.body;

    if (!name || !image || !description || price === undefined || stock === undefined || price < 0.01 || stock < 0) {
        return res.status(400).json({ error: "Missing or invalid required product fields." });
    }

    try {
        const productId = id || `P-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        const newProduct = new Product({
            id: productId,
            name,
            image,
            description,
            price,
            stock
        });

        await newProduct.save();

        res.status(201).json({ 
            message: "Product created successfully!",
            product: newProduct 
        });

    } catch (err) {
        console.error("Product Creation Error:", err.message);
        res.status(500).json({ error: "Server error during product creation: " + err.message });
    }
});

// --- 3. UPDATE Product (ADMIN PROTECTED: Edit Product Details) ---
app.put("/api/products/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Only Admins can update products.' });
    }
    
    const productId = req.params.id;
    const updateData = req.body;

    if (updateData.price < 0.01 || updateData.stock < 0) {
        return res.status(400).json({ error: "Price must be positive and stock cannot be negative." });
    }

    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { id: productId },
            updateData,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json({
            message: "Product updated successfully!",
            product: updatedProduct
        });

    } catch (err) {
        console.error("Product Update Error:", err.message);
        res.status(500).json({ error: "Server error during product update: " + err.message });
    }
});

// --- 4. DELETE Product (ADMIN PROTECTED: Soft Delete / Trash) ---
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Only Admins can delete products.' });
    }

    const productId = req.params.id;

    try {
        const productToDelete = await Product.findOneAndUpdate(
            { id: productId, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!productToDelete) {
            return res.status(404).json({ error: "Product not found or already deleted." });
        }

        res.json({
            message: `Product '${productToDelete.name}' moved to trash (soft deleted).`,
            product: productToDelete
        });

    } catch (err) {
        console.error("Product Soft Delete Error:", err.message);
        res.status(500).json({ error: "Server error during product soft deletion: " + err.message });
    }
});
// =========================================================

// =========================================================
// ⭐ CUSTOMER AND SALES MANAGEMENT ROUTES
// =========================================================

// --- 5. READ All Customer Users (ADMIN PROTECTED) ---
app.get("/api/users", authMiddleware, async (req, res) => {
    try {
        // Enforce Admin role check
        if (req.user.role !== 'admin') {
             return res.status(403).json({ error: 'Forbidden. Admins only.' });
        }
        
        // Return all registered customers (excluding password)
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error("Protected Get Users Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- 6. DELETE Customer Account (ADMIN PROTECTED) ---
app.delete("/api/users/:id", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden. Only Admins can delete user accounts.' });
        }

        const userId = req.params.id;
        
        // Find and delete the customer using Mongoose's built-in _id
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ error: "Customer not found." });
        }

        res.json({
            message: `Customer account '${deletedUser.email}' successfully deleted.`,
            deletedUser: { _id: deletedUser._id, email: deletedUser.email }
        });

    } catch (err) {
        console.error("Customer Delete Error:", err.message);
        res.status(500).json({ error: "Server error during customer deletion: " + err.message });
    }
});

// --- 7. GET Sales Report (ADMIN PROTECTED) ---
app.get("/api/sales/report", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden. Only Admins can view sales reports.' });
        }

        // Aggregate sales data by product ID and Name
        const salesReport = await OrderItem.aggregate([
            {
                $group: {
                    // Group by productId and productName
                    _id: { 
                        productId: "$productId", 
                        productName: "$productName" 
                    },
                    // Sum up the quantity sold
                    totalUnitsSold: { $sum: "$quantity" },
                    // Calculate total revenue for this product
                    totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the default _id from the result
                    productId: "$_id.productId",
                    productName: "$_id.productName",
                    totalUnitsSold: 1,
                    totalRevenue: 1
                }
            },
            {
                $sort: { totalUnitsSold: -1 } // Sort by most popular
            }
        ]);

        res.json(salesReport);

    } catch (err) {
        console.error("Sales Report Error:", err.message);
        res.status(500).json({ error: "Server error generating sales report: " + err.message });
    }
});

// --- 8. CHECKOUT TRANSACTION ---
app.post("/api/sales/checkout", authMiddleware, async (req, res) => {
    try {
        const { orderItems } = req.body;
        
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ error: 'Cannot process empty order.' });
        }

        const itemsToSave = [];
        const productUpdates = [];

        // 1. Validate and prepare items for saving and inventory update
        for (const item of orderItems) {
            // Basic validation
            if (!item.id || !item.name || item.price === undefined || item.quantity === undefined || item.quantity < 1) {
                console.error("Invalid item structure:", item);
                return res.status(400).json({ error: "Invalid or incomplete order item structure." });
            }
            
            // Prepare OrderItem for database
            itemsToSave.push({
                productId: item.id,
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
            });

            // Prepare for inventory update (decrement stock)
            productUpdates.push({
                id: item.id,
                quantity: item.quantity
            });
        }
        
        // 2. Save all new OrderItems
        // Using insertMany for a single batch write operation
        const savedItems = await OrderItem.insertMany(itemsToSave);

        // 3. Update Product Stock (Inventory Management)
        for (const update of productUpdates) {
            const { id, quantity } = update;
            
            // Atomically decrement stock. Use $inc for atomic operations.
            const updatedProduct = await Product.findOneAndUpdate(
                { id: id, isDeleted: false, stock: { $gte: quantity } }, // Check stock is sufficient
                { $inc: { stock: -quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                console.error(`INVENTORY ERROR: Failed to update stock for product ID ${id}. Required: ${quantity}`);
            }
        }

        res.status(201).json({
            message: "Order processed, sales recorded, and inventory updated successfully!",
            firstOrderItemId: savedItems[0]._id // Return a reference ID
        });

    } catch (err) {
        console.error("Checkout Transaction Error:", err.message);
        res.status(500).json({ error: "Server error during checkout transaction: " + err.message });
    }
});
// =========================================================


// FINAL Middleware: JSON 404 NOT FOUND HANDLER 
app.use((req, res, next) => {
    res.status(404).json({ 
        error: "Route Not Found", 
        message: `The API endpoint '${req.originalUrl}' does not exist.`
    });
});


// 5. Start Server
app.listen(PORT, () => 
    console.log(`Server running on port ${PORT}`)
);
