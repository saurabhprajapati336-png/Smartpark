
import { useNavigate } from "react-router-dom";
import "./App.css";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/parking";

function Parking() {
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState("Car");
  const [durationHours, setDurationHours] = useState("1");
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  // FETCH LOGGED-IN USER PROFILE
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
        throw new Error(data.message || "Unable to load profile");
      }

      setUser(data.user);
    } catch (error) {
      console.error("Profile Error:", error.message);
    }
  }

  // FETCH PARKING SLOTS
  async function fetchSlots() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/slots`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load slots");
      }

      setSlots(data.slots);
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSlots();
    fetchProfile();
  }, []);

  // BOOK PARKING SLOT
  async function bookSlot(slotId) {
    try {
      setProcessing(true);
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/slots/${slotId}/book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vehicleType: vehicle,
            durationHours: Number(durationHours),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Booking failed");
      }

      setMessage(
        `Successfully booked ${slotId}! Total bill: ₹${data.bill.totalAmount}`
      );

      await fetchSlots();
    } catch (error) {
      setMessage(error.message);
      await fetchSlots();
    } finally {
      setProcessing(false);
    }
  }

  // CANCEL PARKING BOOKING
  async function cancelBooking(slotId) {
    try {
      setProcessing(true);
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/slots/${slotId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cancellation failed");
      }

      setMessage(`Booking ${slotId} cancelled successfully!`);

      await fetchSlots();
    } catch (error) {
      setMessage(error.message);
      await fetchSlots();
    } finally {
      setProcessing(false);
    }
  }

  // FILTER CURRENT VEHICLE SLOTS
  const currentSlots = slots.filter(
    (slot) => slot.vehicleType === vehicle
  );

  const availableCount = currentSlots.filter(
    (slot) => slot.status === "Available"
  ).length;

  const reservedCount = currentSlots.filter(
    (slot) => slot.status === "Reserved"
  ).length;

  // AUTOMATIC SLOT ALLOCATION
  function allocateSlot() {
    const availableSlot = currentSlots.find(
      (slot) => slot.status === "Available"
    );

    if (!availableSlot) {
      setMessage("Sorry! No parking slot available.");
      return;
    }

    bookSlot(availableSlot.slotId);
  }

  const selectedRate =
    currentSlots.length > 0
      ? currentSlots[0].pricePerHour
      : 0;

  const estimatedBill =
    selectedRate * Number(durationHours);

  return (
    <div className="parking-app">

      {/* HEADER */}
      <header className="parking-header">
        <div>
          <h1>
            Smart<span>Park</span>
          </h1>
          <p>Smart Parking Management System</p>
        </div>

        {/* DASHBOARD ACTIONS */}
        <div className="dashboard-actions">

          <button onClick={() => navigate("/profile")}>
            My Profile
          </button>

          <button onClick={() => navigate("/my-bookings")}>
            My Bookings
          </button>

          <button onClick={handleLogout}>
            Logout
          </button>

        </div>
      </header>

      <main className="parking-main">

        {/* USER WELCOME */}
        {user && (
          <div className="user-welcome">
            <h2>Welcome, {user.name}! 👋</h2>
            <p>{user.email}</p>
          </div>
        )}

        <h2>Find Your Parking Slot</h2>

        <p className="subtitle">
          Select your vehicle and reserve a parking space.
        </p>

        {/* VEHICLE SELECTION */}
        <div className="vehicle-options">
          {["Car", "Bike", "Bus", "EV"].map((type) => (
            <button
              key={type}
              className={vehicle === type ? "active" : ""}
              onClick={() => {
                setVehicle(type);
                setMessage("");
              }}
            >
              {type === "Car" && "🚗"}
              {type === "Bike" && "🏍️"}
              {type === "Bus" && "🚌"}
              {type === "EV" && "⚡"}
              {" "}{type}
            </button>
          ))}
        </div>

        {/* PARKING DURATION */}
        <div className="duration-section">
          <label htmlFor="durationHours">
            Select Parking Duration
          </label>

          <select
            id="durationHours"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 8, 12, 24].map((hour) => (
              <option key={hour} value={hour}>
                {hour} {hour === 1 ? "Hour" : "Hours"}
              </option>
            ))}
          </select>

          <p>
            Estimated Parking Bill:{" "}
            <strong>₹{estimatedBill}</strong>
          </p>
        </div>

        {/* PARKING SLOTS */}
        {loading ? (
          <p>Loading parking slots from database...</p>
        ) : (
          <>
            {/* PARKING STATISTICS */}
            <div className="parking-stats">
              <div>
                <h3>{currentSlots.length}</h3>
                <p>Total Slots</p>
              </div>

              <div>
                <h3>{availableCount}</h3>
                <p>Available</p>
              </div>

              <div>
                <h3>{reservedCount}</h3>
                <p>Reserved</p>
              </div>
            </div>

            <h3 className="slot-heading">
              {vehicle} Parking Slots
            </h3>

            <div className="slot-container">
              {currentSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className={`slot-card ${slot.status.toLowerCase()}`}
                >
                  <h3>{slot.slotId}</h3>

                  <p>{slot.status}</p>

                  {slot.status === "Available" && (
                    <button
                      disabled={processing}
                      onClick={() => bookSlot(slot.slotId)}
                    >
                      Book Slot
                    </button>
                  )}

                  {slot.status === "Reserved" && (
                    <button
                      disabled={processing}
                      onClick={() => cancelBooking(slot.slotId)}
                    >
                      Cancel Booking
                    </button>
                  )}

                  <p>₹{slot.pricePerHour}/hour</p>
                </div>
              ))}
            </div>

            {/* AUTOMATIC ALLOCATION */}
            <button
              className="allocate-btn"
              disabled={processing}
              onClick={allocateSlot}
            >
              {processing
                ? "Processing..."
                : "Automatically Allocate Parking"}
            </button>
          </>
        )}

        {/* SUCCESS / ERROR MESSAGE */}
        {message && (
          <div className="booking-message">
            {message}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="parking-footer">
        <p>© 2026 SmartPark | Smart Parking Solution</p>
      </footer>

    </div>
  );
}

export default Parking;
