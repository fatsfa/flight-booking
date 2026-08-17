import { useState, useEffect } from "react";
import { getFlights, bookFlight, startPayment } from "../api";
import { motion, AnimatePresence } from "framer-motion";

const CITY_OPTIONS = [
  "Mangalore", "Mumbai", "Mysore", "Madurai", "New York", "Chicago", "Los Angeles",
  "Boston", "Seattle", "Denver", "Dallas", "Miami", "San Francisco", "London",
  "Dubai", "Singapore", "Bengaluru", "Hyderabad", "Kochi", "Jaipur"
];

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
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  // tracks which flight card currently has its booking panel open
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [extraBaggageKg, setExtraBaggageKg] = useState(0);
  const [passengerDetails, setPassengerDetails] = useState([]);

  useEffect(() => {
    loadFlights();
  }, []);

  useEffect(() => {
    const originValue = originInput.trim();
    const destinationValue = destinationInput.trim();

    if (!originValue || !destinationValue) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await getFlights(originValue, destinationValue, dateInput || undefined);
        setFlights(data);
      } catch (err) {
        console.log(err);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [originInput, destinationInput, dateInput]);

  const filterCities = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return [];

    return CITY_OPTIONS.filter((city) => city.toLowerCase().startsWith(trimmed.toLowerCase())).slice(0, 6);
  };

  const handleCityChange = (field, value) => {
    const nextValue = value;

    if (field === "origin") {
      setOriginInput(nextValue);
      setOriginSuggestions(filterCities(nextValue));
    }

    if (field === "destination") {
      setDestinationInput(nextValue);
      setDestinationSuggestions(filterCities(nextValue));
    }
  };

  const handleCitySelect = (field, value) => {
    if (field === "origin") {
      setOriginInput(value);
      setOriginSuggestions([]);
    }

    if (field === "destination") {
      setDestinationInput(value);
      setDestinationSuggestions([]);
    }
  };

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
    const initialPassengers = Array.from({ length: 1 }, () => ({
      fullName: "",
      dateOfBirth: "",
      nationality: "",
      passportNumber: "",
      email: "",
      contactNumber: "",
    }));

    setSelectedFlightId(flightId);
    setPassengers(1);
    setExtraBaggageKg(0);
    setPassengerDetails(initialPassengers);
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

  const handlePassengerChange = (index, field, value) => {
    const next = [...passengerDetails];
    next[index] = { ...next[index], [field]: value };
    setPassengerDetails(next);
  };

  const handleConfirmBooking = async (flightId) => {
    setMessage("");
    try {
      const normalizedPassengers = Array.from({ length: passengers }, (_, index) => ({
        fullName: passengerDetails[index]?.fullName || "",
        dateOfBirth: passengerDetails[index]?.dateOfBirth || "",
        nationality: passengerDetails[index]?.nationality || "",
        passportNumber: passengerDetails[index]?.passportNumber || "",
        email: passengerDetails[index]?.email || "",
        contactNumber: passengerDetails[index]?.contactNumber || "",
      }));

      const booking = await bookFlight(
        flightId,
        passengers,
        extraBaggageKg,
        normalizedPassengers,
        token
      );
      const paymentData = await startPayment(booking.id, token);
      window.location.href = paymentData.url;
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>Search Flights</h2>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="From"
            value={originInput}
            onChange={(e) => handleCityChange("origin", e.target.value)}
            onBlur={() => setTimeout(() => setOriginSuggestions([]), 100)}
          />
          {originSuggestions.length > 0 && (
            <ul className="suggestion-list">
              {originSuggestions.map((city) => (
                <li key={city} onMouseDown={() => handleCitySelect("origin", city)}>
                  {city}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="To"
            value={destinationInput}
            onChange={(e) => handleCityChange("destination", e.target.value)}
            onBlur={() => setTimeout(() => setDestinationSuggestions([]), 100)}
          />
          {destinationSuggestions.length > 0 && (
            <ul className="suggestion-list">
              {destinationSuggestions.map((city) => (
                <li key={city} onMouseDown={() => handleCitySelect("destination", city)}>
                  {city}
                </li>
              ))}
            </ul>
          )}
        </div>

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
            setOriginSuggestions([]);
            setDestinationSuggestions([]);
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
                      onChange={(e) => {
                        const count = Number(e.target.value) || 1;
                        setPassengers(count);
                        setPassengerDetails((prev) => {
                          const next = [...prev];
                          while (next.length < count) {
                            next.push({
                              fullName: "",
                              dateOfBirth: "",
                              nationality: "",
                              passportNumber: "",
                              email: "",
                              contactNumber: "",
                            });
                          }
                          while (next.length > count) {
                            next.pop();
                          }
                          return next;
                        });
                      }}
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

                  {Array.from({ length: passengers }, (_, index) => (
                    <div key={index} className="passenger-form-box">
                      <h4>Passenger {index + 1}</h4>
                      <div className="form-group">
                        <label>Full Name</label>
                        <input value={passengerDetails[index]?.fullName || ""} onChange={(e) => handlePassengerChange(index, "fullName", e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" value={passengerDetails[index]?.dateOfBirth || ""} onChange={(e) => handlePassengerChange(index, "dateOfBirth", e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Nationality</label>
                        <input value={passengerDetails[index]?.nationality || ""} onChange={(e) => handlePassengerChange(index, "nationality", e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Passport Number</label>
                        <input value={passengerDetails[index]?.passportNumber || ""} onChange={(e) => handlePassengerChange(index, "passportNumber", e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={passengerDetails[index]?.email || ""} onChange={(e) => handlePassengerChange(index, "email", e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Contact Number</label>
                        <input value={passengerDetails[index]?.contactNumber || ""} onChange={(e) => handlePassengerChange(index, "contactNumber", e.target.value)} required />
                      </div>
                    </div>
                  ))}

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