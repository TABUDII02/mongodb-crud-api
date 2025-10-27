// 1. SECURITY & CONFIGURATION
require('dotenv').config(); // Load environment variables from .env file
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs"); // For password hashing

const app = express();
const PORT = process.env.PORT || 3000;

// ***************************************************************
// 🔑 CORE FIX: CONFIGURED CORS SETTINGS
// ***************************************************************
const allowedOrigins = [
    "https://mystor3.netlify.app",         // 🔑 Your Deployed Netlify Frontend URL
    "http://localhost:5500",               // For local testing (e.g., Live Server)
    "http://localhost:3000"                // For local testing (if frontend runs locally)
];

// Configure CORS Middleware to accept requests only from your Netlify domain
app.use(cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));

// Middleware
// Use express's built-in body-parser instead of the deprecated body-parser package
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 2. MongoDB Connection (Cleaned up)
// Use the environment variable for production/Atlas, fall back to localhost
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";

mongoose.connect(DB_URL) // Deprecated options removed
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// 3. Schema & Model (Added Password field)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Store the HASHED password
});

const User = mongoose.model("User", UserSchema);


// 4. Routes (Updated for Registration and LOGIN)

// Route for the root path (/)
app.get("/", (req, res) => {
    res.json({
        status: "API is Live!",
        message: "Welcome to the MongoDB CRUD API.",
        documentation: "Access routes like /api/register, /api/login, and /api/users."
    });
});

// Route to register a new user (Securely with Hashing)
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Please provide name, email, and password." });
    }
    
    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ error: "User already exists with this email." });
        }

        // HASH the password before saving (Security!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword // Save the HASHED password
        });
        
        await newUser.save();

        // Respond with created user data (excluding the password field for security)
        res.status(201).json({ 
            _id: newUser._id, 
            name: newUser.name, 
            email: newUser.email 
        });

    } catch (err) {
        res.status(500).json({ error: "Server error during registration: " + err.message });
    }
});

// -----------------------------------------------------------------
// 🔑 NEW: ROUTE TO AUTHENTICATE AND LOG IN A USER
// -----------------------------------------------------------------
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Please provide both email and password." });
    }

    try {
        // 1. Find the user by email
        const user = await User.findOne({ email });
        
        // If user not found (Authentication Failure)
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // 2. Compare the submitted password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        // If passwords don't match (Authentication Failure)
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // 3. Login Successful! (Return safe user data)
        res.json({
            message: "Login successful!",
            // Return user data (excluding the password hash)
            user: { 
                _id: user._id, 
                name: user.name, 
                email: user.email 
            }
        });

    } catch (err) {
        // 4. Handle server errors
        res.status(500).json({ error: "Server error during login: " + err.message });
    }
});
// -----------------------------------------------------------------


// Route to get all users (Unchanged)
app.get("/api/users", async (req, res) => {
    try {
        // Use .select('-password') to ensure passwords are NEVER sent to the client
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 5.
