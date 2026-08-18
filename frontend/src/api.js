const API_BASE = "https://flight-booking-m2av.onrender.com/api";

function getStoredAccessToken() {
  return localStorage.getItem("token");
}

function getStoredRefreshToken() {
  return localStorage.getItem("refreshToken");
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(API_BASE + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Session expired");
  }

  localStorage.setItem("token", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return data.accessToken;
}

async function apiCall(endpoint, method = "GET", body = null, token = null, retry = true) {
  const headers = { "Content-Type": "application/json" };
  const activeToken = token || getStoredAccessToken();

  if (activeToken) {
    headers["Authorization"] = "Bearer " + activeToken;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let response = await fetch(API_BASE + endpoint, options);

  if (response.status === 401 && retry && getStoredRefreshToken()) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = "Bearer " + newToken;
      response = await fetch(API_BASE + endpoint, { ...options, headers });
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      throw new Error("Session expired. Please log in again.");
    }
  }

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

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

export function logoutUser(token, refreshToken) {
  return apiCall("/auth/logout", "POST", { refreshToken }, token, false);
}

export function getFlights(origin, destination, date, passengerCount, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (origin) params.append("origin", origin);
  if (destination) params.append("destination", destination);
  if (date) params.append("date", date);
  if (passengerCount) params.append("passengerCount", passengerCount);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);

  const queryString = params.toString();
  const endpoint = queryString ? "/flights?" + queryString : "/flights";
  return apiCall(endpoint).then((data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.flights)) return data.flights;
    return [];
  });
}

export function getAllFlights(token) {
  return apiCall("/flights", "GET", null, token).then((data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.flights)) return data.flights;
    return [];
  });
}

export function bookFlight(flightId, passengers, extraBaggageKg, passengerDetails, token) {
  return apiCall("/bookings", "POST", { flightId, passengers, extraBaggageKg, passengerDetails }, token);
}

export function cancelBooking(bookingId, token) {
  return apiCall(`/bookings/${bookingId}/cancel`, "POST", {}, token);
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

export function getAllBookings(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.fromDate) params.append("fromDate", filters.fromDate);
  if (filters.toDate) params.append("toDate", filters.toDate);
  if (filters.route) params.append("route", filters.route);

  const queryString = params.toString();
  const endpoint = queryString ? "/bookings?" + queryString : "/bookings";
  return apiCall(endpoint, "GET", null, token);
}

export function addFlight(flightData, token) {
  return apiCall("/flights", "POST", flightData, token);
}

export function updateFlight(flightId, flightData, token) {
  return apiCall(`/flights/${flightId}`, "PUT", flightData, token);
}

export function deleteFlight(flightId, token) {
  return apiCall(`/flights/${flightId}`, "DELETE", null, token);
}