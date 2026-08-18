import { useState } from "react";
import { signupUser, loginUser } from "../api";
import { motion } from "framer-motion";

function Signup({ switchToLogin, onLoginSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // step 1 - create the account
      await signupUser(name, email, password);

      // step 2 - log them in right away using the same credentials
      const loginData = await loginUser(email, password);

      // step 3 - tell the parent they're logged in now, takes them to flight search
      onLoginSuccess(loginData.token, loginData.user);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <motion.div
      className="auth-box"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="eyebrow auth-eyebrow">Create account</p>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit">Sign Up</button>
      </form>

      <p className="auth-link-row">
        Already have an account?{" "}
        <span className="link-text" onClick={switchToLogin}>
          Login here
        </span>
      </p>
    </motion.div>
  );
}

export default Signup;