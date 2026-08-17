import {useState} from "react"
import {signupUser} from "../api"
import { motion } from "framer-motion";
function Signup({ switchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await signupUser(name, email, password);
      setSuccessMsg("Account created! You can login now.");
      // clear the form
      setName("");
      setEmail("");
      setPassword("");
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
        {successMsg && <p className="success-text">{successMsg}</p>}

        <button type="submit">Sign Up</button>
      </form>

      <p>
        Already have an account?{" "}
        <span className="link-text" onClick={switchToLogin}>
          Login here
        </span>
      </p>
    </motion.div>
  );
}

export default Signup;