import { useSearchParams, Link } from "react-router-dom";

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <div className="auth-box">
      <h2>Payment Successful</h2>
      <p>Your booking (ID: {bookingId}) has been confirmed.</p>
      <p className="success-text">
        It may take a few seconds for the status to update in My Bookings.
      </p>
      <Link to="/">
        <button>Back to Flights</button>
      </Link>
    </div>
  );
}

export default PaymentSuccess;