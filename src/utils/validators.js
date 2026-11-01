// src/utils/validators.js
const Joi = require('joi');

const schemas = {
    chatMessage: Joi.object({
        message: Joi.string().required().min(1).max(1000),
        sessionId: Joi.string().uuid().required()
    }),

    sessionId: Joi.object({
        sessionId: Joi.string().uuid().required()
    }),

    newsArticle: Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        url: Joi.string().uri().optional(),
        publishedAt: Joi.date().optional()
    })
};

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message
            });
        }
        next();
    };
};

module.exports = { schemas, validate };