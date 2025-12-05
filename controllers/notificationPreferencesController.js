const User = require('../models/User');

// @desc    Get notification preferences
// @route   GET /api/users/notifications/preferences
// @access  Private
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        preferences: user.preferences.notifications || {
          email: true,
          sms: true,
          whatsapp: false,
          push: true,
          donationUpdates: true,
          couponUpdates: true,
          eventReminders: true
        }
      }
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get notification preferences'
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/users/notifications/preferences
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Preferences object is required'
      });
    }

    const user = await User.findById(req.user.id);

    // Update preferences
    if (preferences.email !== undefined) user.preferences.notifications.email = preferences.email;
    if (preferences.sms !== undefined) user.preferences.notifications.sms = preferences.sms;
    if (preferences.whatsapp !== undefined) user.preferences.notifications.whatsapp = preferences.whatsapp;
    if (preferences.push !== undefined) user.preferences.notifications.push = preferences.push;
    if (preferences.donationUpdates !== undefined) user.preferences.notifications.donationUpdates = preferences.donationUpdates;
    if (preferences.couponUpdates !== undefined) user.preferences.notifications.couponUpdates = preferences.couponUpdates;
    if (preferences.eventReminders !== undefined) user.preferences.notifications.eventReminders = preferences.eventReminders;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification preferences updated successfully',
      data: {
        preferences: user.preferences.notifications
      }
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update notification preferences'
    });
  }
};

