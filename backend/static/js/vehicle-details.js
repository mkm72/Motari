console.log("VEHICLE-DETAILS.JS LOADED!");

// GET VEHICLE ID
const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");

console.log("Vehicle ID =", vehicleId);

// Fetch vehicle details
async function fetch_vehicle_details() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    document.getElementById("vehicle-title").textContent =
      `${data.manufacturer} ${data.model}`;
    document.getElementById("vehicle-plate").textContent = data.license_plate;

    document.getElementById("vehicle-details").innerHTML = `
      Make: ${data.manufacturer}<br>
      Model: ${data.model}<br>
      Year: ${data.year}<br>
      Color: ${data.color || "-"}<br>
      VIN: ${data.vin || "-"}<br>
      Initial Mileage: ${data.initial_mileage} km<br>
      Current Mileage: ${data.current_mileage} km
    `;

    // Load vehicle image
    const img = document.getElementById("vehicle-img");
    img.src = data.image_path
      ? `/static/uploads/${data.image_path}`
      : "../static/img/car-interior.jpg";

    fetch_predictions();
    fetch_service_history();

  } catch (err) {
    console.error("Error loading details:", err);
  }
}

// Fetch Service History
async function fetch_service_history() {
  const container = document.getElementById("service-history");

  try {
    const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/services`,
      { credentials: "include" });

    const history = await res.json();
    container.innerHTML = "";

    if (!history.length) {
      container.innerHTML = "<p>No service records yet.</p>";
      return;
    }

    history.forEach(rec => {
      container.innerHTML += `
        <div class="service-item">
          <div>${rec.service_date}</div>
          <div>${rec.service_type} @ ${rec.mileage_at_service} km</div>
          <div>Notes: ${rec.notes}</div>
        </div>
      `;
    });

  } catch {
    container.innerHTML = "<p>Error loading history.</p>";
  }
}

// Fetch Predictions
async function fetch_predictions() {
  const box = document.getElementById("predictions-box");
  box.innerHTML = "<p>Loading predictions...</p>";

  try {
    const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/predictions`, {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!data.length) {
      box.innerHTML = "<p>No predictions available.</p>";
      return;
    }

    box.innerHTML = "";

    data.forEach(p => {
      box.innerHTML += `
        <div class="prediction-card">
          <div class="prediction-title">${p.maintenance_type.replace("_", " ")}</div>
          <div class="prediction-info">
            Predicted Date: ${new Date(p.predicted_date).toLocaleDateString()}<br>
            Predicted Mileage: ${p.predicted_mileage} km
          </div>
          <div class="prediction-confidence">
            Confidence: ${(p.confidence_level * 100).toFixed(0)}%
          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error("Prediction Error:", err);
    box.innerHTML = "<p>Error loading predictions.</p>";
  }
}


// Toggle fields
document.addEventListener("change", e => {
  if (e.target.id === "service-type") {
    document.getElementById("other-notes-group").style.display =
      e.target.value === "other" ? "block" : "none";
  }

  if (e.target.id === "mileage-options") {
    const input = document.getElementById("service-mileage");
    input.style.display =
      e.target.value === "manual" ? "block" : "none";
  }
});

// Add Service Record
async function handle_add_service_record(e) {
  e.preventDefault();

  const date = document.getElementById("service-date").value;
  const type = document.getElementById("service-type").value;
  const notes = type === "other"
    ? document.getElementById("service-notes").value
    : type;

  let mileageOption = document.getElementById("mileage-options").value;
  let mileage =
    mileageOption === "manual"
      ? Number(document.getElementById("service-mileage").value)
      : Number(mileageOption);

  // Add service
  await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/services`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_type: type,
      service_date: date,
      mileage_at_service: mileage,
      notes
    })
  });

  // Update mileage
  await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/mileage`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_mileage: mileage })
  });

  document.getElementById("service-form").reset();
  fetch_vehicle_details();
}

// Delete Vehicle
async function deleteVehicle() {
  if (!confirm("Delete this vehicle?")) return;

  const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (res.ok) {
    alert("Vehicle deleted.");
    window.location.href = "/dashboard";
  } else {
    alert("Failed to delete.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetch_vehicle_details();

  document
    .getElementById("service-form")
    .addEventListener("submit", handle_add_service_record);

  document
    .getElementById("delete-vehicle-btn")
    .addEventListener("click", deleteVehicle);
});
