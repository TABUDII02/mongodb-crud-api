
// 1. SECURITY & CONFIGURATION
require('dotenv').config(); // Load environment variables from .env file
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs"); // For password hashing

const app = express();
const PORT = 27017;

// Middleware
app.use(cors());
// Set up body-parser to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// 2. MongoDB Connection (Cleaned up)
// Use the environment variable for production/Atlas, fall back to localhost
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";

mongoose.connect(DB_URL) // Deprecated options removed
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// 3. Schema & Model (Added Password field)
const UserSchema = new mongoose.Schema({
    // For e-commerce, it's common to use 'username' or 'name' and definitely 'password'
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Store the HASHED password
});

const User = mongoose.model("User", UserSchema);


// 4. Routes (Updated for Registration)

// Route to register a new user (Securely with Hashing)
app.post("/api/register", async (req, res) => {
    // Note: The front-end form should submit name, email, and password
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


// 5. Start Server (Fixed Console Log)
app.listen(PORT, () => 
    // FIXED: Changed single quotes to backticks (`) for template literal
    console.log(`Server running on http://localhost:${PORT}`)
);