const express = require('express');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { autoUpgradeFundraiser } = require('../middleware/autoUpgradeFundraiser');
const { 
  validateCampaignCreation, 
  validateCampaignUpdate, 
  validatePagination, 
  validateSearch,
  validateObjectId 
} = require('../middleware/validation');
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignDonations,
  addCampaignUpdate,
  getCampaignAnalytics,
  incrementShare,
  getCampaignStats
} = require('../controllers/campaignController');

const router = express.Router();

// @desc    Get campaign statistics (Public)
// @route   GET /api/campaigns/stats
// @access  Public
router.get('/stats', getCampaignStats);

// @desc    Get all campaigns (Public)
// @route   GET /api/campaigns
// @access  Public
router.get('/', optionalAuth, validatePagination, validateSearch, getCampaigns);

// @desc    Get single campaign (Public)
// @route   GET /api/campaigns/:id
// @access  Public
router.get('/:id', optionalAuth, validateObjectId(), getCampaign);

// @desc    Create new campaign
// @route   POST /api/campaigns
// @access  Private (Auto-upgrades donor to fundraiser)
router.post('/', protect, autoUpgradeFundraiser, authorize('fundraiser', 'admin'), validateCampaignCreation, createCampaign);

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
router.put('/:id', protect, validateObjectId(), validateCampaignUpdate, updateCampaign);

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
router.delete('/:id', protect, validateObjectId(), deleteCampaign);

// @desc    Get campaign donations
// @route   GET /api/campaigns/:id/donations
// @access  Public
router.get('/:id/donations', validateObjectId(), validatePagination, getCampaignDonations);

// @desc    Add campaign update
// @route   POST /api/campaigns/:id/updates
// @access  Private
router.post('/:id/updates', protect, validateObjectId(), addCampaignUpdate);

// @desc    Get campaign analytics
// @route   GET /api/campaigns/:id/analytics
// @access  Private
router.get('/:id/analytics', protect, validateObjectId(), getCampaignAnalytics);

// @desc    Increment share count
// @route   POST /api/campaigns/:id/share
// @access  Public
router.post('/:id/share', incrementShare);

module.exports = router;



