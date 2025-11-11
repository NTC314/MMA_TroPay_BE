const logger = require('../utils/logger');

/**
 * Mock MoMo Service - For testing when MoMo UAT is down
 * Simulates MoMo API responses without calling real API
 */
class MoMoServiceMock {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    this.returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:5000/api/momo/callback';
    this.notifyUrl = process.env.MOMO_NOTIFY_URL || 'http://localhost:5000/api/momo/notify';
    
    // Extract base URL for mock payment page (remove /api/momo/callback)
    this.baseUrl = this.returnUrl.split('/api/')[0];
    
    logger.info('🧪 Mock MoMo Service initialized (UAT is down, using mock)', {
      baseUrl: this.baseUrl
    });
  }

  /**
   * Mock create payment - Returns fake success response
   */
  async createPayment(params) {
    try {
      const {
        orderId,
        amount,
        orderInfo,
        requestId,
        extraData = '',
        autoCapture = true,
        lang = 'vi'
      } = params;

      logger.info('🧪 Mock: Creating MoMo payment', {
        orderId,
        amount,
        requestId
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock response
      const mockResponse = {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: requestId,
        amount: amount,
        responseTime: Date.now(),
        message: 'Mock: Successful',
        resultCode: 0,
        payUrl: `${this.baseUrl}/mock-momo-payment.html?orderId=${encodeURIComponent(orderId)}&requestId=${encodeURIComponent(requestId)}&amount=${amount}`,
        deeplink: `momo://payment?orderId=${encodeURIComponent(orderId)}&requestId=${encodeURIComponent(requestId)}&amount=${amount}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MOCK_${orderId}`,
        deeplinkMiniApp: `momo://app?orderId=${encodeURIComponent(orderId)}`
      };

      logger.info('✅ Mock MoMo payment created successfully', {
        orderId,
        payUrl: mockResponse.payUrl
      });

      return mockResponse;
    } catch (error) {
      logger.error('❌ Mock MoMo create payment error:', error);
      throw error;
    }
  }

  /**
   * Mock verify signature - Always returns true in mock mode
   */
  verifySignature(data) {
    logger.info('🧪 Mock: Signature verification (always true)');
    return true;
  }

  /**
   * Mock query transaction
   */
  async queryTransaction(params) {
    try {
      const { orderId, requestId } = params;
      
      logger.info('🧪 Mock: Querying transaction', { orderId, requestId });

      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: requestId,
        amount: 10000,
        transId: `MOCK_${Date.now()}`,
        resultCode: 0,
        message: 'Mock: Transaction successful',
        responseTime: Date.now()
      };
    } catch (error) {
      logger.error('❌ Mock query transaction error:', error);
      throw error;
    }
  }

  /**
   * Mock refund transaction
   */
  async refund(params) {
    try {
      const { orderId, requestId, amount, transId, description } = params;
      
      logger.info('🧪 Mock: Refunding transaction', {
        orderId,
        amount,
        transId
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: requestId,
        amount: amount,
        transId: `REFUND_MOCK_${Date.now()}`,
        resultCode: 0,
        message: 'Mock: Refund successful',
        responseTime: Date.now()
      };
    } catch (error) {
      logger.error('❌ Mock refund error:', error);
      throw error;
    }
  }

  /**
   * Create signature (mock - returns dummy signature)
   */
  createSignature(data) {
    return 'mock_signature_' + Date.now();
  }
}

module.exports = new MoMoServiceMock();
