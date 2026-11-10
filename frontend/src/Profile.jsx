
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // FETCH PROFILE
  async function fetchProfile() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/auth/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load profile.");
      }

      setUser({
        name: data.user.name || "",
        email: data.user.email || "",
        role: data.user.role || "user",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  // UPDATE PROFILE
  async function handleProfileUpdate(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/auth/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: user.name,
            email: user.email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Profile update failed.");
      }

      setUser({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });

      // UPDATE LOCAL STORAGE USER DATA
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        })
      );

      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // CHANGE PASSWORD
  async function handlePasswordChange(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/auth/change-password",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password change failed.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
    <div className="profile-page">

      {/* HEADER */}
      <header className="profile-header">
        <div>
          <h1>Smart<span>Park</span></h1>
          <p>My Account</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <main className="profile-main">

        <h2>My Profile</h2>

        <p className="profile-subtitle">
          Manage your personal information and password.
        </p>

        <p>
          <Link to="/parking">← Back to Parking Dashboard</Link>
        </p>

        {message && (
          <div className="profile-success">{message}</div>
        )}

        {error && (
          <div className="profile-error">{error}</div>
        )}

        {/* PROFILE INFORMATION */}
        <section className="profile-card">
          <h3>Personal Information</h3>

          <form onSubmit={handleProfileUpdate}>

            <label>Full Name</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) =>
                setUser({ ...user, name: e.target.value })
              }
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) =>
                setUser({ ...user, email: e.target.value })
              }
              required
            />

            <label>Account Type</label>
            <input
              type="text"
              value={user.role}
              disabled
            />

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Profile"}
            </button>

          </form>
        </section>

        {/* CHANGE PASSWORD */}
        <section className="profile-card">
          <h3>Change Password</h3>

          <form onSubmit={handlePasswordChange}>

            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />

            <button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Change Password"}
            </button>

          </form>
        </section>

      </main>

      <footer className="profile-footer">
        <p>© 2026 SmartPark | Smart Parking Solution</p>
      </footer>

    </div>
  );
}

export default Profile;
