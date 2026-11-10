
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token) {
        throw new Error("Login response mein token nahi mila.");
      }

      if (!data.user) {
        throw new Error("Login response mein user details nahi mili.");
      }

      // SAVE AUTHENTICATION DETAILS
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // REDIRECT BASED ON USER ROLE
      if (data.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/parking", { replace: true });
      }

    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-card">

        <h1>SmartPark</h1>
        <h2>Welcome Back!</h2>

        <p className="signup-subtitle">
          Login to your SmartPark account.
        </p>

        <form onSubmit={handleSubmit}>

          <label>Email Address</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* FORGOT PASSWORD LINK */}
          <div className="forgot-password-link">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {message && (
          <p className="signup-message">{message}</p>
        )}

        <p className="login-link">
          Don't have an account?{" "}
          <Link to="/signup">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;
