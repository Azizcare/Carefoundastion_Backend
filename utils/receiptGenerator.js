const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReceiptGenerator {
  /**
   * Generate donation receipt PDF
   * @param {Object} donation - Donation object
   * @param {Object} user - User object
   * @param {Object} campaign - Campaign object
   * @returns {Promise<string>} - Path to generated PDF
   */
  static async generateDonationReceipt(donation, user, campaign) {
    return new Promise((resolve, reject) => {
      try {
        // Create receipts directory if it doesn't exist
        const receiptsDir = path.join(__dirname, '../uploads/receipts');
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const fileName = `receipt-${donation.receipt.receiptNumber}.pdf`;
        const filePath = path.join(receiptsDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('DONATION RECEIPT', { align: 'center' })
           .moveDown(0.5);

        // Organization Info
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Care Foundation', { align: 'center' })
           .font('Helvetica')
           .fontSize(10)
           .text('Registered Charity Organization', { align: 'center' })
           .text('Registration No: CF/2024/REG/001', { align: 'center' })
           .text('PAN: ABCDE1234F', { align: 'center' })
           .moveDown(1);

        // Receipt Details Box
        doc.rect(50, doc.y, 495, 1).fillAndStroke('#10b981');
        doc.moveDown(0.5);

        // Receipt Number and Date
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Receipt No: ${donation.receipt.receiptNumber}`, 50, doc.y)
           .text(`Date: ${new Date(donation.createdAt).toLocaleDateString()}`, 0, doc.y, { align: 'right' })
           .moveDown(1);

        // Donor Information
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Donor Information:', 50, doc.y)
           .moveDown(0.3);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Name: ${donation.isAnonymous ? 'Anonymous Donor' : (user?.name || 'N/A')}`, 50, doc.y);
        
        if (!donation.isAnonymous) {
          doc.text(`Email: ${user?.email || 'N/A'}`, 50, doc.y)
             .text(`Phone: ${user?.phone || 'N/A'}`, 50, doc.y);
        }
        
        doc.moveDown(1);

        // Campaign Information
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Campaign Details:', 50, doc.y)
           .moveDown(0.3);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Campaign: ${campaign?.title || 'N/A'}`, 50, doc.y)
           .text(`Category: ${campaign?.category || 'N/A'}`, 50, doc.y)
           .moveDown(1);

        // Donation Amount Section
        doc.rect(50, doc.y, 495, 80).fillAndStroke('#f0fdf4', '#10b981');
        const amountBoxY = doc.y + 10;

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000')
           .text('Donation Amount:', 60, amountBoxY + 10)
           .fontSize(24)
           .text(`₹${donation.amount.toLocaleString()}`, 60, amountBoxY + 30, { width: 475 });

        // Amount in Words
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .text(`(${this.numberToWords(donation.amount)} Rupees Only)`, 60, amountBoxY + 60);

        doc.y = amountBoxY + 90;
        doc.moveDown(1);

        // Payment Details
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000')
           .text('Payment Information:', 50, doc.y)
           .moveDown(0.3);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Payment Method: ${donation.paymentMethod?.toUpperCase() || 'N/A'}`, 50, doc.y)
           .text(`Transaction ID: ${donation.paymentDetails?.transactionId || 'N/A'}`, 50, doc.y)
           .text(`Payment Status: ${donation.status?.toUpperCase()}`, 50, doc.y)
           .moveDown(1);

        // Tax Benefit Information
        if (donation.taxBenefit?.isEligible) {
          doc.rect(50, doc.y, 495, 1).fillAndStroke('#10b981');
          doc.moveDown(0.5);

          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor('#047857')
             .text('✓ Eligible for Tax Benefit under Section 80G', 50, doc.y)
             .fontSize(9)
             .font('Helvetica')
             .fillColor('#000')
             .text('This donation is eligible for tax deduction under Section 80G of the Income Tax Act, 1961.', 50, doc.y)
             .moveDown(1);
        }

        // Footer - Terms and Signature
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666')
           .text('This is a computer-generated receipt and does not require a signature.', 50, 700, { align: 'center' })
           .text('For any queries, please contact us at support@carefoundation.org', 50, 710, { align: 'center' })
           .moveDown(0.5);

        // Signature
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#000')
           .text('Authorized Signatory', 400, 680, { align: 'right' })
           .text('Care Foundation', 400, 690, { align: 'right' });

        // Bottom Border
        doc.rect(50, 730, 495, 1).fillAndStroke('#10b981');

        // QR Code placeholder (optional - can add QR code library later)
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666')
           .text(`Receipt generated on: ${new Date().toLocaleString()}`, 50, 740);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert number to words
   * @param {number} num - Number to convert
   * @returns {string} - Number in words
   */
  static numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    let words = '';

    // Crores
    if (num >= 10000000) {
      words += this.numberToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }

    // Lakhs
    if (num >= 100000) {
      words += this.numberToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }

    // Thousands
    if (num >= 1000) {
      words += this.numberToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }

    // Hundreds
    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    // Tens and Ones
    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      words += teens[num - 10] + ' ';
      num = 0;
    }

    if (num > 0) {
      words += ones[num] + ' ';
    }

    return words.trim();
  }

  /**
   * Generate Tax Certificate PDF
   * @param {Object} donation - Donation object
   * @param {Object} user - User object
   * @param {Object} campaign - Campaign object
   * @returns {Promise<string>} - Path to generated PDF
   */
  static async generateTaxCertificate(donation, user, campaign) {
    return new Promise((resolve, reject) => {
      try {
        const receiptsDir = path.join(__dirname, '../uploads/receipts');
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const fileName = `tax-certificate-${donation.receipt.receiptNumber}.pdf`;
        const filePath = path.join(receiptsDir, fileName);

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('TAX EXEMPTION CERTIFICATE', { align: 'center' })
           .fontSize(12)
           .text('Under Section 80G of the Income Tax Act, 1961', { align: 'center' })
           .moveDown(2);

        // Certificate Content
        doc.fontSize(11)
           .font('Helvetica')
           .text(`This is to certify that ${user?.name || 'the donor'} has made a donation of ₹${donation.amount.toLocaleString()} to Care Foundation on ${new Date(donation.createdAt).toLocaleDateString()}.`, { align: 'justify' })
           .moveDown(1)
           .text('Care Foundation is registered under Section 80G of the Income Tax Act, 1961, and donations made to the organization are eligible for tax deduction.', { align: 'justify' })
           .moveDown(1);

        // Details
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Receipt Number: ${donation.receipt.receiptNumber}`)
           .text(`PAN of Donor: ${user?.panNumber || 'Not Provided'}`)
           .text(`Registration Number: CF/2024/REG/001`)
           .text(`Valid from: ${new Date().getFullYear()}-${(new Date().getFullYear() + 1)}`)
           .moveDown(2);

        // Signature
        doc.font('Helvetica-Bold')
           .text('Authorized Signatory', 400, doc.y, { align: 'right' })
           .text('Care Foundation', 400, doc.y + 15, { align: 'right' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReceiptGenerator;













