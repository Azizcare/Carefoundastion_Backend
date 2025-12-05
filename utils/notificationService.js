const { sendEmail } = require('./emailService');

// WhatsApp API integration (placeholder - implement with actual WhatsApp Business API)
const sendWhatsAppMessage = async (phone, message, template = null) => {
  try {
    // TODO: Integrate with WhatsApp Business API (Twilio, 360dialog, etc.)
    // For now, log the message
    console.log(`WhatsApp to ${phone}: ${message}`);
    
    // Example integration structure:
    // const response = await fetch('https://api.whatsapp.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     to: phone,
    //     message: message,
    //     template: template
    //   })
    // });
    
    return { success: true, message: 'WhatsApp message sent' };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
};

// SMS integration (placeholder - implement with actual SMS provider)
const sendSMS = async (phone, message) => {
  try {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    console.log(`SMS to ${phone}: ${message}`);
    
    // Example integration structure:
    // const response = await fetch('https://api.sms-provider.com/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     to: phone,
    //     message: message
    //   })
    // });
    
    return { success: true, message: 'SMS sent' };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to format coupon value
const formatCouponValue = (coupon) => {
  if (!coupon || !coupon.value) {
    return 'N/A';
  }
  
  const value = coupon.value;
  
  // Check for percentage first
  if (value.isPercentage && value.percentage) {
    return `${value.percentage}% OFF`;
  } else if (value.percentage) {
    return `${value.percentage}% OFF`;
  } 
  
  // Then check for amount
  if (value.amount !== undefined && value.amount !== null) {
    if (typeof value.amount === 'number') {
      return `₹${value.amount}`;
    } else if (typeof value.amount === 'string') {
      // For free_item and service types, amount is a description
      return value.amount;
    }
  }
  
  return 'N/A';
};

// Send coupon notification
const sendCouponNotification = async (coupon, recipient, methods = {}) => {
  const { email: sendEmail, sms: sendSMS, whatsapp: sendWhatsApp } = methods;
  
  const couponValue = formatCouponValue(coupon);
  
  const couponMessage = `
    🎉 Your Coupon is Ready!
    
    Code: ${coupon.code}
    Title: ${coupon.title}
    Value: ${couponValue}
    Valid Until: ${new Date(coupon.validity.endDate).toLocaleDateString()}
    
    Thank you for your support!
    Care Foundation Trust®️
  `;

  const results = {};

  if (sendEmail && recipient.email) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: `Your Coupon - ${coupon.title}`,
        html: `
          <h2>Your Coupon is Ready!</h2>
          <p><strong>Code:</strong> ${coupon.code}</p>
          <p><strong>Title:</strong> ${coupon.title}</p>
          <p><strong>Value:</strong> ${couponValue}</p>
          <p><strong>Valid Until:</strong> ${new Date(coupon.validity.endDate).toLocaleDateString()}</p>
          ${coupon.qrCode?.url ? `<img src="${coupon.qrCode.url}" alt="QR Code" />` : ''}
        `
      });
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  if (sendSMS && recipient.phone) {
    results.sms = await sendSMS(recipient.phone, couponMessage);
  }

  if (sendWhatsApp && recipient.phone) {
    results.whatsapp = await sendWhatsAppMessage(recipient.phone, couponMessage);
  }

  return results;
};

// Send donation confirmation
const sendDonationConfirmation = async (donation, methods = {}) => {
  const { email: sendEmail, sms: sendSMS, whatsapp: sendWhatsApp } = methods;
  
  const message = `
    ✅ Donation Confirmed!
    
    Amount: ₹${donation.amount}
    Transaction ID: ${donation.paymentDetails.transactionId}
    Campaign: ${donation.campaign?.title || 'General'}
    
    Thank you for your generosity!
    Care Foundation Trust®️
  `;

  const results = {};

  if (sendEmail && donation.donorDetails?.email) {
    try {
      await sendEmail({
        to: donation.donorDetails.email,
        subject: 'Donation Confirmation - Care Foundation Trust',
        html: `
          <h2>Thank You for Your Donation!</h2>
          <p>Amount: ₹${donation.amount}</p>
          <p>Transaction ID: ${donation.paymentDetails.transactionId}</p>
          <p>Receipt Number: ${donation.receipt.receiptNumber}</p>
        `
      });
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  if (sendSMS && donation.donorDetails?.phone) {
    results.sms = await sendSMS(donation.donorDetails.phone, message);
  }

  if (sendWhatsApp && donation.donorDetails?.phone) {
    results.whatsapp = await sendWhatsAppMessage(donation.donorDetails.phone, message);
  }

  return results;
};

// Send donation utilization update
const sendDonationUpdate = async (donation, utilizationDetails, methods = {}) => {
  const { email: sendEmail, sms: sendSMS, whatsapp: sendWhatsApp } = methods;
  
  const message = `
    📊 Your Donation Update
    
    Amount: ₹${donation.amount}
    Beneficiary: ${donation.beneficiary?.name || 'Multiple beneficiaries'}
    Utilization: ${utilizationDetails}
    
    Your donation is making a difference!
    Care Foundation Trust®️
  `;

  const results = {};

  if (sendEmail && donation.donorDetails?.email) {
    try {
      await sendEmail({
        to: donation.donorDetails.email,
        subject: 'Your Donation Update - Care Foundation Trust',
        html: `
          <h2>Your Donation Update</h2>
          <p>Your donation of ₹${donation.amount} has been utilized.</p>
          <p><strong>Utilization Details:</strong> ${utilizationDetails}</p>
        `
      });
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  if (sendSMS && donation.donorDetails?.phone) {
    results.sms = await sendSMS(donation.donorDetails.phone, message);
  }

  if (sendWhatsApp && donation.donorDetails?.phone) {
    results.whatsapp = await sendWhatsAppMessage(donation.donorDetails.phone, message);
  }

  return results;
};

// Send donation utilization update (with donor object)
const sendDonationUtilizationUpdate = async (donation, donor, utilizationDetails, methods = { email: true, sms: true, whatsapp: true }) => {
  const donorEmail = donor?.email || donation.donorDetails?.email;
  const donorPhone = donor?.phone || donation.donorDetails?.phone;
  
  const message = `
    📊 Your Donation Update
    
    Amount: ₹${donation.amount}
    Transaction ID: ${donation.paymentDetails?.transactionId || donation._id}
    Beneficiary: ${donation.beneficiary?.name || 'Multiple beneficiaries'}
    Utilization: ${utilizationDetails || donation.transparency?.utilizationDetails || 'Funds utilized for beneficiary support'}
    
    Your donation is making a difference!
    Care Foundation Trust®️
  `;

  const results = {};

  if (methods.email && donorEmail) {
    try {
      await sendEmail({
        to: donorEmail,
        subject: 'Your Donation Update - Care Foundation Trust',
        html: `
          <h2>Your Donation Update</h2>
          <p>Your donation of ₹${donation.amount} has been utilized.</p>
          <p><strong>Transaction ID:</strong> ${donation.paymentDetails?.transactionId || donation._id}</p>
          <p><strong>Beneficiary:</strong> ${donation.beneficiary?.name || 'Multiple beneficiaries'}</p>
          <p><strong>Utilization Details:</strong> ${utilizationDetails || donation.transparency?.utilizationDetails || 'Funds utilized for beneficiary support'}</p>
          <p>Thank you for your continued support!</p>
        `
      });
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  if (methods.sms && donorPhone) {
    results.sms = await sendSMS(donorPhone, message);
  }

  if (methods.whatsapp && donorPhone) {
    results.whatsapp = await sendWhatsAppMessage(donorPhone, message);
  }

  return results;
};

// Send event reminder
const sendEventReminder = async (event, user, methods = {}) => {
  const { email: sendEmail, sms: sendSMS, whatsapp: sendWhatsApp } = methods;
  
  const message = `
    📅 Event Reminder
    
    Event: ${event.heading}
    Date: ${new Date(event.date).toLocaleDateString()}
    Time: ${event.time}
    Location: ${event.location}
    
    See you there!
    Care Foundation Trust®️
  `;

  const results = {};

  if (sendEmail && user.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: `Event Reminder: ${event.heading}`,
        html: `
          <h2>Event Reminder</h2>
          <p><strong>Event:</strong> ${event.heading}</p>
          <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${event.time}</p>
          <p><strong>Location:</strong> ${event.location}</p>
        `
      });
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  if (sendSMS && user.phone) {
    results.sms = await sendSMS(user.phone, message);
  }

  if (sendWhatsApp && user.phone) {
    results.whatsapp = await sendWhatsAppMessage(user.phone, message);
  }

  return results;
};

module.exports = {
  sendWhatsAppMessage,
  sendSMS,
  sendCouponNotification,
  sendDonationConfirmation,
  sendDonationUpdate,
  sendDonationUtilizationUpdate,
  sendEventReminder
};

