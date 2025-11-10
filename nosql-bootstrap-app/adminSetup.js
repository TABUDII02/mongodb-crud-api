// adminSetup.js (RUN THIS ONCE!)

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// --- 🛑 NOTE: Ensure the connection URL and Schema match server.js ---
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";
//const DB_URL = "mongodb://localhost:27017/";
// Re-defining the Admin Schema model for the script execution
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    role: { type: String, default: 'admin' }
});
const Admin = mongoose.model("Admin", AdminSchema);

async function createInitialAdmin() {
    try {
        await mongoose.connect(DB_URL);
        console.log("MongoDB Connected for Admin Setup...");

        const ADMIN_EMAIL = "admin@mystore.com";
        const ADMIN_PASS = "admin123";
        const ADMIN_USER = "store_manager";

        let admin = await Admin.findOne({ email: ADMIN_EMAIL });

        if (admin) {
            console.log("Admin user already exists. Skipping creation.");
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASS, salt);

        const newAdmin = new Admin({
            username: ADMIN_USER,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();
        console.log("\n✅ Initial Admin Created Successfully!");
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASS}`);
        console.log("   You can now test the admin login route.");
        
    } catch (err) {
        console.error("\n❌ Error creating initial admin:", err.message);
    } finally {
        // Disconnect after operation
        mongoose.disconnect(); 
    }
}

createInitialAdmin();