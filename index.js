require('dotenv').config();
console.log("Debug Mongo URI:", process.env.MONGO_URI); 
const dbURI = process.env.MONGO_URI;
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB
mongoose.connect(dbURI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));
// 2. Define the Expense Schema
const ExpenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  paidBy: String,
  splitBetween: [String], // <--- CHANGE THIS (Was [Number])
  amountPerPerson: Number,
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', ExpenseSchema);

const FriendSchema = new mongoose.Schema({
  name: String,
  avatar: String, 
});

const Friend = mongoose.model('Friend', FriendSchema);

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// --- ROUTES ---

// A. OCR Scanning (Existing)
app.post('/api/scan', upload.single('receipt'), async (req, res) => {
    // ... (Keep your existing OCR logic here!) ...
    // Note: I'm skipping pasting the whole OCR block to keep this readable.
    // PASTE YOUR WORKING OCR LOGIC BACK HERE.
    // If you need me to paste the full file again, let me know!
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
        const lines = text.split('\n');
        let detectedTotal = 0;
        // ... (Your smart regex logic) ...
        // Quick fallback for demo:
        const numbers = text.match(/\d+\.\d{2}/g);
        if (numbers) detectedTotal = Math.max(...numbers.map(n => parseFloat(n)));
        
        fs.unlinkSync(req.file.path);
        res.json({ success: true, total: detectedTotal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// D. GET Friends
app.get('/api/friends', async (req, res) => {
    const friends = await Friend.find();
    res.json(friends);
});

// E. ADD Friend
app.post('/api/friends', async (req, res) => {
    try {
        const { name } = req.body;
        // Auto-generate avatar (e.g., "Abhishek" -> "AB")
        const avatar = name.substring(0, 2).toUpperCase();
        
        const newFriend = new Friend({ name, avatar });
        await newFriend.save();
        
        res.json({ success: true, friend: newFriend });
    } catch (error) {
        res.status(500).json({ error: "Failed to add friend" });
    }
});

// B. SAVE Expense (New!)
app.post('/api/expenses', async (req, res) => {
    try {
        const newExpense = new Expense(req.body);
        await newExpense.save();
        console.log("💰 Expense Saved:", newExpense);
        res.json({ success: true, message: "Expense Saved!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save expense" });
    }
});

// C. GET Expenses (For Dashboard later)
app.get('/api/expenses', async (req, res) => {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
});

// F. DELETE Expense
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});