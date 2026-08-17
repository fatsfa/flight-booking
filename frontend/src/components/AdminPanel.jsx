import { useState, useEffect } from "react";
import { getAdminStats, getAllBookings, addFlight, cancelBooking, getAllFlights, updateFlight, deleteFlight } from "../api";
import { motion } from "framer-motion";

function AdminPanel({ token }) {
  const [stats, setStats] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [allFlights, setAllFlights] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [editingFlightId, setEditingFlightId] = useState(null);
  const [editingValues, setEditingValues] = useState({
    origin: "",
    destination: "",
    departure_time: "",
    price: "",
    seats_available: "",
  });

  useEffect(() => {
    loadStats();
    loadAllBookings();
    loadFlights();
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
      const data = await getAllBookings(token, {
        status: filterStatus,
        fromDate: filterFromDate,
        toDate: filterToDate,
        route: filterRoute,
      });
      setAllBookings(data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadFlights = async () => {
    try {
      const data = await getAllFlights(token);
      setAllFlights(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadAllBookings();
  }, [filterStatus, filterFromDate, filterToDate, filterRoute]);

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
      setOrigin("");
      setDestination("");
      setDepartureTime("");
      setPrice("");
      setSeats("");
      loadFlights();
      loadStats();
    } catch (err) {
      setFormMessage("Error: " + err.message);
    }
  };

  const startEditFlight = (flight) => {
    setEditingFlightId(flight.id);
    setEditingValues({
      origin: flight.origin,
      destination: flight.destination,
      departure_time: flight.departure_time?.slice(0, 16) || "",
      price: flight.price,
      seats_available: flight.seats_available,
    });
  };

  const handleUpdateFlight = async (flightId) => {
    try {
      await updateFlight(flightId, {
        ...editingValues,
        price: Number(editingValues.price),
        seats_available: Number(editingValues.seats_available),
      }, token);
      setEditingFlightId(null);
      loadFlights();
      loadStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFlight = async (flightId) => {
    try {
      await deleteFlight(flightId, token);
      loadFlights();
      loadStats();
    } catch (err) {
      alert(err.message);
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

      <h3>Manage Flights</h3>
      {allFlights.map((flight) => (
        <div className="booking-item" key={flight.id}>
          <div>
            {editingFlightId === flight.id ? (
              <div className="admin-form">
                <input value={editingValues.origin} onChange={(e) => setEditingValues({ ...editingValues, origin: e.target.value })} />
                <input value={editingValues.destination} onChange={(e) => setEditingValues({ ...editingValues, destination: e.target.value })} />
                <input type="datetime-local" value={editingValues.departure_time} onChange={(e) => setEditingValues({ ...editingValues, departure_time: e.target.value })} />
                <input type="number" value={editingValues.price} onChange={(e) => setEditingValues({ ...editingValues, price: e.target.value })} />
                <input type="number" value={editingValues.seats_available} onChange={(e) => setEditingValues({ ...editingValues, seats_available: e.target.value })} />
              </div>
            ) : (
              <>
                <span>{flight.origin} → {flight.destination}</span>
                <p className="booking-detail">
                  {new Date(flight.departure_time).toLocaleString()} · {flight.seats_available} seats left · ${flight.price}
                </p>
              </>
            )}
          </div>
          <div>
            {editingFlightId === flight.id ? (
              <>
                <button type="button" onClick={() => handleUpdateFlight(flight.id)}>Save</button>
                <button type="button" className="cancel-btn" onClick={() => setEditingFlightId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => startEditFlight(flight)}>Edit</button>
                <button type="button" className="cancel-btn" onClick={() => handleDeleteFlight(flight.id)}>Delete</button>
              </>
            )}
          </div>
        </div>
      ))}

      <h3>All Bookings</h3>
      <div className="admin-filter-row">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} placeholder="From date" />
        <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} placeholder="To date" />
        <input type="text" value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} placeholder="Route search" />
      </div>

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
          <div>
            <span className={"status-badge status-" + b.status}>
              {b.status}
            </span>
            {(b.status === "pending" || b.status === "confirmed") && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await cancelBooking(b.id, token);
                    loadAllBookings();
                    loadStats();
                  } catch (err) {
                    alert(err.message);
                  }
                }}
                className="cancel-btn"
              >
                Force Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminPanel;