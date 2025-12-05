const express = require('express');
const router = express.Router();
const {
  createWallet,
  getWallet,
  topupWallet,
  settleWallet,
  getWalletTransactions,
  getAllWallets
} = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');

// Admin routes
router.post('/', protect, authorize('admin'), createWallet);
router.get('/', protect, authorize('admin'), getAllWallets);
router.post('/:vendorId/topup', protect, authorize('admin'), topupWallet);
router.post('/:vendorId/settle', protect, authorize('admin'), settleWallet);

// User routes
router.get('/:vendorId', protect, getWallet);
router.get('/:vendorId/transactions', protect, getWalletTransactions);

module.exports = router;

