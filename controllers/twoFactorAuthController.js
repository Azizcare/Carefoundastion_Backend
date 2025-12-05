const User = require('../models/User');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// @desc    Enable 2FA - Generate secret and QR code
// @route   POST /api/auth/2fa/enable
// @access  Private
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.twoFactorAuth.enabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is already enabled for this account'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Care Foundation (${user.email})`,
      issuer: 'Care Foundation Trust'
    });

    // Save secret temporarily (not enabled yet)
    user.twoFactorAuth.secret = secret.base32;
    await user.save({ validateBeforeSave: false });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    user.twoFactorAuth.backupCodes = backupCodes;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: '2FA setup initiated. Please verify with OTP to enable.',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes, // Show only once
        manualEntryKey: secret.base32
      }
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enable 2FA'
    });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select('+twoFactorAuth.secret +twoFactorAuth.backupCodes');

    if (!user.twoFactorAuth.secret) {
      return res.status(400).json({
        status: 'error',
        message: '2FA setup not initiated. Please enable 2FA first.'
      });
    }

    if (user.twoFactorAuth.enabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is already enabled'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) before/after
    });

    // Check backup codes if token verification fails
    let isValid = verified;
    if (!verified && user.twoFactorAuth.backupCodes.includes(token.toUpperCase())) {
      isValid = true;
      // Remove used backup code
      user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(
        code => code !== token.toUpperCase()
      );
    }

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.verifiedAt = new Date();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: '2FA enabled successfully',
      data: {
        backupCodes: user.twoFactorAuth.backupCodes // Show remaining backup codes
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify 2FA'
    });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user.id).select('+password +twoFactorAuth.secret');

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled for this account'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password'
      });
    }

    // Verify 2FA token
    if (token) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified && !user.twoFactorAuth.backupCodes.includes(token.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid 2FA code'
        });
      }
    }

    // Disable 2FA
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.secret = undefined;
    user.twoFactorAuth.backupCodes = [];
    user.twoFactorAuth.verifiedAt = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to disable 2FA'
    });
  }
};

// @desc    Verify 2FA token during login
// @route   POST /api/auth/2fa/verify-login
// @access  Public
exports.verifyLogin2FA = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select('+twoFactorAuth.secret +twoFactorAuth.backupCodes');

    if (!user || !user.twoFactorAuth.enabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled for this account'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    // Check backup codes
    let isValid = verified;
    if (!verified && user.twoFactorAuth.backupCodes.includes(token.toUpperCase())) {
      isValid = true;
      user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(
        code => code !== token.toUpperCase()
      );
      await user.save({ validateBeforeSave: false });
    }

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid 2FA code'
      });
    }

    res.status(200).json({
      status: 'success',
      message: '2FA verified successfully'
    });
  } catch (error) {
    console.error('Verify login 2FA error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify 2FA'
    });
  }
};

// @desc    Get 2FA status
// @route   GET /api/auth/2fa/status
// @access  Private
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        enabled: user.twoFactorAuth.enabled || false,
        verifiedAt: user.twoFactorAuth.verifiedAt
      }
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get 2FA status'
    });
  }
};

// @desc    Regenerate backup codes
// @route   POST /api/auth/2fa/regenerate-backup-codes
// @access  Private
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password +twoFactorAuth.secret +twoFactorAuth.backupCodes');

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password'
      });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    user.twoFactorAuth.backupCodes = backupCodes;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Backup codes regenerated',
      data: {
        backupCodes: backupCodes
      }
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to regenerate backup codes'
    });
  }
};

