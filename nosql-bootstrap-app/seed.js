// seed.js

require('dotenv').config(); 
const mongoose = require('mongoose');
const initialProducts = [
    { id: 'P001', name: 'Stylish Headset', image: 'ONIKUMA-GT803-Over-Ear-Headset-Noise-Canceling-HiFi-Stereo-Sound-Quality-Stylish-Ear-Hook-Gaming-Wireless-Headphone-With-Mic.jpg', description: 'High-fidelity sound with noise-canceling technology. Perfect for work and music.', price: 59.99, stock: 15 },
    { id: 'P002', name: 'Ergonomic Mouse', image: '71hcBp7MA6L.jpg', description: 'Designed for comfort and precision. Reduces wrist strain for long work sessions.', price: 24.50, stock: 50 },
    { id: 'P003', name: 'Portable Charger', image: '71NVBNrF1pL._AC_UF894,1000_QL80_.jpg', description: '20000mAh power bank. Fast charging for all your devices on the go.', price: 35.00, stock: 0 },
    { id: 'P004', name: '4K Webcam Pro', image: 'dsga35yesrthgdfh_1024x.jpg', description: 'Crystal-clear video for professional streaming and video calls.', price: 89.00, stock: 22 },
    { id: 'P005', name: 'Noise-Cancelling Buds', image: 'noise-cancelling-headphone-2048px.jpg', description: 'Ultra-compact earbuds with incredible battery life and sound.', price: 129.99, stock: 30 },
    { id: 'P006', name: 'Mechanical Keyboard', image: 'BEST-MECHANICAL-KEYBOARDS-2048px-0673.jpg', description: 'Tactile brown switches for a satisfying typing experience.', price: 99.95, stock: 12 },
    { id: 'P007', name: 'Smart Fitness Watch', image: 'venu-x1-black-cf-lg.jpg', description: 'Tracks steps, heart rate, and sleep. Stay motivated and healthy!', price: 49.99, stock: 45 },
    { id: 'P008', name: 'Portable SSD 1TB', image: 'wise-256gb-portable-ssd-hard-drive_1_o.jpg', description: 'Lightning-fast storage for backups and large media files.', price: 119.00, stock: 8 },
    { id: 'P009', name: 'Gaming Monitor 27"', image: '53_28a9d0f0-d092-417b-b6ce-f4443080dcba.jpg', description: '144Hz refresh rate, curved display for an immersive gaming experience.', price: 299.99, stock: 5 },
    { id: 'P010', name: 'Mini Projector', image: '71U0ezDt70L.jpg', description: 'Pocket-sized projector for movies anywhere. Great for travel.', price: 150.00, stock: 18 },
    { id: 'P011', name: 'Wireless Charging Pad', image: 'GallryImage1-EP-PN920TCEGUS.png', description: 'Charge your phone, watch, and earbuds simultaneously, clutter-free.', price: 39.99, stock: 60 },
    { id: 'P012', name: 'Laptop Stand', image: '6957303842919_800x.png', description: 'Ergonomic aluminum stand to improve airflow and posture.', price: 29.00, stock: 75 },
    { id: 'P013', name: 'Mesh Wi-Fi System', image: 'meshwifi_tcm167-160373.jpg', description: 'Eliminate dead zones with seamless, whole-home wireless coverage.', price: 199.99, stock: 10 },
    { id: 'P014', name: 'Portable Bluetooth Speaker', image: 'Eaton-5A-1500I-NEMA-Line-Interactive-UPS-btz.png', description: 'Rugged and waterproof with 24 hours of playtime. Perfect for outdoors.', price: 79.50, stock: 40 },
    { id: 'P015', name: 'LED Desk Lamp', image: 'Honeywell-H9-Smart-Sensing-Desk-Lamp-Honeywell-18605069.jpg', description: 'Adjustable brightness and color temperature for any task.', price: 45.00, stock: 25 },
    { id: 'P016', name: 'Stylus Pen Pro', image: 'Best-Selling-Universal-Stylus-Pencil-for-iPad-PRO-Min-Air-Active-Android-Touch-Pen-for-Tablet-Laptop-Smart-Phone.png', description: 'High-precision tip for drawing and note-taking on tablets.', price: 32.99, stock: 90 },
    { id: 'P017', name: 'Smart Plug Set (4-Pack)', image: '3f8b8f62-b976-47b5-83ea-38ef162e5c2e.080b0a8659545494a2f41a80936ac812.png', description: 'Control your appliances from anywhere using a simple mobile app.', price: 49.00, stock: 0 },
    { id: 'P018', name: 'VR Headset Starter Kit', image: 'meta-quest-3s-1_39d59f14-b14f-4572-aea4-6baab0ef65f0.png', description: 'Dive into immersive virtual reality experiences right from your home.', price: 250.00, stock: 3 },
    { id: 'P019', name: 'Digital Drawing Tablet', image: 'Digital-Art-Tablet-TSV-6-x-10-Graphics-Drawing-Tablet-with-8192-Levels-Passive-Stylus-Fit-for-Drawing-E-Learning-Online-Classes_3a066736-603d-470f-9a6d-1b123ab57cd5.733b8681aa65efd8.png', description: 'Large active area and pressure sensitivity for digital artists.', price: 149.99, stock: 7 },
    { id: 'P020', name: 'GPS Drone (Foldable)', image: 'D99-GPS-Drone-with-8K-UHD-Camera-Foldable-Drones-for-Adults-Beginners-RC-Quadcopter-Drone-Brushless-Motor-VR-Mode-GPS-Auto-Follow_267eafbc-2e77-4c00-a7f8-6b85eaefb315.a78d92752e6f26.png', description: 'Easy-to-fly drone with 4K camera and automatic return-to-home feature.', price: 399.00, stock: 15 },
];


// --- 1. Database Connection and URL ---
const DB_URL = process.env.atlas_URL || "mongodb://localhost:27017/UserDB";

// --- 2. Product Schema (Copied from server.js) ---
// We need the model here to interact with the collection
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


// --- 3. Seeder Logic ---
const seedProducts = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log("✅ MongoDB Connected for Seeding.");

        // OPTIONAL: Clean out existing products to prevent "duplicate key" errors
        await Product.deleteMany({}); 
        console.log("🗑️ Existing products cleared.");
        
        // Insert the new data array using Mongoose's insertMany
        await Product.insertMany(initialProducts);
        console.log(`✨ Successfully seeded ${initialProducts.length} products!`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        // Always close the connection when done
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
};

seedProducts(); // Run the function