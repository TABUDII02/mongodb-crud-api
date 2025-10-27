// 1. SECURITY & CONFIGURATION
require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs"); // For password hashing

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// 2. MongoDB Connection
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";

mongoose.connect(DB_URL)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// 3. Schema & Model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", UserSchema);


// 4. Routes (Registration, Login, Users)

// Route for the root path (/)
app.get("/", (req, res) => {
    res.json({
        status: "API is Live!",
        message: "Welcome to the MongoDB CRUD API.",
        documentation: "Access routes like /api/register, /api/login, and /api/users."
    });
});

// Route to register a new user
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword
        });
        
        await newUser.save();

        res.status(201).json({ 
            _id: newUser._id, 
            name: newUser.name, 
            email: newUser.email 
        });

    } catch (err) {
        res.status(500).json({ error: "Server error during registration: " + err.message });
    }
});

// ROUTE TO AUTHENTICATE AND LOG IN A USER
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

        res.json({
            message: "Login successful!",
            user: { 
                _id: user._id, 
                name: user.name, 
                email: user.email 
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Server error during login: " + err.message });
    }
});

// Route to get all users
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// -----------------------------------------------------------------
// 🛑 NEW SECTION 6: JSON 404 NOT FOUND HANDLER (Critical Fix)
// -----------------------------------------------------------------
app.use((req, res, next) => {
    // This handler catches any request that reached this point
    // (i.e., didn't match any route above).
    res.status(404).json({ 
        error: "Route Not Found", 
        message: `The API endpoint '${req.originalUrl}' does not exist.`
    });
});


// 5. Start Server
app.listen(PORT, () => 
    console.log(`Server running on port ${PORT}`)
);
