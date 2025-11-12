// 1. SECURITY & CONFIGURATION
require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For generating tokens
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080; 

const JWT_SECRET = process.env.JWT_SECRET || "a_very_insecure_default_secret_change_me_now"; 

// Define allowed origins
const allowedOrigins = [
    // Your deployed frontend URL (Render/Netlify/Vercel)
    process.env.FRONTEND_URL || "https://mystor3-production.up.railway.app/", 
    // Common local host ports for frontend/Live Server
    "http://localhost:5500", 
    "http://127.0.0.1:5500",
    "mongodb://localhost:27017/",
    // The port your backend itself is running on (for testing)
    `http://localhost:${PORT}` 
];

// FIXED CORS CONFIGURATION
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); 
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`CORS Error: Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'client')));
console.log(`Serving static files from: ${path.join(__dirname, 'client')}`);


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
// 🚀 NEW: PRODUCT SCHEMA & MODEL
// =========================================================
const ProductSchema = new mongoose.Schema({
    // Using a simple unique string for client-side ID consistency (optional, Mongoose _id is primary)
    id: { type: String, required: true, unique: true }, 
    name: { type: String, required: true },
    image: { type: String, required: true }, // Image URL or filename
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0.01 },
    stock: { type: Number, required: true, min: 0 },
    // Soft Deletion field for 'Trash' functionality
    isDeleted: { type: Boolean, default: false } 
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);
// =========================================================


// =========================================================
// 3.5 AUTHENTICATION MIDDLEWARE (Unchanged)
// =========================================================

/**
 * Middleware to check for a valid JWT in the Authorization header.
 */
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


// --- 🛑 FILLED: CUSTOMER REGISTRATION ROUTE ---
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

// --- 🛑 FILLED: CUSTOMER LOGIN ROUTE ---
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
                role: 'customer' // Explicitly define role
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
// 🚀 NEW: PRODUCT CRUD ROUTES (Admin Only)
// =========================================================

// --- 1. READ Products (PUBLIC: For Store Page) ---
// Fetches all non-deleted products
app.get("/api/products", async (req, res) => {
    try {
        // Only return products that are NOT marked as deleted
        const products = await Product.find({ isDeleted: false }).sort({ name: 1 }); 
        res.json(products);

    } catch (err) {
        console.error("Get Products Error:", err.message);
        res.status(500).json({ error: "Server error fetching products: " + err.message });
    }
});

// --- 2. CREATE Product (ADMIN PROTECTED: Add New Product) ---
app.post("/api/products", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Only Admins can create products.' });
    }

    const { id, name, image, description, price, stock } = req.body;

    // Validation
    if (!name || !image || !description || price === undefined || stock === undefined || price < 0.01 || stock < 0) {
        return res.status(400).json({ error: "Missing or invalid required product fields." });
    }

    try {
        // Generate a new unique ID if not provided (e.g., when adding a new item)
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

    // Clean up data to ensure required fields are present and valid
    if (updateData.price < 0.01 || updateData.stock < 0) {
        return res.status(400).json({ error: "Price must be positive and stock cannot be negative." });
    }

    try {
        // Use the custom 'id' field for searching
        const updatedProduct = await Product.findOneAndUpdate(
            { id: productId },
            updateData,
            { new: true } // Return the updated document
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
// This implements your "trash" (soft delete) feature
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Only Admins can delete products.' });
    }

    const productId = req.params.id;

    try {
        // Soft delete: set isDeleted to true
        const productToDelete = await Product.findOneAndUpdate(
            { id: productId, isDeleted: false }, // Find product by ID AND ensure it's not already deleted
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

// --- PROTECTED ROUTES (Unchanged) ---
app.get("/api/users", authMiddleware, async (req, res) => {
    try {
        // Enforce Admin role check
        if (req.user.role !== 'admin') {
             return res.status(403).json({ error: 'Forbidden. Admins only.' });
        }
        
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error("Protected Get Users Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

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
