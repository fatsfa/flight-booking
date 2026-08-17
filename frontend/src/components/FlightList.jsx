import { useState, useEffect } from "react";
import { getFlights, bookFlight, startPayment } from "../api";
import { motion, AnimatePresence } from "framer-motion";

// baggage options - value is extra kg, surcharge is % added to ticket price
const BAGGAGE_OPTIONS = [
  { value: 0, label: "No extra baggage (30kg + 7kg included)", surcharge: 0 },
  { value: 10, label: "+10kg extra (+5% of ticket price)", surcharge: 5 },
  { value: 20, label: "+20kg extra (+10% of ticket price)", surcharge: 10 },
];

function FlightList({ token, refreshBookings }) {
  const [flights, setFlights] = useState([]);
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [message, setMessage] = useState("");

  // tracks which flight card currently has its booking panel open
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [extraBaggageKg, setExtraBaggageKg] = useState(0);

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    try {
      const data = await getFlights();
      setFlights(data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const data = await getFlights(originInput, destinationInput, dateInput);
      setFlights(data);
    } catch (err) {
      console.log(err);
    }
  };

  // opens the booking panel for a specific flight, resets passenger/baggage choices
  const openBookingPanel = (flightId) => {
    setSelectedFlightId(flightId);
    setPassengers(1);
    setExtraBaggageKg(0);
    setMessage("");
  };

  const closeBookingPanel = () => {
    setSelectedFlightId(null);
  };

  // works out the live total price shown before confirming
  const calculateTotal = (flightPrice) => {
    const option = BAGGAGE_OPTIONS.find((o) => o.value === extraBaggageKg);
    const surchargePercent = option ? option.surcharge : 0;
    const base = flightPrice * passengers;
    const total = base * (1 + surchargePercent / 100);
    return total.toFixed(2);
  };

  const handleConfirmBooking = async (flightId) => {
    setMessage("");
    try {
      const booking = await bookFlight(flightId, passengers, extraBaggageKg, token);
      const paymentData = await startPayment(booking.id, token);

      // redirect the current tab straight to Stripe checkout
      window.location.href = paymentData.url;
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>Search Flights</h2>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="From"
          value={originInput}
          onChange={(e) => setOriginInput(e.target.value)}
        />
        <input
          type="text"
          placeholder="To"
          value={destinationInput}
          onChange={(e) => setDestinationInput(e.target.value)}
        />
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
        />
        <button type="submit">Search</button>
        <button
          type="button"
          onClick={() => {
            setOriginInput("");
            setDestinationInput("");
            setDateInput("");
            loadFlights();
          }}
        >
          Show All
        </button>
      </form>

      {message && <p className="info-text">{message}</p>}

      <div className="flight-list">
        {flights.length === 0 && <p>No flights found</p>}

        {flights.map((flight, index) => (
          <motion.div
            className="flight-card"
            key={flight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ scale: 1.02 }}
          >
            <p>
              <strong>
                {flight.origin} → {flight.destination}
              </strong>
            </p>
            <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
            <p>Price per passenger: ${flight.price}</p>
            <p>Seats left: {flight.seats_available}</p>

            {selectedFlightId !== flight.id && (
              <button
                disabled={flight.seats_available < 1}
                onClick={() => openBookingPanel(flight.id)}
              >
                {flight.seats_available < 1 ? "Sold Out" : "Select"}
              </button>
            )}

            {/* booking panel - only shows for the flight currently selected */}
            <AnimatePresence>
              {selectedFlightId === flight.id && (
                <motion.div
                  className="booking-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="form-group">
                    <label>Number of passengers</label>
                    <input
                      type="number"
                      min="1"
                      max={flight.seats_available}
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Baggage</label>
                    <select
                      value={extraBaggageKg}
                      onChange={(e) => setExtraBaggageKg(Number(e.target.value))}
                    >
                      {BAGGAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="total-price">
                    Total: ${calculateTotal(flight.price)}
                  </p>

                  <div className="booking-panel-buttons">
                    <button onClick={() => handleConfirmBooking(flight.id)}>
                      Confirm & Pay
                    </button>
                    <button type="button" onClick={closeBookingPanel} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default FlightList;