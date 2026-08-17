import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";

function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const cancelPendingBooking = async () => {
      if (!bookingId) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await fetch(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.log("payment-cancel cleanup failed", err);
      }
    };

    cancelPendingBooking();
  }, [bookingId]);

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