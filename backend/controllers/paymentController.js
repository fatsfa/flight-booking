const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');
const { confirmBookingSeats } = require('../models/bookingModel');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const result = await pool.query(
      `SELECT bookings.id, bookings.status, bookings.passengers, bookings.extra_baggage_kg, bookings.total_price,
              flights.origin, flights.destination
       FROM bookings JOIN flights ON bookings.flight_id = flights.id
       WHERE bookings.id = $1 AND bookings.user_id = $2`,
      [bookingId, req.user.id]
    );
    const booking = result.rows[0];

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not payable' });

    let description = `${booking.passengers} passenger(s)`;
    if (booking.extra_baggage_kg > 0) {
      description += `, +${booking.extra_baggage_kg}kg extra baggage`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Flight: ${booking.origin} → ${booking.destination}`,
            description,
          },
          unit_amount: Math.round(Number(booking.total_price) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/payment-success?booking_id=${booking.id}`,
      cancel_url: `${frontendUrl}/payment-cancelled?booking_id=${booking.id}`,
      metadata: { bookingId: booking.id.toString() },
    });

    await pool.query(
      'UPDATE bookings SET stripe_payment_intent = $1 WHERE id = $2',
      [session.payment_intent, booking.id]
    );

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = Number(session.metadata.bookingId);

    const eventCheck = await pool.query(
      'SELECT 1 FROM payment_events WHERE event_id = $1',
      [event.id]
    );

    if (eventCheck.rows.length > 0) {
      return res.json({ received: true });
    }

    try {
      const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);

      if (!booking.rows[0]) {
        await pool.query('INSERT INTO payment_events (event_id) VALUES ($1)', [event.id]);
        return res.json({ received: true });
      }

      if (booking.rows[0].status === 'confirmed') {
        await pool.query('INSERT INTO payment_events (event_id) VALUES ($1)', [event.id]);
        await pool.query(
          `INSERT INTO payments (booking_id, stripe_payment_id, amount, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [bookingId, session.payment_intent, session.amount_total / 100, 'succeeded']
        );
        return res.json({ received: true });
      }

      await confirmBookingSeats(bookingId);
      await pool.query('INSERT INTO payment_events (event_id) VALUES ($1)', [event.id]);
      await pool.query(
        `INSERT INTO payments (booking_id, stripe_payment_id, amount, status)
         VALUES ($1, $2, $3, $4)`,
        [bookingId, session.payment_intent, session.amount_total / 100, 'succeeded']
      );

      console.log(`Booking ${bookingId} confirmed via Stripe`);
    } catch (err) {
      console.error('Payment confirmation failed:', err);
    }
  }

  res.json({ received: true });
};

module.exports = { createCheckoutSession, handleWebhook };