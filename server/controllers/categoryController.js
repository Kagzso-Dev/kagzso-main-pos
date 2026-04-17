const Category = require('../models/Category');
const { invalidateCache } = require('../utils/cache');

const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll(req.tenantId);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCategory = async (req, res) => {
    const { name, description, color, image } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Category name is required' });
    }
    try {
        const category = await Category.create({ name: name.trim(), description, color, image, tenantId: req.tenantId });
        invalidateCache('categories');
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('category-updated', { action: 'create', category });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 409 || error.message?.includes('already exists')) {
            return res.status(409).json({ message: `Category "${name.trim()}" already exists` });
        }
        res.status(500).json({ message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const existing = await Category.findById(req.params.id, req.tenantId);
        if (!existing) {
            return res.status(404).json({ message: 'Category not found' });
        }
        const category = await Category.updateById(req.params.id, req.body, req.tenantId);
        invalidateCache('categories');
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('category-updated', { action: 'update', category });
        res.json(category);
    } catch (error) {
        if (error.code === 409 || error.message?.includes('already exists')) {
            return res.status(409).json({ message: 'A category with that name already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const existing = await Category.findById(req.params.id, req.tenantId);
        if (!existing) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await Category.deleteById(req.params.id, req.tenantId);
        invalidateCache('categories');
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('category-updated', { action: 'delete', id: req.params.id });
        res.json({ message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
