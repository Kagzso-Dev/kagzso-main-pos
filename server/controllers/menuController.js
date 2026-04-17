const MenuItem = require('../models/MenuItem');
const { invalidateCache } = require('../utils/cache');

const getMenuItems = async (req, res) => {
    try {
        const items = req.role === 'admin'
            ? await MenuItem.findAll(req.tenantId)
            : await MenuItem.findAvailable(req.tenantId);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createMenuItem = async (req, res) => {
    const { name, description, price, category, image, isVeg, availability, variants } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Item name is required' });
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
        return res.status(400).json({ message: 'Valid price is required' });
    }
    if (!category) {
        return res.status(400).json({ message: 'Category is required' });
    }
    try {
        const item = await MenuItem.create({
            name: name.trim(), description, price, category, image,
            isVeg, availability: availability !== false, variants,
            tenantId: req.tenantId,
        });
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('menu-updated', { action: 'create', item });
        res.status(201).json(item);
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Selected category does not exist' });
        }
        res.status(500).json({ message: error.message });
    }
};

const updateMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id, req.tenantId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        const updated = await MenuItem.updateById(req.params.id, req.body, req.tenantId);
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('menu-updated', { action: 'update', item: updated });
        res.json(updated);
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Selected category does not exist' });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id, req.tenantId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        await MenuItem.deleteById(req.params.id, req.tenantId);
        invalidateCache('menu');
        req.app.get('io').to(`${req.tenantId}:restaurant_main`).emit('menu-updated', { action: 'delete', id: req.params.id });
        res.json({ message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem };
