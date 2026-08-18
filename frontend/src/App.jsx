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
    const savedRefreshToken = localStorage.getItem("refreshToken");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedRefreshToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (newToken, newRefreshToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await fetch("http://localhost:5000/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (err) {
      console.log(err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  };

  const triggerBookingsRefresh = () => {
    setBookingsRefresh(bookingsRefresh + 1);
  };

  // this part renders the login/signup screen when not logged in
  const renderAuth = () => (
    <div className="container">
      <h1>Flight Booking</h1>
      {showSignup ? (
        <Signup switchToLogin={() => setShowSignup(false)} 
        onLoginSuccess={handleLoginSuccess}/>
      ) : (
        <Login
          onLoginSuccess={handleLoginSuccess}
          switchToSignup={() => setShowSignup(true)}
        />
      )}
    </div>
  );

  // this part renders the main app when logged in
  const renderMainApp = () => {
    if (user?.role === "admin") {
      return (
        <div className="app-shell">
          <header className="topbar">
            <div className="brand-block">
              <div className="brand-mark">A</div>
              <div>
                <p className="brand-name">Aurelia Air</p>
                <small>Admin dashboard</small>
              </div>
            </div>

            <div className="topbar-user">
              <span className="user-pill">
                {user.name} · {user.role}
              </span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </header>

          <div className="panel admin-panel-shell">
            <AdminPanel token={token} />
          </div>
        </div>
      );
    }

    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark">A</div>
            <div>
              <p className="brand-name">Aurelia Air</p>
              <small>Private booking lounge</small>
            </div>
          </div>

          <div className="topbar-user">
            <span className="user-pill">
              {user.name} · {user.role}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>

        <section className="hero-panel">
          <div>
            <p className="eyebrow">Curated travel experiences</p>
            <h1>Fly beyond the ordinary.</h1>
          </div>
          <div className="hero-meta">
            <span>Premium routes</span>
            <span>Fast checkout</span>
            <span>Flexible booking</span>
          </div>
        </section>

        <div className="workspace-grid">
          <div className="panel main-panel">
            <FlightList token={token} user={user} refreshBookings={triggerBookingsRefresh} />
          </div>

          <aside className="panel side-panel">
            <MyBookings token={token} refreshTrigger={bookingsRefresh} />
          </aside>
        </div>
      </div>
    );
  };

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