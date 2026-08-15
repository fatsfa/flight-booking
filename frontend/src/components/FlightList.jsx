import { useState, useEffect } from "react";
import { getFlights, bookFlight, startPayment } from "../api";

function FlightList({ token, refreshBookings }) {
  const [flights, setFlights] = useState([]);
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [message, setMessage] = useState("");

  // load all flights when the component first shows up
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
      const data = await getFlights(originInput, destinationInput);
      setFlights(data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleBookClick = async (flightId) => {
    setMessage("");
    try {
      // step 1 - create the booking
      const booking = await bookFlight(flightId, token);

      // step 2 - start stripe payment for that booking
      const paymentData = await startPayment(booking.id, token);

      // open stripe checkout page in new tab
      window.open(paymentData.url, "_blank");

      setMessage("Booking created! Complete payment in the new tab.");
      loadFlights(); // refresh seat counts
      refreshBookings(); // tell parent to refresh my bookings list too
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
        <button type="submit">Search</button>
        <button type="button" onClick={loadFlights}>
          Show All
        </button>
      </form>

      {message && <p className="info-text">{message}</p>}

      <div className="flight-list">
        {flights.length === 0 && <p>No flights found</p>}

        {flights.map((flight) => (
          <div className="flight-card" key={flight.id}>
            <p>
              <strong>
                {flight.origin} → {flight.destination}
              </strong>
            </p>
            <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
            <p>Price: ${flight.price}</p>
            <p>Seats left: {flight.seats_available}</p>
            <button
              disabled={flight.seats_available < 1}
              onClick={() => handleBookClick(flight.id)}
            >
              {flight.seats_available < 1 ? "Sold Out" : "Book Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FlightList;