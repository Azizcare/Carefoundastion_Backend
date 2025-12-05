const ContactQuery = require('../models/ContactQuery');
const { sendEmail } = require('../utils/emailService');

// @desc    Create new contact query
// @route   POST /api/contact
// @access  Public
exports.createContactQuery = async (req, res) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Clean phone number - remove any non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If phone starts with country code (91), remove it
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    // Validate phone format (10 digits)
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate category
    const validCategories = ['general', 'support', 'partnership', 'donation', 'volunteer', 'complaint', 'feedback', 'other'];
    const finalCategory = category && validCategories.includes(category) ? category : 'general';

    // Create query
    const query = await ContactQuery.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      subject: subject.trim(),
      message: message.trim(),
      category: finalCategory,
      metadata: {
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        referrer: req.get('referer') || req.headers?.referer || 'unknown',
        source: 'website'
      }
    });

    // Send confirmation email to user (non-blocking)
    // Use nodemailer directly since emailService expects template format
    const nodemailer = require('nodemailer');
    const createTransporter = () => {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null; // Email not configured
      }
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    };

    // Send email asynchronously (don't block response)
    (async () => {
      try {
        const transporter = createTransporter();
        if (!transporter) {
          console.log('📧 Email not configured, skipping confirmation email');
          return;
        }

        await transporter.sendMail({
          from: `"Care Foundation" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Thank you for contacting Care Foundation',
          text: `Dear ${name},

Thank you for reaching out to Care Foundation Trust.

We have received your message and our team will get back to you within 24-48 hours.

Your Query Details:
- Subject: ${subject}
- Message: ${message}
- Reference ID: ${query._id}

If you have any urgent concerns, please call us directly.

Best regards,
Care Foundation Team`,
          html: `
            <h2>Thank you for contacting us!</h2>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for reaching out to <strong>Care Foundation Trust</strong>.</p>
            <p>We have received your message and our team will get back to you within 24-48 hours.</p>
            
            <h3>Your Query Details:</h3>
            <ul>
              <li><strong>Subject:</strong> ${subject}</li>
              <li><strong>Message:</strong> ${message}</li>
              <li><strong>Reference ID:</strong> ${query._id}</li>
            </ul>
            
            <p>If you have any urgent concerns, please call us directly.</p>
            <p><strong>Best regards,</strong><br/>Care Foundation Team</p>
          `
        });
        console.log('✅ Confirmation email sent to:', email);
      } catch (emailError) {
        console.error('Email sending failed (non-critical):', emailError);
        // Don't fail the request if email fails
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will contact you soon.',
      data: {
        id: query._id,
        name: query.name,
        email: query.email,
        subject: query.subject,
        category: query.category
      }
    });

  } catch (error) {
    console.error('Contact query creation error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        errors: errors
      });
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A query with this email already exists. Please wait for our response.'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit your query. Please try again later.'
    });
  }
};

// @desc    Get all contact queries (Admin)
// @route   GET /api/contact
// @access  Private/Admin
exports.getAllQueries = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      page = 1,
      limit = 10,
      search,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};

    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Search
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const queries = await ContactQuery.find(query)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortBy);

    const total = await ContactQuery.countDocuments(query);

    res.status(200).json({
      success: true,
      data: queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact queries'
    });
  }
};

// @desc    Get single contact query
// @route   GET /api/contact/:id
// @access  Private/Admin
exports.getQuery = async (req, res) => {
  try {
    const query = await ContactQuery.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('response.respondedBy', 'name email')
      .populate('notes.addedBy', 'name email');

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.status(200).json({
      success: true,
      data: query
    });

  } catch (error) {
    console.error('Get query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch query'
    });
  }
};

// @desc    Update query status
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
exports.updateQueryStatus = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.body;

    const query = await ContactQuery.findByIdAndUpdate(
      req.params.id,
      { status, priority, assignedTo },
      { new: true, runValidators: true }
    );

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Query status updated successfully',
      data: query
    });

  } catch (error) {
    console.error('Update query status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update query status'
    });
  }
};

// @desc    Respond to query
// @route   POST /api/contact/:id/respond
// @access  Private/Admin
exports.respondToQuery = async (req, res) => {
  try {
    const { message } = req.body;

    const query = await ContactQuery.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Update response
    query.response = {
      message,
      respondedBy: req.user.id,
      respondedAt: new Date()
    };
    query.status = 'resolved';

    await query.save();

    // Send response email to user
    try {
      await sendEmail({
        to: query.email,
        subject: `Response to: ${query.subject}`,
        text: `Dear ${query.name},

Thank you for your patience.

Your Query:
${query.message}

Our Response:
${message}

Reference ID: ${query._id}

If you have any further questions, feel free to contact us.

Best regards,
Care Foundation Team`,
        html: `
          <h2>Response to Your Query</h2>
          <p>Dear <strong>${query.name}</strong>,</p>
          <p>Thank you for your patience.</p>
          
          <h3>Your Query:</h3>
          <p>${query.message}</p>
          
          <h3>Our Response:</h3>
          <p>${message}</p>
          
          <p><small>Reference ID: ${query._id}</small></p>
          
          <p>If you have any further questions, feel free to contact us.</p>
          <p><strong>Best regards,</strong><br/>Care Foundation Team</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Response sent successfully',
      data: query
    });

  } catch (error) {
    console.error('Respond to query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response'
    });
  }
};

// @desc    Add note to query
// @route   POST /api/contact/:id/notes
// @access  Private/Admin
exports.addNote = async (req, res) => {
  try {
    const { message } = req.body;

    const query = await ContactQuery.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    query.notes.push({
      message,
      addedBy: req.user.id
    });

    await query.save();

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: query
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
};

// @desc    Delete query
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteQuery = async (req, res) => {
  try {
    const query = await ContactQuery.findByIdAndDelete(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Query deleted successfully'
    });

  } catch (error) {
    console.error('Delete query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete query'
    });
  }
};









