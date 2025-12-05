const Donation = require('../models/Donation');
const Coupon = require('../models/Coupon');
const Beneficiary = require('../models/Beneficiary');
const Campaign = require('../models/Campaign');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Download donations report
// @route   GET /api/reports/donations
// @access  Private/Admin
exports.downloadDonationsReport = async (req, res) => {
  try {
    const { format = 'excel', startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const donations = await Donation.find(query)
      .populate('donor', 'name email phone')
      .populate('campaign', 'title')
      .populate('beneficiary', 'name category')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Donations');

      // Headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Donor Name', key: 'donorName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Campaign', key: 'campaign', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Beneficiary', key: 'beneficiary', width: 25 },
        { header: 'Transaction ID', key: 'transactionId', width: 25 }
      ];

      // Data
      donations.forEach(donation => {
        worksheet.addRow({
          date: new Date(donation.createdAt).toLocaleDateString(),
          donorName: donation.donor?.name || 'Anonymous',
          email: donation.donor?.email || '',
          phone: donation.donor?.phone || '',
          campaign: donation.campaign?.title || 'General',
          amount: donation.amount,
          status: donation.status,
          beneficiary: donation.beneficiary?.name || 'Not Assigned',
          transactionId: donation.paymentDetails?.transactionId || ''
        });
      });

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=donations-report.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      // PDF format
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=donations-report.pdf');
      
      doc.pipe(res);
      
      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('DONATIONS REPORT', { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Care Foundation Trust®`, { align: 'center' })
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
         .moveDown(1);
      
      // Summary
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Summary', { underline: true })
         .moveDown(0.3);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(`Total Donations: ${donations.length}`)
         .text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`)
         .moveDown(1);
      
      // Table Header
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Date', 50, doc.y)
         .text('Donor', 120, doc.y)
         .text('Campaign', 250, doc.y)
         .text('Amount', 400, doc.y)
         .text('Status', 480, doc.y);
      
      doc.moveTo(50, doc.y + 5)
         .lineTo(550, doc.y + 5)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Table Data
      let yPosition = doc.y;
      donations.forEach((donation, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          // Repeat header on new page
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .text('Date', 50, yPosition)
             .text('Donor', 120, yPosition)
             .text('Campaign', 250, yPosition)
             .text('Amount', 400, yPosition)
             .text('Status', 480, yPosition);
          
          doc.moveTo(50, yPosition + 5)
             .lineTo(550, yPosition + 5)
             .stroke();
          
          yPosition += 20;
        }
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(new Date(donation.createdAt).toLocaleDateString(), 50, yPosition)
           .text(donation.donor?.name || 'Anonymous', 120, yPosition, { width: 120 })
           .text(donation.campaign?.title || 'General', 250, yPosition, { width: 140 })
           .text(`₹${donation.amount.toLocaleString('en-IN')}`, 400, yPosition)
           .text(donation.status, 480, yPosition);
        
        yPosition += 15;
      });
      
      doc.end();
    } else {
      // JSON format
      res.json({
        success: true,
        data: donations,
        count: donations.length
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download coupons report
// @route   GET /api/reports/coupons
// @access  Private/Admin
exports.downloadCouponsReport = async (req, res) => {
  try {
    const { format = 'excel', startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const coupons = await Coupon.find(query)
      .populate('issuer', 'name email')
      .populate('partner', 'name')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Coupons');

      worksheet.columns = [
        { header: 'Code', key: 'code', width: 20 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Value', key: 'value', width: 15 },
        { header: 'Issued By', key: 'issuer', width: 25 },
        { header: 'Partner', key: 'partner', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Used', key: 'used', width: 10 },
        { header: 'Max Uses', key: 'maxUses', width: 12 },
        { header: 'Valid Until', key: 'validUntil', width: 15 }
      ];

      coupons.forEach(coupon => {
        worksheet.addRow({
          code: coupon.code,
          title: coupon.title,
          category: coupon.category,
          value: coupon.value?.amount || coupon.value?.percentage + '%',
          issuer: coupon.issuer?.name || '',
          partner: coupon.partner?.name || '',
          status: coupon.status,
          used: coupon.usage?.usedCount || 0,
          maxUses: coupon.usage?.maxUses || 'Unlimited',
          validUntil: new Date(coupon.validity?.endDate).toLocaleDateString()
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=coupons-report.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      // PDF format
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=coupons-report.pdf');
      
      doc.pipe(res);
      
      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('COUPONS REPORT', { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Care Foundation Trust®`, { align: 'center' })
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
         .moveDown(1);
      
      // Summary
      const totalUsed = coupons.reduce((sum, c) => sum + (c.usage?.usedCount || 0), 0);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Summary', { underline: true })
         .moveDown(0.3);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(`Total Coupons: ${coupons.length}`)
         .text(`Total Used: ${totalUsed}`)
         .moveDown(1);
      
      // Table Header
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Code', 50, doc.y)
         .text('Title', 130, doc.y)
         .text('Category', 280, doc.y)
         .text('Value', 380, doc.y)
         .text('Status', 450, doc.y);
      
      doc.moveTo(50, doc.y + 5)
         .lineTo(550, doc.y + 5)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Table Data
      let yPosition = doc.y;
      coupons.forEach((coupon) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .text('Code', 50, yPosition)
             .text('Title', 130, yPosition)
             .text('Category', 280, yPosition)
             .text('Value', 380, yPosition)
             .text('Status', 450, yPosition);
          
          doc.moveTo(50, yPosition + 5)
             .lineTo(550, yPosition + 5)
             .stroke();
          
          yPosition += 20;
        }
        
        const value = coupon.value?.amount ? `₹${coupon.value.amount}` : `${coupon.value?.percentage}%`;
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(coupon.code, 50, yPosition)
           .text(coupon.title || 'N/A', 130, yPosition, { width: 140 })
           .text(coupon.category, 280, yPosition, { width: 90 })
           .text(value, 380, yPosition)
           .text(coupon.status, 450, yPosition);
        
        yPosition += 15;
      });
      
      doc.end();
    } else {
      res.json({
        success: true,
        data: coupons,
        count: coupons.length
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download beneficiaries report
// @route   GET /api/reports/beneficiaries
// @access  Private/Admin
exports.downloadBeneficiariesReport = async (req, res) => {
  try {
    const { format = 'excel' } = req.query;

    const beneficiaries = await Beneficiary.find({})
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Beneficiaries');

      worksheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Assigned Amount', key: 'assignedAmount', width: 15 },
        { header: 'Received Amount', key: 'receivedAmount', width: 15 },
        { header: 'Created By', key: 'createdBy', width: 25 },
        { header: 'Created Date', key: 'createdDate', width: 15 }
      ];

      beneficiaries.forEach(beneficiary => {
        worksheet.addRow({
          name: beneficiary.name,
          phone: beneficiary.phone || '',
          email: beneficiary.email || '',
          category: beneficiary.category,
          status: beneficiary.status,
          assignedAmount: beneficiary.assignedAmount || 0,
          receivedAmount: beneficiary.receivedAmount || 0,
          createdBy: beneficiary.createdBy?.name || '',
          createdDate: new Date(beneficiary.createdAt).toLocaleDateString()
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficiaries-report.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({
        success: true,
        data: beneficiaries,
        count: beneficiaries.length
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

