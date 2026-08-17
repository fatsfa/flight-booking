import { useState, useEffect } from "react";
import { getAdminStats, getAllBookings, addFlight } from "../api";
import { motion } from "framer-motion";

function AdminPanel({ token }) {
  const [stats, setStats] = useState(null);
  const [allBookings, setAllBookings] = useState([]);

  // form fields for adding a new flight
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    loadStats();
    loadAllBookings();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getAdminStats(token);
      setStats(data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadAllBookings = async () => {
    try {
      const data = await getAllBookings(token);
      setAllBookings(data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddFlight = async (e) => {
    e.preventDefault();
    setFormMessage("");

    try {
      await addFlight(
        {
          origin: origin,
          destination: destination,
          departure_time: departureTime,
          price: Number(price),
          seats_available: Number(seats),
        },
        token
      );

      setFormMessage("Flight added successfully!");

      // clear the form
      setOrigin("");
      setDestination("");
      setDepartureTime("");
      setPrice("");
      setSeats("");

      loadStats(); // refresh the numbers
    } catch (err) {
      setFormMessage("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>

      {stats && (
  <div className="stats-row">
    {[
      { label: "Total Bookings", value: stats.totalBookings },
      { label: "Confirmed", value: stats.confirmedBookings },
      { label: "Revenue", value: "$" + stats.totalRevenue },
      { label: "Flights", value: stats.totalFlights },
      { label: "Users", value: stats.totalUsers },
    ].map((item, index) => (
      <motion.div
        className="stat-card"
        key={item.label}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.08 }}
      >
        <p className="stat-number">{item.value}</p>
        <p>{item.label}</p>
      </motion.div>
    ))}
  </div>
)}

      <h3>Add New Flight</h3>
      <form onSubmit={handleAddFlight} className="admin-form">
        <input
          type="text"
          placeholder="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Seats"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          required
        />
        <button type="submit">Add Flight</button>
      </form>

      {formMessage && <p className="info-text">{formMessage}</p>}

     <h3>All Bookings</h3>
      {allBookings.map((b) => (
        <div className="booking-item" key={b.id}>
          <div>
            <span>
              {b.user_name} ({b.email}) - {b.origin} → {b.destination}
            </span>
            <p className="booking-detail">
              {b.passengers} passenger(s)
              {b.extra_baggage_kg > 0 && ` · +${b.extra_baggage_kg}kg extra baggage`}
              {" · $"}{b.total_price}
            </p>
          </div>
          <span className={"status-badge status-" + b.status}>
            {b.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default AdminPanel;