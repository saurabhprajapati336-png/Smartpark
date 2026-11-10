
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AdminUsers.css";

const API_URL = "http://localhost:5000/api/admin";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processingId, setProcessingId] = useState("");

  // FETCH ALL USERS
  async function fetchUsers() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to fetch users.");
      }

      setUsers(data.users || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // ACTIVATE / DEACTIVATE USER
  async function updateUserStatus(user) {
    const newStatus = user.isActive === false;

    const confirmed = window.confirm(
      newStatus
        ? `Activate ${user.name}'s account?`
        : `Deactivate ${user.name}'s account?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(user._id);
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${user._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Status update failed.");
      }

      setMessage(data.message);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId("");
    }
  }

  // FETCH USER BOOKING HISTORY
  async function viewBookingHistory(user) {
    try {
      setSelectedUser(user);
      setUserBookings([]);
      setHistoryLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${user._id}/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to fetch booking history."
        );
      }

      setUserBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
      setSelectedUser(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  // FILTER USERS
  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();

    return (
      (user.name || "").toLowerCase().includes(search) ||
      (user.email || "").toLowerCase().includes(search)
    );
  });

  // FORMAT DATE
  function formatDate(date) {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString("en-IN");
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="admin-users-page">

      {/* HEADER */}
      <header className="admin-users-header">
        <div>
          <h1>Smart<span>Park</span></h1>
          <p>Admin User Management</p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="admin-users-main">

        <p>
          <Link to="/admin">← Back to Admin Dashboard</Link>
        </p>

        <h2>User Management</h2>

        <p className="users-subtitle">
          View, search and manage registered SmartPark users.
        </p>

        {/* MESSAGES */}
        {message && (
          <div className="users-success">{message}</div>
        )}

        {error && (
          <div className="users-error">{error}</div>
        )}

        {/* USER STATISTICS */}
        <div className="users-statistics">
          <div>
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>

          <div>
            <h3>
              {users.filter((u) => u.isActive !== false).length}
            </h3>
            <p>Active Users</p>
          </div>

          <div>
            <h3>
              {users.filter((u) => u.isActive === false).length}
            </h3>
            <p>Inactive Users</p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="users-search">
          <input
            type="search"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* USERS TABLE */}
        {loading ? (
          <p>Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Bookings</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>

                    <td>{user.email}</td>

                    <td>{user.role}</td>

                    <td>{user.totalBookings || 0}</td>

                    <td>
                      <span
                        className={
                          user.isActive === false
                            ? "user-status inactive"
                            : "user-status active"
                        }
                      >
                        {user.isActive === false
                          ? "Inactive"
                          : "Active"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="user-history-btn"
                        onClick={() => viewBookingHistory(user)}
                      >
                        History
                      </button>

                      <button
                        className={
                          user.isActive === false
                            ? "activate-user-btn"
                            : "deactivate-user-btn"
                        }
                        disabled={processingId === user._id}
                        onClick={() => updateUserStatus(user)}
                      >
                        {processingId === user._id
                          ? "Please wait..."
                          : user.isActive === false
                          ? "Activate"
                          : "Deactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* USER BOOKING HISTORY MODAL */}
      {selectedUser && (
        <div
          className="user-history-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="user-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="user-history-header">
              <div>
                <h2>Booking History</h2>
                <p>{selectedUser.name}</p>
                <p>{selectedUser.email}</p>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <p>Loading booking history...</p>
            ) : userBookings.length === 0 ? (
              <p>No booking history found.</p>
            ) : (
              <div className="user-history-list">
                {userBookings.map((booking) => (
                  <div
                    className="user-history-item"
                    key={booking._id}
                  >
                    <h3>Slot: {booking.slotId}</h3>

                    <p>Vehicle: {booking.vehicleType}</p>

                    <p>
                      Date: {formatDate(booking.bookingDate)}
                    </p>

                    <p>
                      Duration: {booking.durationHours} hours
                    </p>

                    <p>
                      Total: ₹{booking.totalAmount}
                    </p>

                    <p>
                      Status: <strong>{booking.status}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              className="close-user-history"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="admin-users-footer">
        <p>© 2026 SmartPark | Smart Parking Solution</p>
      </footer>

    </div>
  );
}

export default AdminUsers;
