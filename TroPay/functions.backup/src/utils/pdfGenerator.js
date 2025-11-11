const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF
 * @param {Object} invoice - Invoice data with populated fields
 * @param {String} outputPath - Path to save PDF file
 * @returns {Promise<String>} - Path to generated PDF
 */
const generateInvoicePDF = (invoice, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('HÓA ĐƠN THANH TOÁN', { align: 'center' })
         .moveDown();

      // Invoice Info
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Mã hóa đơn: ${invoice._id}`, 50, 120)
         .text(`Ngày tạo: ${new Date(invoice.issue_date).toLocaleDateString('vi-VN')}`)
         .text(`Hạn thanh toán: ${new Date(invoice.due_date).toLocaleDateString('vi-VN')}`)
         .text(`Trạng thái: ${getStatusText(invoice.status)}`)
         .moveDown();

      // Room & Tenant Info
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Thông tin phòng:', 50, 200)
         .fontSize(12)
         .font('Helvetica');

      if (invoice.room_id) {
        doc.text(`Mã phòng: ${invoice.room_id.code || 'N/A'}`, 50, 220)
           .text(`Địa chỉ: ${invoice.room_id.address || 'N/A'}`);
      }

      if (invoice.tenant_id) {
        doc.text(`Người thuê: ${invoice.tenant_id.full_name || 'N/A'}`)
           .text(`SĐT: ${invoice.tenant_id.phone || 'N/A'}`);
      }

      doc.moveDown(2);

      // Invoice Items Table
      const tableTop = 310;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const priceX = 420;
      const amountX = 500;

      // Table Header
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Dịch vụ', itemCodeX, tableTop)
         .text('Mô tả', descriptionX, tableTop)
         .text('SL', quantityX, tableTop)
         .text('Đơn giá', priceX, tableTop)
         .text('Thành tiền', amountX, tableTop);

      // Line under header
      doc.moveTo(itemCodeX, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .stroke();

      // Table Items
      let yPosition = tableTop + 30;
      doc.font('Helvetica').fontSize(10);

      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item) => {
          const description = getItemDescription(item);
          const quantity = item.quantity || 1;
          const unitPrice = item.unit_price || 0;
          const amount = item.amount || (quantity * unitPrice);

          doc.text(item.service_type || 'N/A', itemCodeX, yPosition, { width: 90 })
             .text(description, descriptionX, yPosition, { width: 190 })
             .text(quantity.toString(), quantityX, yPosition)
             .text(formatCurrency(unitPrice), priceX, yPosition)
             .text(formatCurrency(amount), amountX, yPosition);

          yPosition += 25;
        });
      }

      // Total Section
      yPosition += 20;
      doc.moveTo(itemCodeX, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 15;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Tổng cộng:', priceX - 50, yPosition)
         .text(formatCurrency(invoice.total_amount), amountX, yPosition);

      // Payment Info
      if (invoice.status === 'paid' && invoice.paid_date) {
        yPosition += 40;
        doc.fontSize(11)
           .font('Helvetica')
           .text(`Đã thanh toán ngày: ${new Date(invoice.paid_date).toLocaleDateString('vi-VN')}`, 50, yPosition);
        
        if (invoice.payment_method) {
          yPosition += 20;
          doc.text(`Phương thức: ${getPaymentMethodText(invoice.payment_method)}`, 50, yPosition);
        }
      }

      // Footer
      doc.fontSize(10)
         .font('Helvetica')
         .text('Cảm ơn quý khách đã sử dụng dịch vụ!', 50, 700, {
           align: 'center',
           width: 500
         })
         .text('TroPay - Hệ thống quản lý nhà trọ', {
           align: 'center'
         });

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
};

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Chờ thanh toán',
    'paid': 'Đã thanh toán',
    'overdue': 'Quá hạn',
    'cancelled': 'Đã hủy'
  };
  return statusMap[status] || status;
};

const getPaymentMethodText = (method) => {
  const methodMap = {
    'cash': 'Tiền mặt',
    'bank_transfer': 'Chuyển khoản',
    'vnpay': 'VNPay',
    'momo': 'MoMo'
  };
  return methodMap[method] || method;
};

const getItemDescription = (item) => {
  if (item.description) return item.description;
  
  const parts = [];
  if (item.previous_reading !== undefined && item.current_reading !== undefined) {
    parts.push(`${item.previous_reading} → ${item.current_reading}`);
  }
  if (item.quantity) {
    parts.push(`${item.quantity} ${item.unit || ''}`);
  }
  
  return parts.join(' | ') || 'N/A';
};

module.exports = {
  generateInvoicePDF
};
