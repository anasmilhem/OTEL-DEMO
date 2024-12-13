const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { logger } = require('../config/logger');

router.get('/', async (req, res) => {
    try {
        logger.info('Fetching products', {
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            sort: req.query.sort || 'name',
            search: req.query.search || ''
        });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort || 'name';
        const order = req.query.order || 'asc';
        const search = req.query.search || '';

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const sortQuery = { [sort]: order === 'asc' ? 1 : -1 };

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort(sortQuery)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        logger.error('Failed to fetch products', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        logger.info('Creating new product', {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price
        });

        const product = new Product({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
        });
        const newProduct = await product.save();

        logger.info('Product created successfully', {
            productId: newProduct._id
        });

        res.status(201).json(newProduct);
    } catch (error) {
        logger.error('Failed to create product', {
            error: error.message,
            stack: error.stack
        });
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        logger.info('Attempting to delete product', {
            productId: req.params.id
        });

        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            logger.warn('Product not found for deletion', {
                productId: req.params.id
            });
            return res.status(404).json({ message: 'Product not found' });
        }

        logger.info('Product deleted successfully', {
            productId: req.params.id
        });

        res.json({ message: 'Product deleted' });
    } catch (error) {
        logger.error('Failed to delete product', {
            productId: req.params.id,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 