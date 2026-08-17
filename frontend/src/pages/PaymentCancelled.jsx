import { useSearchParams, Link } from "react-router-dom";

function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <div className="auth-box">
      <h2>Payment Cancelled</h2>
      <p>Your booking (ID: {bookingId}) is still pending payment.</p>
      <p className="error-text">
        You can try paying again from My Bookings, or search for a different flight.
      </p>
      <Link to="/">
        <button>Back to Flights</button>
      </Link>
    </div>
  );
}

export default PaymentCancelled;