const Joi = require('joi');

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be 10-15 digits',
        'any.required': 'Phone number is required'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      }),
    full_name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters',
        'any.required': 'Full name is required'
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be 10-15 digits',
        'any.required': 'Phone number is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

const validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    current_password: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    new_password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters',
        'any.required': 'New password is required'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword
};