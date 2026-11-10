import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminQRScanner from "./AdminQRScanner";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [statistics, setStatistics] = useState({
    totalSlots: 0,
    availableSlots: 0,
    reservedSlots: 0,
    occupiedSlots: 0,
  });

  const [bookingStatistics, setBookingStatistics] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    completedRevenue: 0,
  });

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [slots, setSlots] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  // SEARCH AND FILTER
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");

  // ADD SLOT
  const [slotId, setSlotId] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [pricePerHour, setPricePerHour] = useState("");

  // GENERAL STATES
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // FORMAT DATE
  function formatDate(date) {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // FORMAT CURRENCY
  function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString("en-IN");
  }

  // FETCH PARKING SLOTS
  async function fetchSlots() {
    const response = await fetch(
      "http://localhost:5000/api/admin/slots",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load slots.");
    }

    setSlots(data.slots || []);
  }

  // FETCH MONTHLY REVENUE
  async function fetchMonthlyRevenue() {
    const response = await fetch(
      "http://localhost:5000/api/admin/monthly-revenue",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to load monthly revenue."
      );
    }

    setMonthlyRevenue(data.monthlyRevenue || []);
  }

  // FETCH DASHBOARD DATA
  async function fetchDashboard() {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/admin/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load dashboard."
        );
      }

      setStatistics({
        totalSlots: data.statistics?.totalSlots || 0,
        availableSlots: data.statistics?.availableSlots || 0,
        reservedSlots: data.statistics?.reservedSlots || 0,
        occupiedSlots: data.statistics?.occupiedSlots || 0,
      });

      setBookingStatistics({
        totalBookings: data.bookingStatistics?.totalBookings || 0,
        activeBookings: data.bookingStatistics?.activeBookings || 0,
        completedBookings: data.bookingStatistics?.completedBookings || 0,
        cancelledBookings: data.bookingStatistics?.cancelledBookings || 0,
        totalRevenue: data.bookingStatistics?.totalRevenue || 0,
        completedRevenue: data.bookingStatistics?.completedRevenue || 0,
      });

      setBookings(data.bookings || []);

      await fetchSlots();
      await fetchMonthlyRevenue();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ADD NEW PARKING SLOT
  async function handleAddSlot(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/slots",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            slotId: slotId.trim(),
            vehicleType,
            pricePerHour: Number(pricePerHour),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add slot.");
      }

      setMessage("Parking slot added successfully!");
      setSlotId("");
      setPricePerHour("");

      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  // DELETE PARKING SLOT
  async function handleDeleteSlot(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this parking slot?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/slots/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete slot.");
      }

      setMessage("Parking slot deleted successfully!");

      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  // UPDATE BOOKING STATUS
  async function handleBookingStatus(id, status) {
    const action =
      status === "Occupied"
        ? "mark this booking as occupied"
        : "complete this booking";

    if (!window.confirm(`Are you sure you want to ${action}?`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/bookings/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update booking.");
      }

      setMessage(data.message || "Booking updated successfully.");

      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  // SEARCH AND FILTER BOOKINGS
  const filteredBookings = bookings.filter((booking) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      String(booking.slotId || "").toLowerCase().includes(search) ||
      String(booking.bookedBy?.name || "")
        .toLowerCase()
        .includes(search) ||
      String(booking.bookedBy?.email || "")
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === "All" || booking.status === statusFilter;

    const matchesVehicle =
      vehicleFilter === "All" || booking.vehicleType === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  // CLEAR FILTERS
  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setVehicleFilter("All");
  }

  // EXPORT BOOKINGS TO CSV
  function exportBookingsCSV() {
    if (filteredBookings.length === 0) {
      setError("No bookings available to export.");
      return;
    }

    const headers = [
      "Slot ID",
      "User Name",
      "Email",
      "Vehicle",
      "Booking Date",
      "Duration (Hours)",
      "Amount (INR)",
      "Status",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredBookings.map((booking) => [
      booking.slotId,
      booking.bookedBy?.name || "Unknown",
      booking.bookedBy?.email || "N/A",
      booking.vehicleType,
      formatDate(booking.bookingDate || booking.bookedAt),
      booking.durationHours || 0,
      booking.totalAmount || 0,
      booking.status,
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `SmartPark_Bookings_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setMessage("Booking CSV exported successfully!");
    setError("");
  }

  // LOAD DASHBOARD
  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <h2 className="admin-loading">
        Loading Admin Dashboard...
      </h2>
    );
  }

  // CALCULATE MAXIMUM MONTHLY REVENUE
  const maxRevenue = Math.max(
    ...monthlyRevenue.map((item) => item.totalRevenue || 0),
    1
  );

  return (
    <div className="admin-dashboard">

      {/* HEADER */}
      <header className="admin-header">
        <div>
          <h1>SmartPark Admin</h1>
          <p>Parking Management Dashboard</p>
        </div>

        <div className="admin-actions">
          <button onClick={fetchDashboard}>
            Refresh
          </button>

          <button
            onClick={() => navigate("/admin/users")}
            className="manage-users-btn"
          >
            Manage Users
          </button>

          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">

        {/* QR CODE SCANNER */}
        <AdminQRScanner
          token={token}
          onEntryConfirmed={fetchDashboard}
        />

        <h2>Dashboard Overview</h2>

        {message && (
          <div className="admin-success">{message}</div>
        )}

        {error && (
          <div className="admin-error">{error}</div>
        )}

        {/* PARKING SLOT STATISTICS */}
        <section className="admin-section">
          <h2>Parking Slot Statistics</h2>

          <div className="admin-stats">
            <div className="admin-stat-card">
              <h3>Total Slots</h3>
              <p>{statistics.totalSlots}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Available</h3>
              <p>{statistics.availableSlots}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Reserved</h3>
              <p>{statistics.reservedSlots}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Occupied</h3>
              <p>{statistics.occupiedSlots}</p>
            </div>
          </div>
        </section>

        {/* BOOKING AND REVENUE SUMMARY */}
        <section className="admin-section">
          <h2>Booking & Revenue Summary</h2>

          <div className="admin-stats">
            <div className="admin-stat-card">
              <h3>Total Bookings</h3>
              <p>{bookingStatistics.totalBookings}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Active Bookings</h3>
              <p>{bookingStatistics.activeBookings}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Completed Bookings</h3>
              <p>{bookingStatistics.completedBookings}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Cancelled Bookings</h3>
              <p>{bookingStatistics.cancelledBookings}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Total Revenue</h3>
              <p>₹{formatCurrency(bookingStatistics.totalRevenue)}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Completed Revenue</h3>
              <p>₹{formatCurrency(bookingStatistics.completedRevenue)}</p>
            </div>
          </div>
        </section>

        {/* MONTHLY REVENUE CHART */}
        <section className="admin-section">
          <h2>Monthly Revenue Chart</h2>

          {monthlyRevenue.length === 0 ? (
            <p>No completed booking revenue available yet.</p>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "18px",
                height: "300px",
                padding: "20px",
                overflowX: "auto",
                borderBottom: "2px solid #ccc",
              }}
            >
              {monthlyRevenue.map((item) => {
                const height = Math.max(
                  ((item.totalRevenue || 0) / maxRevenue) * 200,
                  5
                );

                const monthName = new Date(
                  item._id.year,
                  item._id.month - 1
                ).toLocaleString("en-IN", {
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={`${item._id.year}-${item._id.month}`}
                    style={{
                      minWidth: "90px",
                      textAlign: "center",
                    }}
                  >
                    <strong>
                      ₹{formatCurrency(item.totalRevenue)}
                    </strong>

                    <div
                      style={{
                        height: `${height}px`,
                        background: "#2563eb",
                        borderRadius: "6px 6px 0 0",
                        marginTop: "10px",
                      }}
                    />

                    <p>{monthName}</p>
                    <small>{item.totalBookings} bookings</small>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ADD PARKING SLOT */}
        <section className="admin-section">
          <h2>Add New Parking Slot</h2>

          <form
            className="admin-slot-form"
            onSubmit={handleAddSlot}
          >
            <input
              type="text"
              placeholder="Enter Slot ID (Example: A15)"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              required
            />

            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
              <option value="Bus">Bus</option>
              <option value="EV">EV</option>
            </select>

            <input
              type="number"
              placeholder="Price per hour (₹)"
              min="1"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              required
            />

            <button type="submit">Add Slot</button>
          </form>
        </section>

        {/* MANAGE PARKING SLOTS */}
        <section className="admin-section">
          <h2>Manage Parking Slots</h2>

          <div className="admin-table-container">
            <table>
              <thead>
                <tr>
                  <th>Slot ID</th>
                  <th>Vehicle Type</th>
                  <th>Price / Hour</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id}>
                    <td>{slot.slotId}</td>
                    <td>{slot.vehicleType}</td>
                    <td>₹{slot.pricePerHour}</td>
                    <td>{slot.status}</td>
                    <td>
                      <button
                        className="admin-delete-btn"
                        disabled={slot.status !== "Available"}
                        onClick={() => handleDeleteSlot(slot._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {slots.length === 0 && (
                  <tr>
                    <td colSpan="5">No parking slots found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PERMANENT BOOKING HISTORY */}
        <section className="admin-section">
          <h2>All Parking Bookings & History</h2>

          <p>
            Total Booking Records: <strong>{bookings.length}</strong>
          </p>

          {/* DOWNLOAD CSV BUTTON */}
          <button
            type="button"
            className="export-csv-btn"
            onClick={exportBookingsCSV}
          >
            Download Booking CSV
          </button>

          {/* SEARCH AND FILTER CONTROLS */}
          <div className="booking-filters">
            <input
              type="text"
              placeholder="Search Slot ID, user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="All">All Vehicles</option>
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
              <option value="Bus">Bus</option>
              <option value="EV">EV</option>
            </select>

            <button
              type="button"
              className="clear-filter-btn"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>

          <p>
            Showing <strong>{filteredBookings.length}</strong> of{" "}
            <strong>{bookings.length}</strong> bookings
          </p>

          {filteredBookings.length === 0 ? (
            <p>No matching bookings found.</p>
          ) : (
            <div className="admin-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Slot ID</th>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Vehicle</th>
                    <th>Booking Date</th>
                    <th>Duration</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.slotId}</td>
                      <td>{booking.bookedBy?.name || "Unknown"}</td>
                      <td>{booking.bookedBy?.email || "N/A"}</td>
                      <td>{booking.vehicleType}</td>

                      <td>
                        {formatDate(
                          booking.bookingDate || booking.bookedAt
                        )}
                      </td>

                      <td>{booking.durationHours || 0} hrs</td>

                      <td>
                        ₹{formatCurrency(booking.totalAmount)}
                      </td>

                      <td>
                        <span
                          className={`booking-status ${String(
                            booking.status || ""
                          ).toLowerCase()}`}
                        >
                          {booking.status}
                        </span>
                      </td>

                      <td>
                        {booking.status === "Reserved" && (
                          <button
                            className="admin-action-btn"
                            onClick={() =>
                              handleBookingStatus(
                                booking._id,
                                "Occupied"
                              )
                            }
                          >
                            Mark Occupied
                          </button>
                        )}

                        {booking.status === "Occupied" && (
                          <button
                            className="admin-action-btn complete"
                            onClick={() =>
                              handleBookingStatus(
                                booking._id,
                                "Completed"
                              )
                            }
                          >
                            Complete Booking
                          </button>
                        )}

                        {booking.status === "Completed" && (
                          <span>Completed</span>
                        )}

                        {booking.status === "Cancelled" && (
                          <span>Cancelled</span>
                        )}

                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* BOOKING DETAILS MODAL */}
        {selectedBooking && (
          <div
            className="booking-modal-overlay"
            onClick={() => setSelectedBooking(null)}
          >
            <div
              className="booking-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="booking-modal-header">
                <h2>Booking Details</h2>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                >
                  ×
                </button>
              </div>

              <div className="booking-details-list">
                <p>
                  <strong>Booking ID:</strong>{" "}
                  {selectedBooking._id}
                </p>

                <p>
                  <strong>Slot ID:</strong>{" "}
                  {selectedBooking.slotId}
                </p>

                <p>
                  <strong>User Name:</strong>{" "}
                  {selectedBooking.bookedBy?.name || "Unknown"}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {selectedBooking.bookedBy?.email || "N/A"}
                </p>

                <p>
                  <strong>Vehicle:</strong>{" "}
                  {selectedBooking.vehicleType}
                </p>

                <p>
                  <strong>Booking Date:</strong>{" "}
                  {formatDate(
                    selectedBooking.bookingDate ||
                    selectedBooking.bookedAt
                  )}
                </p>

                <p>
                  <strong>Duration:</strong>{" "}
                  {selectedBooking.durationHours || 0} Hours
                </p>

                <p>
                  <strong>Price Per Hour:</strong>{" "}
                  ₹{formatCurrency(selectedBooking.pricePerHour)}
                </p>

                <p>
                  <strong>Total Amount:</strong>{" "}
                  ₹{formatCurrency(selectedBooking.totalAmount)}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selectedBooking.status}
                </p>
              </div>

              <button
                type="button"
                className="close-details-btn"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default AdminDashboard;