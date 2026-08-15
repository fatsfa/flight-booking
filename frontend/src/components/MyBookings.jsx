import { useState, useEffect } from "react";
import { getMyBookings } from "../api";

// refreshTrigger is just a number that changes to force this to reload
function MyBookings({ token, refreshTrigger }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, [refreshTrigger]); // reload whenever refreshTrigger changes

  const loadBookings = async () => {
    try {
      const data = await getMyBookings(token);
      setBookings(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <h2>My Bookings</h2>

      {bookings.length === 0 && <p>You have no bookings yet</p>}

      {bookings.map((b) => (
        <div className="booking-item" key={b.id}>
          <span>
            {b.origin} → {b.destination}
          </span>
          <span className={"status-badge status-" + b.status}>
            {b.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default MyBookings;