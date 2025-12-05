const VolunteerCard = require('../models/VolunteerCard');
const VolunteerCertificate = require('../models/VolunteerCertificate');
const User = require('../models/User');

// @desc    Create volunteer card
// @route   POST /api/volunteer-cards
// @access  Private/Admin
exports.createVolunteerCard = async (req, res) => {
  try {
    const { volunteer, role, category, validityDate, photo } = req.body;

    if (!volunteer || !role || !category || !validityDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: volunteer, role, category, validityDate' 
      });
    }

    if (!photo || !photo.url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Photo with URL is required' 
      });
    }

    const volunteerUser = await User.findById(volunteer);
    if (!volunteerUser) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Prepare card data
    const cardData = {
      volunteer,
      name: volunteerUser.name,
      role,
      category,
      validityDate: new Date(validityDate),
      photo: {
        url: photo.url,
        publicId: photo.publicId || null
      },
      issuedBy: req.user.id,
      status: 'active'
    };

    console.log('Creating volunteer card with data:', JSON.stringify(cardData, null, 2));

    const volunteerCard = await VolunteerCard.create(cardData);

    res.status(201).json({
      success: true,
      data: volunteerCard
    });
  } catch (error) {
    console.error('Create volunteer card error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create volunteer card',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all volunteer cards
// @route   GET /api/volunteer-cards
// @access  Public
exports.getVolunteerCards = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { cardNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const cards = await VolunteerCard.find(query)
      .populate('volunteer', 'name email phone')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cards.length,
      data: cards
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single volunteer card
// @route   GET /api/volunteer-cards/:id
// @access  Public
exports.getVolunteerCard = async (req, res) => {
  try {
    const card = await VolunteerCard.findById(req.params.id)
      .populate('volunteer', 'name email phone')
      .populate('issuedBy', 'name');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Volunteer card not found' });
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify volunteer card by token
// @route   GET /api/volunteer-cards/verify/:token
// @access  Public
exports.verifyVolunteerCard = async (req, res) => {
  try {
    const card = await VolunteerCard.findOne({ verificationToken: req.params.token })
      .populate('volunteer', 'name email phone');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Invalid verification token' });
    }

    res.json({
      success: true,
      data: {
        name: card.name,
        cardNumber: card.cardNumber,
        category: card.category,
        status: card.status,
        isValid: card.isValid(),
        message: 'Verified Volunteer of Care Foundation Trust®️'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update volunteer card
// @route   PUT /api/volunteer-cards/:id
// @access  Private/Admin
exports.updateVolunteerCard = async (req, res) => {
  try {
    const { volunteer, role, category, validityDate, photo } = req.body;

    const card = await VolunteerCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Volunteer card not found' });
    }

    // Update fields
    if (volunteer) {
      const volunteerUser = await User.findById(volunteer);
      if (!volunteerUser) {
        return res.status(404).json({ success: false, message: 'Volunteer not found' });
      }
      card.volunteer = volunteer;
      card.name = volunteerUser.name;
    }
    if (role) card.role = role;
    if (category) card.category = category;
    if (validityDate) card.validityDate = new Date(validityDate);
    if (photo) {
      card.photo = {
        url: photo.url,
        publicId: photo.publicId || null
      };
    }

    await card.save();

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    console.error('Update volunteer card error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Revoke volunteer card
// @route   PUT /api/volunteer-cards/:id/revoke
// @access  Private/Admin
exports.revokeVolunteerCard = async (req, res) => {
  try {
    const card = await VolunteerCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ success: false, message: 'Volunteer card not found' });
    }

    card.status = 'revoked';
    await card.save();

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate PDF for volunteer card
// @route   GET /api/volunteer-cards/:id/pdf
// @access  Public
exports.generateVolunteerCardPDF = async (req, res) => {
  try {
    const card = await VolunteerCard.findById(req.params.id)
      .populate('volunteer', 'name email phone')
      .populate('issuedBy', 'name');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Volunteer card not found' });
    }

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    // For now, return card data as JSON
    res.json({
      success: true,
      message: 'PDF generation not yet implemented. Card data:',
      data: card
    });

    // Example PDF generation (commented out - requires pdfkit or similar):
    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument();
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename=volunteer-card-${card.cardNumber}.pdf`);
    // doc.pipe(res);
    // doc.text(`Volunteer Card: ${card.cardNumber}`, 100, 100);
    // doc.text(`Name: ${card.name}`, 100, 150);
    // doc.text(`Category: ${card.category}`, 100, 200);
    // doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create volunteer certificate
// @route   POST /api/volunteer-certificates
// @access  Private/Admin
exports.createVolunteerCertificate = async (req, res) => {
  try {
    const { volunteer, purpose, title, description, program, isPublic } = req.body;

    if (!volunteer || !purpose || !title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: volunteer, purpose, title' 
      });
    }

    const volunteerUser = await User.findById(volunteer);
    if (!volunteerUser) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Validate program enum
    const validPrograms = [
      'service_appreciation',
      'food_relief_program',
      'medical_assistance',
      'event_participation',
      'leadership_role',
      'long_term_service',
      'special_contribution',
      'other'
    ];
    const validProgram = program && validPrograms.includes(program) ? program : 'other';

    const certificateData = {
      volunteer,
      purpose,
      title,
      description: description || '',
      program: validProgram,
      isPublic: isPublic !== undefined ? isPublic : true,
      issuedBy: req.user.id
    };

    console.log('Creating volunteer certificate with data:', JSON.stringify(certificateData, null, 2));

    const certificate = await VolunteerCertificate.create(certificateData);

    res.status(201).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Create volunteer certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create volunteer certificate',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all volunteer certificates
// @route   GET /api/volunteer-certificates
// @access  Public
exports.getVolunteerCertificates = async (req, res) => {
  try {
    const { volunteer, program } = req.query;
    
    let query = {};
    if (volunteer) query.volunteer = volunteer;
    if (program) query.program = program;

    const certificates = await VolunteerCertificate.find(query)
      .populate('volunteer', 'name email phone')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update volunteer certificate
// @route   PUT /api/volunteer-cards/certificates/:id
// @access  Private/Admin
exports.updateVolunteerCertificate = async (req, res) => {
  try {
    const { volunteer, purpose, title, description, program, isPublic } = req.body;

    const certificate = await VolunteerCertificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Volunteer certificate not found' });
    }

    // Update fields
    if (volunteer) {
      const volunteerUser = await User.findById(volunteer);
      if (!volunteerUser) {
        return res.status(404).json({ success: false, message: 'Volunteer not found' });
      }
      certificate.volunteer = volunteer;
    }
    if (purpose) certificate.purpose = purpose;
    if (title) certificate.title = title;
    if (description !== undefined) certificate.description = description;
    if (program) {
      const validPrograms = [
        'service_appreciation',
        'food_relief_program',
        'medical_assistance',
        'event_participation',
        'leadership_role',
        'long_term_service',
        'special_contribution',
        'other'
      ];
      certificate.program = validPrograms.includes(program) ? program : 'other';
    }
    if (isPublic !== undefined) certificate.isPublic = isPublic;

    await certificate.save();

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Update volunteer certificate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify certificate by token
// @route   GET /api/volunteer-certificates/verify/:token
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await VolunteerCertificate.findOne({ verificationToken: req.params.token })
      .populate('volunteer', 'name email phone');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Invalid verification token' });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

