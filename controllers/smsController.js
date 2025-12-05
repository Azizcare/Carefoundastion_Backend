const twilio = require('twilio');

// Initialize Twilio client (optional - only if credentials are provided)
let client = null;
let TWILIO_PHONE_NUMBER = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
    console.log('✅ Twilio SMS service initialized');
  } catch (error) {
    console.warn('⚠️ Twilio initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ Twilio credentials not found - SMS features disabled');
}

// @desc    Send SMS
// @route   POST /api/sms/send
// @access  Private
exports.sendSMS = async (req, res) => {
  try {
    // Check if Twilio is configured
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'SMS service is not configured. Please contact administrator.'
      });
    }

    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Format phone number (add country code if not present)
    const formattedPhone = to.startsWith('+') ? to : `+91${to}`;

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        sid: result.sid,
        status: result.status,
        to: result.to
      }
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      error: error.message
    });
  }
};

// @desc    Send donation receipt SMS
// @route   POST /api/sms/donation-receipt
// @access  Private
exports.sendDonationReceiptSMS = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'SMS service is not configured'
      });
    }

    const { phone, amount, campaignTitle, donorName } = req.body;

    if (!phone || !amount || !campaignTitle) {
      return res.status(400).json({
        success: false,
        message: 'Phone, amount, and campaign title are required'
      });
    }

    const message = `Dear ${donorName || 'Donor'},\n\nThank you for your donation of ₹${amount} to "${campaignTitle}".\n\nYour generosity makes a difference!\n\n- Care Foundation Trust`;

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    res.status(200).json({
      success: true,
      message: 'Donation receipt SMS sent successfully',
      data: {
        sid: result.sid,
        status: result.status
      }
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      error: error.message
    });
  }
};

// @desc    Send campaign approval SMS
// @route   POST /api/sms/campaign-approval
// @access  Private (Admin)
exports.sendCampaignApprovalSMS = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ success: false, message: 'SMS service not configured' });
    }

    const { phone, campaignTitle, fundraiserName } = req.body;

    if (!phone || !campaignTitle) {
      return res.status(400).json({
        success: false,
        message: 'Phone and campaign title are required'
      });
    }

    const message = `Dear ${fundraiserName || 'Fundraiser'},\n\nYour campaign "${campaignTitle}" has been approved and is now live!\n\nStart sharing it to reach your goal.\n\n- Care Foundation Trust`;

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    res.status(200).json({
      success: true,
      message: 'Campaign approval SMS sent successfully',
      data: {
        sid: result.sid,
        status: result.status
      }
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      error: error.message
    });
  }
};

// @desc    Send OTP SMS
// @route   POST /api/sms/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ success: false, message: 'SMS service not configured' });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    const message = `Your OTP for Care Foundation Trust is: ${otp}\n\nValid for 10 minutes. Do not share with anyone.`;

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    // In production, store OTP in database with expiry
    // For now, just return success

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        sid: result.sid,
        status: result.status,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only return in dev mode
      }
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

// @desc    Send bulk SMS
// @route   POST /api/sms/send-bulk
// @access  Private (Admin)
exports.sendBulkSMS = async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ success: false, message: 'SMS service not configured' });
    }

    const { phones, message } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0 || !message) {
      return res.status(400).json({
        success: false,
        message: 'Array of phone numbers and message are required'
      });
    }

    const results = await Promise.allSettled(
      phones.map(phone => {
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        return client.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.status(200).json({
      success: true,
      message: `Bulk SMS sent: ${successful} successful, ${failed} failed`,
      data: {
        total: phones.length,
        successful,
        failed,
        results: results.map((r, index) => ({
          phone: phones[index],
          status: r.status,
          sid: r.status === 'fulfilled' ? r.value.sid : null,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      }
    });

  } catch (error) {
    console.error('Bulk SMS sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk SMS',
      error: error.message
    });
  }
};

// Helper function to send SMS (for use in other controllers)
exports.sendSMSHelper = async (to, message) => {
  try {
    // If Twilio not configured, return silently (don't break the flow)
    if (!client) {
      console.warn('⚠️ SMS not sent - Twilio not configured');
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    const formattedPhone = to.startsWith('+') ? to : `+91${to}`;
    
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

