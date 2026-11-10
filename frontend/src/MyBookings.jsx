
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./App.css";

function MyBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

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

  // FETCH ALL USER BOOKINGS
  async function fetchBookings() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/parking/my-bookings",
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
        throw new Error(data.message || "Unable to load bookings.");
      }

      setBookings(data.bookings || []);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  // CANCEL RESERVED BOOKING
  async function cancelBooking(slotId) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/parking/slots/${slotId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cancellation failed.");
      }

      setMessage("Booking cancelled successfully!");

      await fetchBookings();
    } catch (error) {
      setError(error.message);
    }
  }

  // DOWNLOAD QR CODE
  function downloadQR(booking, canvasId) {
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
      alert("QR Code not found!");
      return;
    }

    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = image;
    link.download = `SmartPark-${booking.slotId}-QR.png`;

    link.click();
  }

  // PRINT / SAVE RECEIPT AS PDF
  function printReceipt() {
    window.print();
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="parking-app">

      {/* HEADER */}
      <header className="parking-header no-print">
        <div>
          <h1>
            Smart<span>Park</span>
          </h1>
          <p>My Bookings & History</p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="parking-main no-print">

        <h2>My Parking Bookings</h2>

        <p className="subtitle">
          View all your current and previous parking bookings.
        </p>

        <p>
          <Link to="/parking">
            ← Back to Parking Dashboard
          </Link>
        </p>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="booking-message">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="booking-message">
            {error}
          </div>
        )}

        {/* BOOKING HISTORY */}
        {loading ? (
          <p>Loading your booking history...</p>
        ) : bookings.length === 0 ? (
          <p>You have no booking history yet.</p>
        ) : (
          <>
            <h3>
              Total Booking Records: {bookings.length}
            </h3>

            <div className="slot-container">

              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className={`slot-card ${String(
                    booking.status || ""
                  ).toLowerCase()}`}
                >

                  <h3>
                    Slot: {booking.slotId}
                  </h3>

                  <p>
                    Vehicle: {booking.vehicleType}
                  </p>

                  <p>
                    Booking Date: {formatDate(booking.bookingDate)}
                  </p>

                  <p>
                    Duration: {booking.durationHours} hours
                  </p>

                  <p>
                    Rate: ₹{booking.pricePerHour}/hour
                  </p>

                  <h3>
                    Total Bill: ₹{booking.totalAmount}
                  </h3>

                  <p>
                    Status: <strong>{booking.status}</strong>
                  </p>

                  {/* USER BOOKING QR CODE */}
                  {booking.qrToken ? (
                    <div className="booking-qr-section">
                      <h3>Parking Entry QR Code</h3>

                      <QRCodeCanvas
                        id={`booking-qr-${booking._id}`}
                        value={booking.qrToken}
                        size={180}
                        level="H"
                        includeMargin={true}
                      />

                      <p>
                        Show this QR code at the parking entry.
                      </p>

                      <button
                        className="download-qr-btn"
                        onClick={() =>
                          downloadQR(
                            booking,
                            `booking-qr-${booking._id}`
                          )
                        }
                      >
                        Download QR Code
                      </button>
                    </div>
                  ) : (
                    <p>
                      QR Code is not available for this booking yet.
                      Please refresh the page.
                    </p>
                  )}

                  {/* VIEW RECEIPT BUTTON */}
                  <button
                    className="receipt-btn"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    View Receipt
                  </button>

                  {/* CANCEL BUTTON */}
                  {booking.status === "Reserved" && (
                    <button
                      onClick={() => cancelBooking(booking.slotId)}
                    >
                      Cancel Booking
                    </button>
                  )}

                  {/* COMPLETED STATUS */}
                  {booking.status === "Completed" && (
                    <p>Parking completed successfully.</p>
                  )}

                  {/* CANCELLED STATUS */}
                  {booking.status === "Cancelled" && (
                    <p>This booking was cancelled.</p>
                  )}

                  {/* OCCUPIED STATUS */}
                  {booking.status === "Occupied" && (
                    <p>Your vehicle is currently parked.</p>
                  )}

                </div>
              ))}

            </div>
          </>
        )}

      </main>

      {/* BOOKING RECEIPT MODAL */}
      {selectedBooking && (
        <div className="receipt-overlay">

          <div className="receipt-container">

            <div className="receipt-header">
              <h2>
                Smart<span>Park</span>
              </h2>

              <p>Parking Booking Receipt</p>

              <strong className="receipt-status">
                {selectedBooking.status}
              </strong>
            </div>

            <hr />

            <div className="receipt-details">

              <p>
                <strong>Booking ID:</strong>
                <span>{selectedBooking._id}</span>
              </p>

              <p>
                <strong>Parking Slot:</strong>
                <span>{selectedBooking.slotId}</span>
              </p>

              <p>
                <strong>Vehicle Type:</strong>
                <span>{selectedBooking.vehicleType}</span>
              </p>

              <p>
                <strong>Booking Date:</strong>
                <span>{formatDate(selectedBooking.bookingDate)}</span>
              </p>

              <p>
                <strong>Duration:</strong>
                <span>{selectedBooking.durationHours} Hours</span>
              </p>

              <p>
                <strong>Price Per Hour:</strong>
                <span>₹{selectedBooking.pricePerHour}</span>
              </p>

              <p>
                <strong>Booking Status:</strong>
                <span>{selectedBooking.status}</span>
              </p>

            </div>

            <hr />

            <div className="receipt-total">
              <strong>Total Amount</strong>
              <h2>₹{selectedBooking.totalAmount}</h2>
            </div>

            {/* RECEIPT QR CODE */}
            {selectedBooking.qrToken ? (
              <div className="booking-qr-section">
                <h3>Parking Entry QR Code</h3>

                <QRCodeCanvas
                  id={`receipt-qr-${selectedBooking._id}`}
                  value={selectedBooking.qrToken}
                  size={200}
                  level="H"
                  includeMargin={true}
                />

                <p>
                  Show this QR code at the parking entry.
                </p>

                <button
                  className="download-qr-btn no-print"
                  onClick={() =>
                    downloadQR(
                      selectedBooking,
                      `receipt-qr-${selectedBooking._id}`
                    )
                  }
                >
                  Download QR Code
                </button>
              </div>
            ) : (
              <p>
                QR Code is not available for this booking yet.
              </p>
            )}

            <p className="receipt-thankyou">
              Thank you for choosing SmartPark!
            </p>

            {/* RECEIPT ACTIONS */}
            <div className="receipt-actions no-print">

              <button
                className="print-receipt-btn"
                onClick={printReceipt}
              >
                Print / Save PDF
              </button>

              <button
                className="close-receipt-btn"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* FOOTER */}
      <footer className="parking-footer no-print">
        <p>© 2026 SmartPark | Smart Parking Solution</p>
      </footer>

    </div>
  );
}

export default MyBookings;
