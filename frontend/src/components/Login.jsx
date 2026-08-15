import {useState} from "react"
import {loginUser} from "../api"

function Login({onLoginSuccess,switchToSignup}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit=async(e) =>{
    e.preventDefault(); 
    try {
      const data = await loginUser(email, password)
      onLoginSuccess(data.token, data.user)
    } catch (err){
      setErrorMsg(err.message)
    }
  }

  return (
    <div className="auth-box">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
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

        <button type="submit">Login</button>
      </form>

      <p>
        Don't have an account?{" "}
        <span className="link-text" onClick={switchToSignup}>
          Sign up here
        </span>
      </p>
    </div>
  );
}

export default Login;