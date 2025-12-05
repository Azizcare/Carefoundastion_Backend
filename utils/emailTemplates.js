/**
 * Email Templates for Care Foundation
 * HTML templates for various email notifications
 */

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Care Foundation</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .header img {
            max-width: 200px;
            height: auto;
        }
        .header h1 {
            color: #ffffff;
            margin: 15px 0 0 0;
            font-size: 24px;
        }
        .content {
            padding: 40px 30px;
            color: #333333;
            line-height: 1.6;
        }
        .content h2 {
            color: #10b981;
            margin-top: 0;
        }
        .button {
            display: inline-block;
            padding: 14px 30px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666666;
            border-top: 1px solid #eeeeee;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
        .info-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .details-table td {
            padding: 10px;
            border-bottom: 1px solid #eeeeee;
        }
        .details-table td:first-child {
            font-weight: bold;
            color: #666666;
            width: 40%;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>
`;

module.exports = {
  /**
   * Welcome Email Template
   */
  welcomeEmail: (user) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Welcome to Care Foundation!</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name}! 👋</h2>
            <p>Welcome to Care Foundation - India's most trusted crowdfunding platform!</p>
            <p>We're thrilled to have you as part of our community. Whether you're here to raise funds for a cause or support others, you're making a difference.</p>
            
            <div class="info-box">
                <strong>What you can do now:</strong>
                <ul>
                    <li>Browse and support active campaigns</li>
                    <li>Start your own fundraiser</li>
                    <li>Complete your profile and KYC verification</li>
                    <li>Refer friends and earn rewards</li>
                </ul>
            </div>

            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>

            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Together, we can make a difference!</p>
            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
            <p>
                <a href="${process.env.FRONTEND_URL}">Visit Website</a> | 
                <a href="${process.env.FRONTEND_URL}/contact">Contact Us</a> | 
                <a href="${process.env.FRONTEND_URL}/help">Help Center</a>
            </p>
        </div>
    </div>
  `),

  /**
   * Donation Receipt Email
   */
  donationReceiptEmail: (donation, user, campaign) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Thank You for Your Donation!</h1>
        </div>
        <div class="content">
            <h2>Dear ${user.name},</h2>
            <p>Thank you for your generous donation to <strong>${campaign.title}</strong>!</p>
            <p>Your support is making a real difference. Here are your donation details:</p>
            
            <table class="details-table">
                <tr>
                    <td>Receipt Number</td>
                    <td>${donation.receipt.receiptNumber}</td>
                </tr>
                <tr>
                    <td>Donation Amount</td>
                    <td><strong>₹${donation.amount.toLocaleString()}</strong></td>
                </tr>
                <tr>
                    <td>Campaign</td>
                    <td>${campaign.title}</td>
                </tr>
                <tr>
                    <td>Date</td>
                    <td>${new Date(donation.createdAt).toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td>Transaction ID</td>
                    <td>${donation.paymentDetails.transactionId}</td>
                </tr>
                <tr>
                    <td>Payment Method</td>
                    <td>${donation.paymentMethod.toUpperCase()}</td>
                </tr>
            </table>

            ${donation.taxBenefit?.isEligible ? `
            <div class="info-box">
                <strong>✓ Tax Benefit Available</strong><br>
                This donation is eligible for tax deduction under Section 80G of the Income Tax Act, 1961.
            </div>
            ` : ''}

            <a href="${process.env.FRONTEND_URL}/donations/${donation._id}/receipt?format=pdf" class="button">Download Receipt PDF</a>

            <p>Your kindness is creating positive change. Thank you for being part of our mission!</p>
            <p><strong>With Gratitude,</strong><br>Team Care Foundation</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
            <p>For any queries, contact us at <a href="mailto:support@carefoundation.org">support@carefoundation.org</a></p>
        </div>
    </div>
  `),

  /**
   * Campaign Approval Email
   */
  campaignApprovalEmail: (campaign, user) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Campaign Approved! 🎉</h1>
        </div>
        <div class="content">
            <h2>Congratulations ${user.name}!</h2>
            <p>Your campaign <strong>"${campaign.title}"</strong> has been approved and is now live!</p>
            
            <div class="info-box">
                <strong>Campaign Details:</strong>
                <table class="details-table">
                    <tr>
                        <td>Campaign Title</td>
                        <td>${campaign.title}</td>
                    </tr>
                    <tr>
                        <td>Goal Amount</td>
                        <td>₹${campaign.goalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Category</td>
                        <td>${campaign.category}</td>
                    </tr>
                    <tr>
                        <td>End Date</td>
                        <td>${new Date(campaign.timeline.endDate).toLocaleDateString()}</td>
                    </tr>
                </table>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Share your campaign on social media</li>
                <li>Send personalized messages to potential donors</li>
                <li>Post regular updates about your progress</li>
                <li>Thank your donors personally</li>
            </ul>

            <a href="${process.env.FRONTEND_URL}/campaigns/${campaign._id}" class="button">View Campaign</a>
            <a href="${process.env.FRONTEND_URL}/campaigns/${campaign._id}/share" class="button" style="background: #3b82f6;">Share Campaign</a>

            <p>We're here to support you every step of the way. Let's make this campaign a success!</p>
            <p><strong>Best wishes,</strong><br>Team Care Foundation</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
        </div>
    </div>
  `),

  /**
   * Campaign Rejection Email
   */
  campaignRejectionEmail: (campaign, user, reason) => baseTemplate(`
    <div class="email-container">
        <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <h1>Campaign Review Update</h1>
        </div>
        <div class="content">
            <h2>Dear ${user.name},</h2>
            <p>Thank you for submitting your campaign <strong>"${campaign.title}"</strong>.</p>
            <p>After careful review, we're unable to approve your campaign at this time.</p>
            
            <div class="warning-box">
                <strong>Reason:</strong><br>
                ${reason || 'Please review our campaign guidelines and make necessary changes.'}
            </div>

            <p><strong>What you can do:</strong></p>
            <ul>
                <li>Review our <a href="${process.env.FRONTEND_URL}/guidelines">campaign guidelines</a></li>
                <li>Make necessary changes to your campaign</li>
                <li>Resubmit your campaign for review</li>
            </ul>

            <a href="${process.env.FRONTEND_URL}/campaigns/${campaign._id}/edit" class="button">Edit Campaign</a>

            <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>
            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
            <p>Need help? <a href="mailto:support@carefoundation.org">Contact Support</a></p>
        </div>
    </div>
  `),

  /**
   * Withdrawal Approval Email
   */
  withdrawalApprovalEmail: (withdrawal, user, campaign) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Withdrawal Request Approved! ✓</h1>
        </div>
        <div class="content">
            <h2>Good News, ${user.name}!</h2>
            <p>Your withdrawal request has been approved and the amount will be transferred to your bank account within 3-5 business days.</p>
            
            <table class="details-table">
                <tr>
                    <td>Campaign</td>
                    <td>${campaign.title}</td>
                </tr>
                <tr>
                    <td>Withdrawal Amount</td>
                    <td><strong>₹${withdrawal.amount.toLocaleString()}</strong></td>
                </tr>
                <tr>
                    <td>Platform Fee (2%)</td>
                    <td>₹${withdrawal.fees.platformFee}</td>
                </tr>
                <tr>
                    <td>Processing Fee</td>
                    <td>₹${withdrawal.fees.processingFee}</td>
                </tr>
                <tr>
                    <td>TDS (1%)</td>
                    <td>₹${withdrawal.fees.tds}</td>
                </tr>
                <tr>
                    <td>Net Amount</td>
                    <td><strong style="color: #10b981;">₹${withdrawal.fees.netAmount.toLocaleString()}</strong></td>
                </tr>
                <tr>
                    <td>Account Number</td>
                    <td>xxxx ${withdrawal.accountDetails.accountNumber.slice(-4)}</td>
                </tr>
                <tr>
                    <td>IFSC Code</td>
                    <td>${withdrawal.accountDetails.ifscCode}</td>
                </tr>
            </table>

            <div class="info-box">
                <strong>Important:</strong>
                <ul>
                    <li>Funds will be credited within 3-5 business days</li>
                    <li>You'll receive an SMS notification once the transfer is completed</li>
                    <li>Keep your bank account active and ensure details are correct</li>
                </ul>
            </div>

            <a href="${process.env.FRONTEND_URL}/withdrawals" class="button">View Withdrawal Status</a>

            <p>Thank you for using Care Foundation. We're proud to support your fundraising journey!</p>
            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
        </div>
    </div>
  `),

  /**
   * KYC Verification Success Email
   */
  kycVerificationEmail: (user, document) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>KYC Verification Successful! ✓</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>Great news! Your KYC document has been verified successfully.</p>
            
            <div class="info-box">
                <strong>Verified Document:</strong><br>
                ${document.type.replace('_', ' ').toUpperCase()}<br>
                Document Number: ${document.number}
            </div>

            <p><strong>You can now:</strong></p>
            <ul>
                <li>Create unlimited campaigns</li>
                <li>Request withdrawals of funds raised</li>
                <li>Access premium features</li>
                <li>Receive tax benefit certificates</li>
            </ul>

            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>

            <p>Thank you for completing your KYC verification. We're excited to have you as a verified member!</p>
            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
        </div>
    </div>
  `),

  /**
   * Password Reset Email
   */
  passwordResetEmail: (user, resetToken) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>We received a request to reset your password for your Care Foundation account.</p>
            
            <div class="warning-box">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>

            <p>To reset your password, click the button below:</p>

            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" class="button">Reset Password</a>

            <p style="font-size: 12px; color: #666;">This link will expire in 1 hour for security reasons.</p>

            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">
                ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
            </p>

            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
            <p>For security questions, contact <a href="mailto:security@carefoundation.org">security@carefoundation.org</a></p>
        </div>
    </div>
  `),

  /**
   * Campaign Update Notification Email
   */
  campaignUpdateEmail: (donor, campaign, update) => baseTemplate(`
    <div class="email-container">
        <div class="header">
            <h1>Campaign Update</h1>
        </div>
        <div class="content">
            <h2>Hello ${donor.name},</h2>
            <p>There's a new update from <strong>${campaign.title}</strong> - a campaign you supported!</p>
            
            <div class="info-box">
                <strong>${update.title}</strong><br>
                <p style="margin-top: 10px;">${update.description}</p>
                ${update.date ? `<p style="font-size: 12px; color: #666; margin-top: 10px;">Posted on ${new Date(update.date).toLocaleDateString()}</p>` : ''}
            </div>

            <a href="${process.env.FRONTEND_URL}/campaigns/${campaign._id}" class="button">View Full Update</a>

            <p>Thank you for your continued support. Your contribution is making a real difference!</p>
            <p><strong>Team Care Foundation</strong></p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Care Foundation. All rights reserved.</p>
            <p><a href="${process.env.FRONTEND_URL}/preferences/notifications">Manage Email Preferences</a></p>
        </div>
    </div>
  `)
};













