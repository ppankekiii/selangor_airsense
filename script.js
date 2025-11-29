mapboxgl.accessToken = "pk.eyJ1IjoicHBhbmtla2tpaSIsImEiOiJjbWlpcGM4ZTAwaGFlM2JkdmNpYjZ2In0.VZqUL5H9Lt2tob_PMncp4Q";

/* -------- Date & Time -------- */
function updateDateTime() {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const formattedDate = now.toLocaleDateString("en-MY", options);
    const formattedTime = now.toLocaleTimeString("en-MY");
    document.getElementById("datetime").innerHTML = `${formattedDate} | ${formattedTime}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* -------- Symptom Checker -------- */
document.getElementById("checkHealthBtn").addEventListener("click", () => {
    const symptoms = document.querySelectorAll(".symptom:checked");
    const alertBox = document.getElementById("alertBox");
    if (symptoms.length >= 1) {
        alertBox.style.display = "block";
        alertBox.scrollIntoView({ behavior: "smooth" });
    } else {
        alertBox.style.display = "none";
        alert("Please select at least one symptom.");
    }
});

/* -------- Mapbox -------- */
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12', // colorful base
    center: [101.5, 3.05],
    zoom: 9
});

map.on("load", () => {
    Promise.all([
        fetch("selangor_district.geojson").then(r => r.json()),
        fetch("data.json").then(r => r.json())
    ])
    .then(([geoData, pmData]) => {

        geoData.features.forEach(f => {
            const district = f.properties.district_name || f.properties.name;
            f.properties.pm25 = pmData[district] || 0;
        });

        map.addSource("selangor", { type: "geojson", data: geoData });

        // Fill layer
        map.addLayer({
            id: "selangor-layer",
            type: "fill",
            source: "selangor",
            paint: {
                "fill-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "pm25"],
                    0, "#00e676",      // green = good
                    50, "#ffeb3b",     // yellow = moderate
                    100, "#ff9800",    // orange = unhealthy for sensitive
                    150, "#f44336"     // red = unhealthy
                ],
                "fill-opacity": 0.9
            }
        });

        // Border lines
        map.addLayer({
            id: "selangor-outline",
            type: "line",
            source: "selangor",
            paint: {
                "line-color": "#ffffff",
                "line-width": 2
            }
        });

        // Popup on click
        map.on("click", "selangor-layer", (e) => {
            const name = e.features[0].properties.district_name || e.features[0].properties.name;
            const pm = e.features[0].properties.pm25;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`<b>${name}</b><br>PM2.5: ${pm}`)
                .addTo(map);
        });

        map.on("mouseenter", "selangor-layer", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "selangor-layer", () => map.getCanvas().style.cursor = "");

        /* -------- Legend -------- */
        const legend = document.createElement("div");
        legend.id = "legend";
        legend.style.position = "absolute";
        legend.style.bottom = "30px";
        legend.style.left = "10px";
        legend.style.background = "white";
        legend.style.padding = "10px";
        legend.style.borderRadius = "8px";
        legend.style.fontSize = "14px";
        legend.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
        legend.innerHTML = `
            <b>PM2.5 Levels</b><br>
            <span style="background:#00e676;width:15px;height:15px;display:inline-block;margin-right:5px;"></span> 0-50 Good<br>
            <span style="background:#ffeb3b;width:15px;height:15px;display:inline-block;margin-right:5px;"></span> 51-100 Moderate<br>
            <span style="background:#ff9800;width:15px;height:15px;display:inline-block;margin-right:5px;"></span> 101-150 Unhealthy<br>
            <span style="background:#f44336;width:15px;height:15px;display:inline-block;margin-right:5px;"></span> 151+ Very Unhealthy
        `;
        map.getContainer().appendChild(legend);
    })
    .catch(err => console.log("Error loading files:", err));
});
