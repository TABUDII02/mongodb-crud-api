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


// 3. Schema & Model (Keeping unchanged for completeness)
const UserSchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true }, password: { type: String, required: true } });
const User = mongoose.model("User", UserSchema);

const AdminSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, email: { type: String, required: true, unique: true }, password: { type: String, required: true }, role: { type: String, default: 'admin' } });
const Admin = mongoose.model("Admin", AdminSchema);

const ProductSchema = new mongoose.Schema({ id: { type: String, required: true, unique: true }, name: { type: String, required: true }, image: { type: String, required: true }, description: { type: String, required: true }, price: { type: Number, required: true, min: 0.01 }, stock: { type: Number, required: true, min: 0 }, isDeleted: { type: Boolean, default: false } }, { timestamps: true });
const Product = mongoose.model("Product", ProductSchema);


// 3.5 AUTHENTICATION MIDDLEWARE
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); 
    if (!token) { return res.status(401).json({ error: 'Access denied. No token provided.' }); }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user; 
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid or has expired.' });
    }
};


// =========================================================
// 4. ROUTES (ALL API ROUTES MUST BE DEFINED HERE FIRST) 
// This placement fixes the "Not Found" error on Admin Login!
// =========================================================

// Root route
app.get("/", (req, res) => {
    res.json({
        status: "API is Live!",
        message: "Welcome to the MongoDB CRUD API."
    });
});


// --- CUSTOMER REGISTRATION ROUTE ---
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) { return res.status(400).json({ error: "Please provide name, email, and password." }); }
    try {
        let user = await User.findOne({ email });
        if (user) { return res.status(409).json({ error: "User already exists with this email." }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Registration successful! Please log in.", user: { _id: newUser._id, name: newUser.name, email: newUser.email } });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ error: "Server error during registration: " + err.message });
    }
});

// --- CUSTOMER LOGIN ROUTE ---
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) { return res.status(400).json({ error: "Please provide both email and password." }); }
    try {
        const user = await User.findOne({ email });
        if (!user) { return res.status(401).json({ error: "Invalid credentials." }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ error: "Invalid credentials." }); }
        const payload = { user: { id: user._id, name: user.name, role: 'customer' } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ message: "Login successful!", token: token, user: { _id: user._id, name: user.name, email: user.email } });
        });
    } catch (err) {
        console.error("Customer Login Error:", err.message);
        res.status(500).json({ error: "Server error during login: " + err.message });
    }
});


// --- ADMIN AUTH ROUTE ---
app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        if (!admin) { return res.status(401).json({ error: "Invalid admin credentials." }); }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) { return res.status(401).json({ error: "Invalid admin credentials." }); }
        const payload = { user: { id: admin._id, name: admin.username, role: admin.role } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ message: "Admin login successful!", token: token, user: { _id: admin._id, name: admin.username, email: admin.email, role: admin.role } });
        });
    } catch (err) {
        console.error("Admin Login Error:", err.message);
        res.status(500).json({ error: "Server error during admin login: " + err.message });
    }
});


// --- READ Products (PUBLIC) ---
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false }).sort({ name: 1 }); 
        res.json(products);
    } catch (err) {
        console.error("Get Products Error:", err.message);
        res.status(500).json({ error: "Server error fetching products: " + err.message });
    }
});

// --- CREATE Product (ADMIN PROTECTED) ---
app.post("/api/products", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden. Only Admins can create products.' }); }
    const { id, name, image, description, price, stock } = req.body;
    if (!name || !image || !description || price === undefined || stock === undefined || price < 0.01 || stock < 0) { return res.status(400).json({ error: "Missing or invalid required product fields." }); }
    try {
        const productId = id || `P-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const newProduct = new Product({ id: productId, name, image, description, price, stock });
        await newProduct.save();
        res.status(201).json({ message: "Product created successfully!", product: newProduct });
    } catch (err) {
        console.error("Product Creation Error:", err.message);
        res.status(500).json({ error: "Server error during product creation: " + err.message });
    }
});

// --- UPDATE Product (ADMIN PROTECTED) ---
app.put("/api/products/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden. Only Admins can update products.' }); }
    const productId = req.params.id;
    const updateData = req.body;
    if (updateData.price < 0.01 || updateData.stock < 0) { return res.status(400).json({ error: "Price must be positive and stock cannot be negative." }); }
    try {
        const updatedProduct = await Product.findOneAndUpdate({ id: productId }, updateData, { new: true });
        if (!updatedProduct) { return res.status(404).json({ error: "Product not found." }); }
        res.json({ message: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        console.error("Product Update Error:", err.message);
        res.status(500).json({ error: "Server error during product update: " + err.message });
    }
});

// --- DELETE Product (ADMIN PROTECTED) ---
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden. Only Admins can delete products.' }); }
    const productId = req.params.id;
    try {
        const productToDelete = await Product.findOneAndUpdate({ id: productId, isDeleted: false }, { isDeleted: true }, { new: true });
        if (!productToDelete) { return res.status(404).json({ error: "Product not found or already deleted." }); }
        res.json({ message: `Product '${productToDelete.name}' moved to trash (soft deleted).`, product: productToDelete });
    } catch (err) {
        console.error("Product Soft Delete Error:", err.message);
        res.status(500).json({ error: "Server error during product soft deletion: " + err.message });
    }
});

// --- PROTECTED ROUTES (Admin only) ---
app.get("/api/users", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden. Admins only.' }); }
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error("Protected Get Users Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// =========================================================
// 5. STATIC FILE SERVING (Must be AFTER all API routes)
// =========================================================
app.use(express.static(path.join(__dirname, 'client')));
console.log(`Serving static files from: ${path.join(__dirname, 'client')}`);


// FINAL Middleware: JSON 404 NOT FOUND HANDLER (MUST BE LAST)
app.use((req, res, next) => {
    res.status(404).json({ 
        error: "Route Not Found", 
        message: `The API endpoint '${req.originalUrl}' does not exist.`
    });
});


// 6. Start Server
app.listen(PORT, () => 
    console.log(`Server running on port ${PORT}`)
);
