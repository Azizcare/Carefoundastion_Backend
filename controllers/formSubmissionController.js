const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');

// @desc    Submit form
// @route   POST /api/form-submissions
// @access  Public
exports.submitForm = async (req, res) => {
  try {
    // Normalize address field - convert string to object if needed
    if (req.body.personalInfo?.address && typeof req.body.personalInfo.address === 'string') {
      req.body.personalInfo.address = {
        street: req.body.personalInfo.address,
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      };
    }

    const formData = {
      ...req.body,
      submittedBy: req.user?.id,
      status: 'pending'
    };

    const submission = await FormSubmission.create(formData);

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully. Admin will review it soon.',
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all form submissions
// @route   GET /api/form-submissions
// @access  Private/Admin
exports.getFormSubmissions = async (req, res) => {
  try {
    const { formType, status } = req.query;

    let query = {};
    if (formType) query.formType = formType;
    if (status) query.status = status;

    const submissions = await FormSubmission.find(query)
      .populate('submittedBy', 'name email phone')
      .populate('reviewedBy', 'name')
      .populate('generatedProfile', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single form submission
// @route   GET /api/form-submissions/:id
// @access  Private/Admin
exports.getFormSubmission = async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.id)
      .populate('submittedBy', 'name email phone')
      .populate('reviewedBy', 'name')
      .populate('generatedProfile', 'name email role');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Form submission not found'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve form submission
// @route   PUT /api/form-submissions/:id/approve
// @access  Private/Admin
exports.approveForm = async (req, res) => {
  try {
    const { assignedRole, reviewNotes } = req.body;
    const submission = await FormSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Form submission not found'
      });
    }

    submission.status = 'approved';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.reviewNotes = reviewNotes;
    submission.assignedRole = assignedRole || submission.formType;

    // Create user profile if doesn't exist
    let user;
    if (submission.submittedBy) {
      user = await User.findById(submission.submittedBy);
      if (user) {
        user.role = assignedRole || submission.formType;
        await user.save();
      }
    } else {
      // Create new user from form data
      const userData = {
        name: submission.personalInfo.firstName + ' ' + (submission.personalInfo.lastName || ''),
        email: submission.personalInfo.email,
        phone: submission.personalInfo.phone,
        role: assignedRole || submission.formType,
        address: submission.personalInfo.address,
        isVerified: true
      };

      // Set default password (should be changed on first login)
      userData.password = 'TempPass123!@#';

      user = await User.create(userData);
    }

    submission.generatedProfile = user._id;
    await submission.save();

    res.json({
      success: true,
      message: 'Form approved and user profile created',
      data: {
        submission,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject form submission
// @route   PUT /api/form-submissions/:id/reject
// @access  Private/Admin
exports.rejectForm = async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    const submission = await FormSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Form submission not found'
      });
    }

    submission.status = 'rejected';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.reviewNotes = reviewNotes;

    await submission.save();

    res.json({
      success: true,
      message: 'Form rejected',
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit form submission
// @route   PUT /api/form-submissions/:id
// @access  Private/Admin
exports.editForm = async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Form submission not found'
      });
    }

    Object.assign(submission, req.body);
    submission.updatedBy = req.user.id;
    await submission.save();

    res.json({
      success: true,
      message: 'Form updated successfully',
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

