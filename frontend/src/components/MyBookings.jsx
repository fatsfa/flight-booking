import { useState, useEffect } from "react";
import { getMyBookings, cancelBooking } from "../api";

function MyBookings({ token, refreshTrigger }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, [refreshTrigger]);

  const loadBookings = async () => {
    try {
      const data = await getMyBookings(token);
      setBookings(data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await cancelBooking(bookingId, token);
      loadBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>My Bookings</h2>

      {bookings.length === 0 && <p>You have no bookings yet</p>}

      {bookings.map((b) => (
        <div className="booking-item" key={b.id}>
          <div>
            <span>
              {b.origin} → {b.destination}
            </span>
            <p className="booking-detail">
              {b.passengers} passenger(s)
              {b.extra_baggage_kg > 0 && ` · +${b.extra_baggage_kg}kg extra baggage`}
              {" · $"}{b.total_price}
            </p>
          </div>
          <div>
            <span className={"status-badge status-" + b.status}>
              {b.status}
            </span>
            {(b.status === "pending" || b.status === "confirmed") && (
              <button type="button" onClick={() => handleCancelBooking(b.id)} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyBookings;