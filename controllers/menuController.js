const supabase = require('../config/supabase')

// ── GET /api/menu ─────────────────────────────────────────────────────────────
const getMenu = async (req, res) => {
  try {
    const { category, available } = req.query

    let query = supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('name')

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Public API only shows available items; admin sees all
    if (available !== 'all') {
      query = query.eq('available', true)
    }

    const { data: items, error } = await query

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch menu' })
    }

    res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get menu error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /api/menu/:id ─────────────────────────────────────────────────────────
const getMenuItem = async (req, res) => {
  try {
    const { data: item, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' })
    }

    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── POST /api/menu ─────────────────────────────────────────────────────────────
const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, image_url, popular, spicy, available } = req.body

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Name, price and category are required' })
    }

    const validCategories = ['grills', 'appetizers', 'main', 'drinks', 'cocktails', 'desserts']
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' })
    }

    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        name: name.trim(),
        description: description?.trim(),
        price: parseInt(price),
        category,
        image_url: image_url || null,
        popular: popular || false,
        spicy: spicy || false,
        available: available !== undefined ? available : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create menu item error:', error)
      return res.status(500).json({ success: false, message: 'Failed to create menu item' })
    }

    res.status(201).json({ success: true, message: 'Menu item created', data: item })
  } catch (error) {
    console.error('Create menu item error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── PUT /api/menu/:id ──────────────────────────────────────────────────────────
const updateMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, image_url, popular, spicy, available } = req.body

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description.trim()
    if (price !== undefined) updates.price = parseInt(price)
    if (category !== undefined) updates.category = category
    if (image_url !== undefined) updates.image_url = image_url
    if (popular !== undefined) updates.popular = popular
    if (spicy !== undefined) updates.spicy = spicy
    if (available !== undefined) updates.available = available

    const { data: item, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' })
    }

    res.json({ success: true, message: 'Menu item updated', data: item })
  } catch (error) {
    console.error('Update menu item error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── DELETE /api/menu/:id ───────────────────────────────────────────────────────
const deleteMenuItem = async (req, res) => {
  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', req.params.id)

    if (error) {
      return res.status(404).json({ success: false, message: 'Menu item not found' })
    }

    res.json({ success: true, message: 'Menu item deleted' })
  } catch (error) {
    console.error('Delete menu item error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getMenu, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem }