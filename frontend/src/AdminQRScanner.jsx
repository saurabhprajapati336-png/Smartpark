
import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

function AdminQRScanner({ token, onEntryConfirmed }) {
  const scannerRef = useRef(null);
  const scanStartedRef = useRef(false);

  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // VERIFY SCANNED QR TOKEN
  async function verifyQR(qrToken) {
    try {
      setVerifying(true);
      setError("");
      setMessage("");
      setBooking(null);

      const response = await fetch(
        "http://localhost:5000/api/admin/bookings/verify-qr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qrToken }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "QR verification failed.");
      }

      setBooking(data.booking);
      setMessage(data.message);

    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  // CONFIRM PARKING ENTRY
  async function confirmEntry() {
    if (!booking?._id) return;

    const confirmed = window.confirm(
      `Confirm entry for parking slot ${booking.slotId}?`
    );

    if (!confirmed) return;

    try {
      setConfirming(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `http://localhost:5000/api/admin/bookings/${booking._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "Occupied",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to confirm entry.");
      }

      setBooking((previous) => ({
        ...previous,
        status: "Occupied",
      }));

      setMessage("Parking entry confirmed successfully!");

      if (onEntryConfirmed) {
        await onEntryConfirmed();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  // INITIALIZE QR CAMERA SCANNER
  useEffect(() => {
    if (scanStartedRef.current) return;

    scanStartedRef.current = true;

    const scanner = new Html5QrcodeScanner(
      "smartpark-qr-reader",
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250,
        },
        rememberLastUsedCamera: true,
      },
      false
    );

    scannerRef.current = scanner;

    let scanHandled = false;

    scanner.render(
      async (decodedText) => {
        if (scanHandled) return;

        scanHandled = true;

        try {
          await scanner.clear();
          scannerRef.current = null;
          await verifyQR(decodedText);
        } catch (err) {
          setError("Unable to process QR scan. Please try again.");
          scanHandled = false;
        }
      },
      () => {
        // Normal camera scanning messages are ignored.
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch(() => {});

        scannerRef.current = null;
      }

      scanStartedRef.current = false;
    };
  }, []);

  // RESET SCANNER FOR NEXT QR
  async function scanNextQR() {
    setBooking(null);
    setMessage("");
    setError("");

    window.location.reload();
  }

  return (
    <section className="admin-section admin-qr-section">

      <h2>Parking QR Scanner</h2>

      <p>
        Scan the customer's SmartPark booking QR code
        to verify parking entry.
      </p>

      {!booking && (
        <div id="smartpark-qr-reader"></div>
      )}

      {verifying && (
        <p>Verifying QR Code...</p>
      )}

      {message && (
        <div className="admin-success">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {booking && (
        <div className="qr-booking-result">

          <h3>Verified Booking Details</h3>

          <p>
            <strong>Booking ID:</strong> {booking._id}
          </p>

          <p>
            <strong>Customer:</strong> {booking.customerName}
          </p>

          <p>
            <strong>Email:</strong> {booking.customerEmail}
          </p>

          <p>
            <strong>Parking Slot:</strong> {booking.slotId}
          </p>

          <p>
            <strong>Vehicle:</strong> {booking.vehicleType}
          </p>

          <p>
            <strong>Duration:</strong> {booking.durationHours} Hours
          </p>

          <p>
            <strong>Amount:</strong> ₹{booking.totalAmount}
          </p>

          <p>
            <strong>Status:</strong> {booking.status}
          </p>

          {booking.status === "Reserved" && (
            <button
              type="button"
              onClick={confirmEntry}
              disabled={confirming}
            >
              {confirming ? "Confirming..." : "Confirm Entry"}
            </button>
          )}

          {booking.status === "Occupied" && (
            <p>Vehicle entry has already been confirmed.</p>
          )}

          <button
            type="button"
            onClick={scanNextQR}
          >
            Scan Next QR
          </button>

        </div>
      )}

    </section>
  );
}

export default AdminQRScanner;
