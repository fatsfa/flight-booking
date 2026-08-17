// change this if you deploy your backend somewhere else
const API_BASE = "http://localhost:5000/api";

// small helper so i dont have to repeat fetch code everywhere
async function apiCall(endpoint, method = "GET", body = null, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const options = {
    method: method,
    headers: headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(API_BASE + endpoint, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "something went wrong");
  }

  return data;
}

export function signupUser(name, email, password) {
  return apiCall("/auth/signup", "POST", { name, email, password });
}

export function loginUser(email, password) {
  return apiCall("/auth/login", "POST", { email, password });
}

export function getFlights(origin, destination, date) {
  const params = new URLSearchParams();
  if (origin) params.append("origin", origin);
  if (destination) params.append("destination", destination);
  if (date) params.append("date", date);

  const queryString = params.toString();
  const endpoint = queryString ? "/flights?" + queryString : "/flights";
  return apiCall(endpoint);
}

export function bookFlight(flightId, passengers, extraBaggageKg, token) {
  return apiCall("/bookings", "POST", { flightId, passengers, extraBaggageKg }, token);
}

export function startPayment(bookingId, token) {
  return apiCall("/payments/checkout", "POST", { bookingId }, token);
}

export function getMyBookings(token) {
  return apiCall("/bookings/my", "GET", null, token);
}

export function getAdminStats(token) {
  return apiCall("/admin/stats", "GET", null, token);
}

export function getAllBookings(token) {
  return apiCall("/bookings", "GET", null, token);
}

export function addFlight(flightData, token) {
  return apiCall("/flights", "POST", flightData, token);
}