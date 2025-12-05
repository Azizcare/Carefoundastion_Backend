const Celebrity = require('../models/Celebrity');

// @desc    Create celebrity
// @route   POST /api/celebrities
// @access  Private/Admin
exports.createCelebrity = async (req, res) => {
  try {
    const celebrity = await Celebrity.create(req.body);

    res.status(201).json({
      success: true,
      data: celebrity
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all celebrities
// @route   GET /api/celebrities
// @access  Public
exports.getCelebrities = async (req, res) => {
  try {
    const { type, status, isFeatured } = req.query;

    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

    // Public can only see active celebrities
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'active';
    }

    const celebrities = await Celebrity.find(query)
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: celebrities.length,
      data: celebrities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single celebrity
// @route   GET /api/celebrities/:id
// @access  Public
exports.getCelebrity = async (req, res) => {
  try {
    const celebrity = await Celebrity.findById(req.params.id);

    if (!celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    res.json({
      success: true,
      data: celebrity
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update celebrity
// @route   PUT /api/celebrities/:id
// @access  Private/Admin
exports.updateCelebrity = async (req, res) => {
  try {
    const celebrity = await Celebrity.findById(req.params.id);

    if (!celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    Object.assign(celebrity, req.body);
    await celebrity.save();

    res.json({
      success: true,
      data: celebrity
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add celebrity video
// @route   POST /api/celebrities/:id/videos
// @access  Private/Admin
exports.addCelebrityVideo = async (req, res) => {
  try {
    const { url, platform, thumbnail, title, description } = req.body;
    const celebrity = await Celebrity.findById(req.params.id);

    if (!celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    celebrity.videos.push({
      url,
      platform,
      thumbnail,
      title,
      description,
      uploadedAt: new Date()
    });

    await celebrity.save();

    res.json({
      success: true,
      message: 'Video added successfully',
      data: celebrity
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete celebrity
// @route   DELETE /api/celebrities/:id
// @access  Private/Admin
exports.deleteCelebrity = async (req, res) => {
  try {
    const celebrity = await Celebrity.findById(req.params.id);

    if (!celebrity) {
      return res.status(404).json({
        success: false,
        message: 'Celebrity not found'
      });
    }

    await celebrity.deleteOne();

    res.json({
      success: true,
      message: 'Celebrity deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

