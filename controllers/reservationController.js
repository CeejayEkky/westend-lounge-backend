const supabase = require('../config/supabase');
const { sendReservationConfirmation, sendAdminReservationAlert } = require('../utils/email');

// Create a new reservation
const createReservation = async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, reservation_date, guests, special_requests } = req.body;
    
    console.log('📅 Received reservation:', { customer_name, customer_email, reservation_date, guests });
    
    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone || !reservation_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Validate reservation date
    const reservationDateTime = new Date(reservation_date);
    if (isNaN(reservationDateTime.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date or time format' 
      });
    }
    
    // Check if reservation time is in the past
    if (reservationDateTime < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot make reservations for past dates/times' 
      });
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        customer_name: customer_name.trim(),
        customer_email: customer_email.toLowerCase().trim(),
        customer_phone: customer_phone.trim(),
        reservation_date: reservationDateTime.toISOString(),
        guests: parseInt(guests) || 2,
        special_requests: special_requests || null,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error: ' + error.message 
      });
    }
    
    console.log('✅ Reservation created:', data.id);
    
    // ✅ SEND RESPONSE IMMEDIATELY - Customer gets instant feedback
    res.status(201).json({ 
      success: true, 
      message: 'Reservation created successfully! Check your email for confirmation.',
      data 
    });
    
    // ✅ Send emails in BACKGROUND (don't make customer wait)
    // Customer won't see any delay from this
    Promise.all([
      sendReservationConfirmation(data).catch(err => console.error('❌ Customer email failed:', err.message)),
      sendAdminReservationAlert(data).catch(err => console.error('❌ Admin email failed:', err.message))
    ]).then(() => {
      console.log('📧 Both email attempts completed for reservation:', data.id);
    });
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Get all reservations (admin only)
const getAllReservations = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = supabase
      .from('reservations')
      .select('*')
      .order('reservation_date', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
  }
};

// Update reservation status (admin only)
const updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    res.json({ success: true, message: `Reservation ${status}`, data });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get reservation by ID (for customer lookup)
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Cancel reservation (customer)
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    // Verify the reservation belongs to this email
    const { data: existing, error: findError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('customer_email', email)
      .single();
    
    if (findError || !existing) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    if (existing.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Reservation already cancelled' });
    }
    
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete reservation (admin only)
const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    res.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { 
  deleteReservation,
  createReservation, 
  getAllReservations, 
  updateReservationStatus,
  getReservationById,
  cancelReservation
};