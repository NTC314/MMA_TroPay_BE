const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * MoMo Payment Service
 * Implements MoMo Payment Gateway integration
 * Documentation: https://developers.momo.vn
 */

class MoMoService {
  constructor() {
    // Check if mock mode is enabled
    this.mockMode = process.env.MOMO_MOCK_MODE === 'true';
    
    if (this.mockMode) {
      logger.warn('🧪 MoMo MOCK MODE ENABLED - Using mock service for testing');
      // Load mock service
      const mockService = require('./momoService.mock');
      return mockService;
    }
    
    // MoMo Configuration - Support multiple environments
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMOXXXX2020';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    
    // Environment selection: sandbox, uat, or production
    const env = (process.env.MOMO_ENV || 'sandbox').toLowerCase();
    
    // Set endpoint based on environment
    if (env === 'uat') {
      this.endpoint = process.env.MOMO_ENDPOINT_UAT || 'https://uat-payment.momo.vn';
    } else if (env === 'production' || env === 'prod') {
      this.endpoint = process.env.MOMO_ENDPOINT_PRODUCTION || 'https://payment.momo.vn';
    } else {
      // Default to sandbox
      this.endpoint = process.env.MOMO_ENDPOINT_SANDBOX || 'https://test-payment.momo.vn';
    }
    
    // Base URLs for return and notify
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    this.returnUrl = process.env.MOMO_RETURN_URL || `${baseUrl}/api/momo/callback`;
    this.notifyUrl = process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/momo/callback`;
    
    logger.info('MoMo Service initialized', {
      environment: env,
      partnerCode: this.partnerCode,
      endpoint: this.endpoint,
      returnUrl: this.returnUrl,
      notifyUrl: this.notifyUrl
    });
  }

  /**
   * Create signature for MoMo request
   * @param {string} rawData - Raw data string to sign
   * @returns {string} HMAC SHA256 signature
   */
  createSignature(rawData) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawData)
      .digest('hex');
  }

  /**
   * Create payment request to MoMo
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} MoMo payment response
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

      // Validate required parameters
      if (!orderId || !amount || !orderInfo || !requestId) {
        throw new Error('Missing required parameters');
      }

      // Request type
      const requestType = 'captureWallet'; // or 'payWithATM' for ATM cards

      // Create raw signature data
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.returnUrl}&requestId=${requestId}&requestType=${requestType}`;

      // Generate signature
      const signature = this.createSignature(rawSignature);

      // Build request body
      const requestBody = {
        partnerCode: this.partnerCode,
        partnerName: 'TroPay',
        storeId: 'TroPayStore',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: this.returnUrl,
        ipnUrl: this.notifyUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData: extraData,
        signature: signature
      };

      logger.info('Creating MoMo payment request', {
        orderId,
        amount,
        requestId,
        endpoint: `${this.endpoint}/v2/gateway/api/create`
      });

      // Send request to MoMo
      const response = await axios.post(
        `${this.endpoint}/v2/gateway/api/create`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      // Log full response for debugging
      logger.info('MoMo payment response received', {
        orderId,
        resultCode: response.data.resultCode,
        message: response.data.message,
        hasPayUrl: !!response.data.payUrl
      });

      return response.data;
    } catch (error) {
      logger.error('MoMo create payment error:', error);
      throw error;
    }
  }

  /**
   * Verify signature from MoMo callback
   * @param {Object} data - Callback data from MoMo
   * @returns {boolean} True if signature is valid
   */
  verifySignature(data) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = data;

      // Create raw signature data for verification
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

      // Generate signature
      const expectedSignature = this.createSignature(rawSignature);

      const isValid = signature === expectedSignature;

      if (!isValid) {
        logger.warn('MoMo signature verification failed', {
          orderId,
          requestId,
          expected: expectedSignature,
          received: signature
        });
      }

      return isValid;
    } catch (error) {
      logger.error('MoMo verify signature error:', error);
      return false;
    }
  }

  /**
   * Query transaction status from MoMo
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Transaction status
   */
  async queryTransaction(params) {
    try {
      const { orderId, requestId } = params;

      if (!orderId || !requestId) {
        throw new Error('Missing required parameters');
      }

      // Create raw signature data
      const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;

      // Generate signature
      const signature = this.createSignature(rawSignature);

      // Build request body
      const requestBody = {
        partnerCode: this.partnerCode,
        requestId: requestId,
        orderId: orderId,
        lang: 'vi',
        signature: signature
      };

      logger.info('Querying MoMo transaction', {
        orderId,
        requestId
      });

      // Send request to MoMo
      const response = await axios.post(
        `${this.endpoint}/v2/gateway/api/query`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('MoMo query response received', {
        orderId,
        resultCode: response.data.resultCode
      });

      return response.data;
    } catch (error) {
      logger.error('MoMo query transaction error:', error);
      throw error;
    }
  }

  /**
   * Refund transaction
   * @param {Object} params - Refund parameters
   * @returns {Promise<Object>} Refund response
   */
  async refund(params) {
    try {
      const {
        orderId,
        requestId,
        amount,
        transId,
        description = 'Hoàn tiền'
      } = params;

      if (!orderId || !requestId || !amount || !transId) {
        throw new Error('Missing required parameters');
      }

      // Create raw signature data
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}&transId=${transId}`;

      // Generate signature
      const signature = this.createSignature(rawSignature);

      // Build request body
      const requestBody = {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: requestId,
        amount: amount,
        transId: transId,
        lang: 'vi',
        description: description,
        signature: signature
      };

      logger.info('Processing MoMo refund', {
        orderId,
        amount,
        transId
      });

      // Send request to MoMo
      const response = await axios.post(
        `${this.endpoint}/v2/gateway/api/refund`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('MoMo refund response received', {
        orderId,
        resultCode: response.data.resultCode
      });

      return response.data;
    } catch (error) {
      logger.error('MoMo refund error:', error);
      throw error;
    }
  }

  /**
   * Get MoMo result code description
   * @param {number} resultCode - Result code from MoMo
   * @returns {string} Description in Vietnamese
   */
  getResultCodeDescription(resultCode) {
    const codes = {
      0: 'Giao dịch thành công',
      9000: 'Giao dịch đã được xác nhận thành công',
      1000: 'Giao dịch đã được khởi tạo, chờ người dùng xác nhận thanh toán',
      1001: 'Giao dịch đang được xử lý',
      1003: 'Giao dịch bị từ chối bởi người dùng',
      1004: 'Giao dịch bị hủy',
      1005: 'Giao dịch đã hết hạn',
      1006: 'Giao dịch bị từ chối do tài khoản không đủ số dư',
      1007: 'Giao dịch bị từ chối do OTP không chính xác',
      2001: 'Giao dịch thất bại do sai thông tin',
      3001: 'Lỗi hệ thống',
      3002: 'Không tìm thấy giao dịch',
      3003: 'Giao dịch đã tồn tại',
      4001: 'Sai chữ ký',
      4002: 'Thiếu tham số bắt buộc',
      4003: 'Dữ liệu không hợp lệ',
      4010: 'Merchant không tồn tại',
      4011: 'Request trùng lặp',
      4100: 'Giao dịch vượt quá hạn mức'
    };

    return codes[resultCode] || `Mã lỗi không xác định: ${resultCode}`;
  }
}

// Export singleton instance
module.exports = new MoMoService();
