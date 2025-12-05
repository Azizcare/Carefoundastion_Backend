const nodemailer = require('nodemailer');
const htmlEmailTemplates = require('./emailTemplates');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates (keeping backwards compatibility)
const emailTemplates = {
  emailVerification: (data) => ({
    subject: 'Verify Your Email - Care Foundation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Care Foundation!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name}!</h2>
            <p>Thank you for registering with Care Foundation. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${data.verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Care Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset - Care Foundation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name}!</h2>
            <p>We received a request to reset your password. Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${data.resetUrl}</p>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Care Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  donationReceipt: (data) => ({
    subject: 'Donation Receipt - Care Foundation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donation Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .receipt { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Donation!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.donorName}!</h2>
            <p>Thank you for your generous donation to "${data.campaignTitle}". Your contribution makes a real difference!</p>
            <div class="receipt">
              <h3>Donation Receipt</h3>
              <p><strong>Receipt Number:</strong> ${data.receiptNumber}</p>
              <p><strong>Amount:</strong> ₹${data.amount}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Campaign:</strong> ${data.campaignTitle}</p>
              <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            </div>
            <p>You can download your receipt from your dashboard or use this receipt for tax purposes.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Care Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  campaignUpdate: (data) => ({
    subject: 'Campaign Update - Care Foundation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Campaign Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Campaign Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.donorName}!</h2>
            <p>There's an update on the campaign you supported: "${data.campaignTitle}"</p>
            <h3>${data.updateTitle}</h3>
            <p>${data.updateDescription}</p>
            <a href="${data.campaignUrl}" class="button">View Campaign</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 Care Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async ({ email, to, subject, template, data, html, text }) => {
  try {
    // Support both 'email' and 'to' parameters for recipient
    const recipientEmail = email || to;
    
    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Email configuration not set, skipping email send');
      console.log('📧 Would send email to:', recipientEmail, 'with subject:', subject);
      return { messageId: 'mock-email-id', accepted: [recipientEmail] };
    }

    const transporter = createTransporter();
    
    let emailSubject = subject;
    let emailHtml = html;
    let emailText = text;

    // If template is provided, use template-based email
    if (template) {
      const emailTemplate = emailTemplates[template];
      if (!emailTemplate) {
        throw new Error(`Email template '${template}' not found`);
      }
      const emailContent = emailTemplate(data);
      emailSubject = subject || emailContent.subject;
      emailHtml = emailContent.html;
    }

    // If no subject provided and no template, use default
    if (!emailSubject) {
      emailSubject = 'Care Foundation Trust';
    }

    const mailOptions = {
      from: `"Care Foundation" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: emailSubject
    };

    if (emailHtml) {
      mailOptions.html = emailHtml;
    }
    if (emailText) {
      mailOptions.text = emailText;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw error for email failures in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email sending failed in development mode, continuing...');
      return { messageId: 'mock-email-id', accepted: [email || to] };
    }
    throw error;
  }
};

// Send bulk emails
const sendBulkEmails = async (emails) => {
  const results = [];
  
  for (const emailData of emails) {
    try {
      const result = await sendEmail(emailData);
      results.push({ success: true, email: emailData.email, messageId: result.messageId });
    } catch (error) {
      results.push({ success: false, email: emailData.email, error: error.message });
    }
  }
  
  return results;
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  testEmailConfig,
  emailTemplates
};
