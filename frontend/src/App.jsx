import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import FlightList from "./components/FlightList";
import MyBookings from "./components/MyBookings";
import AdminPanel from "./components/AdminPanel";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [bookingsRefresh, setBookingsRefresh] = useState(0);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const triggerBookingsRefresh = () => {
    setBookingsRefresh(bookingsRefresh + 1);
  };

  // this part renders the login/signup screen when not logged in
  const renderAuth = () => (
    <div className="container">
      <h1>Flight Booking</h1>
      {showSignup ? (
        <Signup switchToLogin={() => setShowSignup(false)} />
      ) : (
        <Login
          onLoginSuccess={handleLoginSuccess}
          switchToSignup={() => setShowSignup(true)}
        />
      )}
    </div>
  );

  // this part renders the main app when logged in
  const renderMainApp = () => (
    <div className="container">
      <div className="header-row">
        <h1>Flight Booking</h1>
        <div>
          <span>
            Hi, {user.name} ({user.role})
          </span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <FlightList token={token} refreshBookings={triggerBookingsRefresh} />
      <MyBookings token={token} refreshTrigger={bookingsRefresh} />
      {user.role === "admin" && <AdminPanel token={token} />}
    </div>
  );

  return (
    <Routes>
      <Route
        path="/"
        element={token ? renderMainApp() : renderAuth()}
      />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
    </Routes>
  );
}

export default App;