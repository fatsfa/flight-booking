import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!bookingId || !token) return;

    fetch("http://localhost:5000/api/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId: Number(bookingId) }),
    }).catch(() => {});
  }, [bookingId]);

  return (
    <div className="auth-box">
      <h2>Payment Successful</h2>
      <p>Your booking (ID: {bookingId}) has been confirmed.</p>
      <p className="success-text">
        Your booking status is now updating immediately.
      </p>
      <Link to="/">
        <button>Back to Flights</button>
      </Link>
    </div>
  );
}

export default PaymentSuccess;