const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

const BudgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true }
});

// NEW: Debt Schema
const DebtSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['borrowed', 'lent'], required: true }, // 'borrowed' = I owe them, 'lent' = They owe me
  person: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  dueDate: { type: String },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

module.exports = {
  Transaction: mongoose.model('Transaction', TransactionSchema),
  Budget: mongoose.model('Budget', BudgetSchema),
  Debt: mongoose.model('Debt', DebtSchema)
};