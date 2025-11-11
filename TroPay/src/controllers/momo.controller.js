const momoService = require('../services/momoService');
const { Invoice, Payment, Contract } = require('../models');
const logger = require('../utils/logger');
const { notifyPaymentReceived, notifyPaymentConfirmed } = require('../services/notificationService');

/**
 * @desc    Create MoMo payment
 * @route   POST /api/momo/create-payment
 * @access  Private (Tenant)
 */
const createPayment = async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;
    const userId = req.user.id;

    logger.info('MoMo Create Payment Request', { invoiceId, amount, userId });

    // Validate input
    if (!invoiceId || !amount) {
      logger.warn('Missing invoiceId or amount in payment request');
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin invoice hoặc số tiền'
      });
    }

    // Find invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('room_id', 'owner_id code')
      .populate('contract_id', 'tenant_id');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }

    // Check if invoice belongs to user
    if (invoice.contract_id?.tenant_id?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thanh toán hóa đơn này'
      });
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Hóa đơn đã được thanh toán'
      });
    }

    // Generate unique IDs
    const orderId = `INV_${invoiceId}_${Date.now()}`;
    const requestId = `REQ_${Date.now()}`;

    // Create payment request to MoMo
    const momoResponse = await momoService.createPayment({
      orderId: orderId,
      amount: amount,
      orderInfo: `Thanh toán hóa đơn phòng ${invoice.room_id?.code || 'N/A'}`,
      requestId: requestId,
      extraData: JSON.stringify({
        invoiceId: invoiceId,
        userId: userId
      })
    });

    // Check MoMo response
    if (momoResponse.resultCode !== 0) {
      logger.error('MoMo create payment failed', {
        resultCode: momoResponse.resultCode,
        message: momoResponse.message
      });

      return res.status(400).json({
        success: false,
        message: momoService.getResultCodeDescription(momoResponse.resultCode),
        error: momoResponse.message
      });
    }

    // Save payment record with pending status
    const payment = new Payment({
      invoice_id: invoiceId,
      amount: amount,
      payment_method: 'momo',
      status: 'pending',
      transaction_id: requestId,
      meta: {
        momo_order_id: orderId,
        momo_request_id: requestId,
        momo_pay_url: momoResponse.payUrl
      }
    });

    await payment.save();

    logger.info('MoMo payment created successfully', {
      invoiceId,
      orderId,
      requestId
    });

    // Return payment URL
    res.json({
      success: true,
      message: 'Tạo yêu cầu thanh toán MoMo thành công',
      data: {
        paymentId: payment._id,
        payUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl,
        orderId: orderId,
        requestId: requestId
      }
    });

  } catch (error) {
    logger.error('Create MoMo payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thanh toán MoMo',
      error: error.message
    });
  }
};

/**
 * @desc    Handle MoMo callback (both GET return and POST IPN)
 * @route   GET/POST /api/momo/callback
 * @access  Public
 */
const handleCallback = async (req, res) => {
  // Determine if this is a GET (return) or POST (IPN) request
  const isGet = req.method === 'GET';
  const callbackData = isGet ? req.query : req.body;
  
  logger.info(`MoMo ${isGet ? 'return' : 'IPN'} callback received`, {
    method: req.method,
    orderId: callbackData.orderId,
    requestId: callbackData.requestId,
    resultCode: callbackData.resultCode
  });

  // Log full callback data for debugging
  logger.info('MoMo Callback Data:', JSON.stringify(callbackData, null, 2));

  try {
    // Verify signature
    const isValidSignature = momoService.verifySignature(callbackData);

    if (!isValidSignature) {
      logger.error('MoMo callback signature invalid');
      
      if (isGet) {
        // For GET (return), redirect to app with error
        return res.redirect(`tropay://momo-return?resultCode=4001&message=${encodeURIComponent('Invalid signature')}`);
      } else {
        // For POST (IPN), return error response
        return res.status(400).json({
          resultCode: 97,
          message: 'Invalid signature'
        });
      }
    }

    // Find payment record
    const payment = await Payment.findOne({
      'meta.momo_request_id': callbackData.requestId
    }).populate('invoice_id');

    if (!payment) {
      logger.error('Payment record not found', { requestId: callbackData.requestId });
      
      if (isGet) {
        return res.redirect(`tropay://momo-return?resultCode=3002&message=${encodeURIComponent('Payment not found')}&orderId=${callbackData.orderId}&requestId=${callbackData.requestId}`);
      } else {
        return res.status(404).json({
          resultCode: 98,
          message: 'Payment not found'
        });
      }
    }

    // Parse extra data
    let parsedExtraData = {};
    try {
      if (callbackData.extraData) {
        parsedExtraData = JSON.parse(Buffer.from(callbackData.extraData, 'base64').toString('utf-8'));
        logger.info('Successfully parsed MoMo extraData', parsedExtraData);
      }
    } catch (e) {
      logger.warn('Failed to parse MoMo extraData', { error: e.message });
    }

    // Update payment with MoMo response
    payment.meta.momo_trans_id = callbackData.transId;
    payment.meta.momo_result_code = callbackData.resultCode;
    payment.meta.momo_message = callbackData.message;
    payment.meta.momo_pay_type = callbackData.payType;
    payment.meta.momo_response_time = callbackData.responseTime;

    // Check result code
    if (callbackData.resultCode == 0 || callbackData.resultCode == 9000) {
      // Payment successful
      payment.status = 'completed';
      payment.paid_at = new Date();
      await payment.save();

      // Update invoice status
      const invoice = payment.invoice_id;
      if (invoice && invoice.status !== 'paid') {
        invoice.status = 'paid';
        invoice.paid_at = new Date();
        await invoice.save();
      }

      // Send notifications
      try {
        const fullInvoice = await Invoice.findById(invoice._id)
          .populate('room_id', 'owner_id')
          .populate('contract_id', 'tenant_id');
        
        const tenantId = parsedExtraData.userId || fullInvoice.contract_id?.tenant_id?.toString();
        if (tenantId) {
          await notifyPaymentConfirmed(payment, invoice, tenantId);
        }

        if (fullInvoice.room_id?.owner_id) {
          await notifyPaymentReceived(payment, invoice, fullInvoice.room_id.owner_id);
        }
      } catch (notifError) {
        logger.error('Error sending payment notifications:', notifError);
      }

      // Emit Socket.IO event to notify clients about payment success
      try {
        const io = req.app.get('io');
        if (io) {
          const fullInvoice = await Invoice.findById(invoice._id)
            .populate('room_id', 'owner_id')
            .populate('contract_id', 'tenant_id');
          
          const tenantId = parsedExtraData.userId || fullInvoice.contract_id?.tenant_id?.toString();
          const ownerId = fullInvoice.room_id?.owner_id?.toString();
          
          // Emit to tenant
          if (tenantId) {
            io.to(`user_${tenantId}`).emit('payment-success', {
              invoiceId: invoice._id,
              paymentId: payment._id,
              amount: payment.amount,
              orderId: callbackData.orderId,
              transId: callbackData.transId
            });
            logger.info(`Emitted payment-success to tenant ${tenantId}`);
          }
          
          // Emit to owner
          if (ownerId) {
            io.to(`user_${ownerId}`).emit('payment-received', {
              invoiceId: invoice._id,
              paymentId: payment._id,
              amount: payment.amount,
              orderId: callbackData.orderId,
              transId: callbackData.transId
            });
            logger.info(`Emitted payment-received to owner ${ownerId}`);
          }
        }
      } catch (socketError) {
        logger.error('Error emitting socket event:', socketError);
      }

      logger.info('MoMo payment successful', {
        orderId: callbackData.orderId,
        transId: callbackData.transId,
        invoiceId: invoice._id
      });

      if (isGet) {
        // Redirect to HTML page that will auto-trigger deep link
        const redirectUrl = `/momo-return.html?resultCode=0&orderId=${encodeURIComponent(callbackData.orderId)}&requestId=${encodeURIComponent(callbackData.requestId)}&transId=${encodeURIComponent(callbackData.transId)}&message=${encodeURIComponent('Payment successful')}`;
        return res.redirect(redirectUrl);
      } else {
        // Return success response for IPN
        return res.status(200).json({
          resultCode: 0,
          message: 'Success'
        });
      }
    } else {
      // Payment failed
      payment.status = 'failed';
      await payment.save();

      logger.warn('MoMo payment failed', {
        orderId: callbackData.orderId,
        resultCode: callbackData.resultCode,
        message: callbackData.message
      });

      if (isGet) {
        const redirectUrl = `/momo-return.html?resultCode=${callbackData.resultCode}&orderId=${encodeURIComponent(callbackData.orderId)}&requestId=${encodeURIComponent(callbackData.requestId)}&message=${encodeURIComponent(callbackData.message || 'Payment failed')}`;
        return res.redirect(redirectUrl);
      } else {
        return res.status(200).json({
          resultCode: 0,
          message: 'Success'
        });
      }
    }

  } catch (error) {
    logger.error('MoMo callback handler error:', error);
    
    if (isGet) {
      const redirectUrl = `/momo-return.html?resultCode=3001&message=${encodeURIComponent('System error')}`;
      return res.redirect(redirectUrl);
    } else {
      return res.status(500).json({
        resultCode: 99,
        message: 'System error'
      });
    }
  }
};

/**
 * @desc    Check payment status from database
 * @route   GET /api/momo/check-status/:orderId
 * @access  Public
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu orderId'
      });
    }

    // Find payment by orderId
    const payment = await Payment.findOne({
      'meta.momo_order_id': orderId
    }).populate('invoice_id');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy payment',
        data: {
          status: 'not_found'
        }
      });
    }

    // Return payment status
    res.json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        status: payment.status, // pending, completed, failed
        orderId: payment.meta.momo_order_id,
        requestId: payment.meta.momo_request_id,
        transId: payment.meta.momo_trans_id,
        amount: payment.amount,
        resultCode: payment.meta.momo_result_code,
        message: payment.meta.momo_message,
        paidAt: payment.paid_at
      }
    });

  } catch (error) {
    logger.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trạng thái thanh toán',
      error: error.message
    });
  }
};

/**
 * @desc    Query MoMo transaction status
 * @route   POST /api/momo/query
 * @access  Private
 */
const queryTransaction = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin orderId'
      });
    }

    logger.info('MoMo Query Transaction Request', { orderId });

    // Query from MoMo
    const requestId = `QUERY_${Date.now()}`;
    const queryResult = await momoService.queryTransaction(orderId, requestId);

    return res.status(200).json({
      success: true,
      data: queryResult
    });
  } catch (error) {
    logger.error('MoMo Query Transaction Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi truy vấn giao dịch MoMo',
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  handleCallback,
  checkPaymentStatus,
  queryTransaction
};
