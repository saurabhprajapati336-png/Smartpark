
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // SEND OTP
  async function handleSendOTP(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // VERIFY OTP AND RESET PASSWORD
  async function handleResetPassword(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed.");
      }

      setMessage(data.message);

      setOtp("");
      setNewPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">

        <h1>Smart<span>Park</span></h1>

        <h2>Forgot Password?</h2>

        <p className="forgot-subtitle">
          Reset your SmartPark account password.
        </p>

        {/* STEP 1: ENTER EMAIL */}
        {step === 1 && (
          <form onSubmit={handleSendOTP}>

            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

          </form>
        )}

        {/* STEP 2: VERIFY OTP AND SET PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>

            <p className="otp-info">
              Enter the 6-digit OTP and your new password.
              Check your registered email.
            </p>

            <label>Email Address</label>

            <input
              type="email"
              value={email}
              disabled
            />

            <label>Enter OTP</label>

            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              inputMode="numeric"
              required
            />

            <label>New Password</label>

            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>

            <button
              type="button"
              className="back-step-btn"
              onClick={() => {
                setStep(1);
                setOtp("");
                setNewPassword("");
                setMessage("");
                setError("");
              }}
            >
              Change Email
            </button>

          </form>
        )}

        {message && (
          <p className="forgot-success">{message}</p>
        )}

        {error && (
          <p className="forgot-error">{error}</p>
        )}

        <p className="back-login">
          Remember your password? <Link to="/login">Login</Link>
        </p>

      </div>
    </div>
  );
}

export default ForgotPassword;
