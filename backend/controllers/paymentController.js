const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const pool=require('../config/db')

const createCheckoutSession=async(req,res) =>{
  try {
    const {bookingId} = req.body;
    const result=await pool.query(
      `SELECT bookings.id, bookings.status, flights.price, flights.origin, flights.destination
       FROM bookings JOIN flights ON bookings.flight_id = flights.id
       WHERE bookings.id = $1 AND bookings.user_id = $2`,
      [bookingId, req.user.id]
    );
    const booking=result.rows[0];

    if(!booking) return res.status(404).json({ error:'Booking not found'});
    if(booking.status!=='pending') return res.status(400).json({ error:'Booking is not payable'});

    const session=await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Flight: ${booking.origin} → ${booking.destination}` },
          unit_amount: Math.round(booking.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:5000/payment-success',
      cancel_url: 'http://localhost:5000/payment-cancelled',
      metadata: { bookingId: booking.id.toString() }, 
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const handleWebhook = async (req, res) => {
  const sig=req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type==='checkout.session.completed') {
    const session=event.data.object;
    const bookingId=session.metadata.bookingId;

    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['confirmed',bookingId]);
    await pool.query(
      'INSERT INTO payments (booking_id, stripe_payment_id, amount, status) VALUES ($1, $2, $3, $4)',
      [bookingId, session.payment_intent, session.amount_total / 100, 'succeeded']
    );
    console.log(`Booking ${bookingId} confirmed via Stripe`);
  }
  res.json({received:true});
}
module.exports = { createCheckoutSession,handleWebhook}