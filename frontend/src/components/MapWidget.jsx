import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Landmarks in Temirtau for quick fly-to navigation
const TEMIRTAU_LANDMARKS = [
  { name: "Zhastar Ortalygy", lat: 50.0592, lng: 72.9554, icon: "🏛️" },
  { name: "Парк Самарканд", lat: 50.0645, lng: 72.9698, icon: "🌲" },
  { name: "Самаркандское вдхр.", lat: 50.0812, lng: 72.9815, icon: "🏖️" },
  { name: "Qarmet Комбинат", lat: 50.0498, lng: 72.9660, icon: "🏭" },
];

const getCategoryColor = (cat) => {
  if (cat === "jasyl_el") return "#00897B";
  if (cat === "taza_qazaqstan") return "#4CAF50";
  if (cat === "shanyraq") return "#FFB300";
  if (cat === "zan_men_tartip") return "#1E88E5";
  return "#7E57C2";
};

const getCategoryName = (cat) => {
  if (cat === "jasyl_el") return "Жасыл Ел";
  if (cat === "taza_qazaqstan") return "Таза Қазақстан";
  if (cat === "shanyraq") return "Шаңырақ";
  if (cat === "zan_men_tartip") return "Заң мен Тәртіп";
  return "Волонтерство";
};

// Create SVG Marker Icon for Leaflet
const createPinIcon = (color, isSelected = false) => {
  const size = isSelected ? 36 : 30;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size}">
      <path fill="${color}" stroke="#FFFFFF" stroke-width="1.8" d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z"/>
      <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    className: "leaflet-custom-pin-icon",
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

export default function MapWidget({
  latitude,
  longitude,
  onCoordinateSelect,
  readOnly = false,
  markers = []
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const [activeTileLayer, setActiveTileLayer] = useState("voyager"); // voyager | osm

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Map already initialized

    // Default center on Temirtau
    const initialLat = latitude || (markers.length > 0 ? markers[0].latitude : 50.056523);
    const initialLng = longitude || (markers.length > 0 ? markers[0].longitude : 72.983299);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Modern CartoDB Voyager style (clean, minimalist)
    const tileLayerVoyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }
    );

    tileLayerVoyager.addTo(map);
    mapInstanceRef.current = map;

    // Feature group for markers
    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Map click handler for selecting coordinates
    map.on("click", (e) => {
      if (readOnly || !onCoordinateSelect) return;
      const { lat, lng } = e.latlng;
      onCoordinateSelect(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when user toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (activeTileLayer === "osm") {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
    } else {
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
    }
  }, [activeTileLayer]);

  // Update Markers & Selection Pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Render array of markers (Events)
    if (markers.length > 0) {
      const bounds = [];
      markers.forEach((m) => {
        if (!m.latitude || !m.longitude) return;
        const color = getCategoryColor(m.category);
        const catName = getCategoryName(m.category);
        const icon = createPinIcon(color);

        const marker = L.marker([m.latitude, m.longitude], { icon });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 180px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: ${color}20; color: ${color}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; border: 1px solid ${color}40;">
                ${catName}
              </span>
              ${m.points_reward ? `<span style="font-size: 11px; font-weight: 700; color: #10B981;">+${m.points_reward} балов</span>` : ""}
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1E293B;">${m.title || "Акция"}</h4>
            ${m.address ? `<p style="margin: 0; font-size: 11px; color: #64748B;">📍 ${m.address}</p>` : ""}
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroup.addLayer(marker);
        bounds.push([m.latitude, m.longitude]);
      });

      // Fit map bounds if multiple markers exist and no single marker selected
      if (bounds.length > 1 && !latitude) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }

    // 2. Render Single Selected Pin (if provided)
    if (latitude && longitude) {
      const selectedIcon = createPinIcon("#00E676", true);
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setLatLng([latitude, longitude]);
      } else {
        const selMarker = L.marker([latitude, longitude], { icon: selectedIcon });
        selMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <strong style="color: #00897B; font-size: 12px;">📍 Точка сбора / Локация</strong>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${latitude.toFixed(5)}, ${longitude.toFixed(5)}</div>
          </div>
        `);
        selectionMarkerRef.current = selMarker;
        markersGroup.addLayer(selMarker);
      }
      map.panTo([latitude, longitude]);
    }
  }, [markers, latitude, longitude]);

  const handleFlyTo = (lat, lng) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    if (!readOnly && onCoordinateSelect) {
      onCoordinateSelect(lat, lng);
    }
  };

  return (
    <div className="real-map-widget-wrapper" style={{ position: "relative", width: "100%", height: "100%", minHeight: "320px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)" }}>
      {/* Real Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "320px", zIndex: 1 }} />

      {/* Top Header Controls Overlay */}
      <div className="map-top-bar-overlay" style={{ position: "absolute", top: "10px", left: "10px", right: "10px", zIndex: 10, display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
        {/* Title badge */}
        <div style={{ background: "rgba(255, 255, 255, 0.92)", backdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#0F172A", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", pointerEvents: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }}></span>
          <span>Карта Темиртау (2GIS / OSM)</span>
        </div>

        {/* Style selector */}
        <div style={{ background: "rgba(255, 255, 255, 0.92)", backdropFilter: "blur(8px)", padding: "3px", borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", pointerEvents: "auto", display: "flex", gap: "2px" }}>
          <button
            type="button"
            onClick={() => setActiveTileLayer("voyager")}
            style={{ border: "none", background: activeTileLayer === "voyager" ? "#0F172A" : "transparent", color: activeTileLayer === "voyager" ? "#FFF" : "#475569", padding: "4px 10px", borderRadius: "16px", fontSize: "11px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
          >
            Светлая
          </button>
          <button
            type="button"
            onClick={() => setActiveTileLayer("osm")}
            style={{ border: "none", background: activeTileLayer === "osm" ? "#0F172A" : "transparent", color: activeTileLayer === "osm" ? "#FFF" : "#475569", padding: "4px 10px", borderRadius: "16px", fontSize: "11px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
          >
            OpenStreetMap
          </button>
        </div>
      </div>

      {/* Fast Landmark Nav Overlay (Bottom-left) */}
      <div className="map-landmarks-overlay" style={{ position: "absolute", bottom: "10px", left: "10px", zIndex: 10, display: "flex", gap: "4px", flexWrap: "wrap", pointerEvents: "auto" }}>
        {TEMIRTAU_LANDMARKS.map((lm) => (
          <button
            key={lm.name}
            type="button"
            onClick={() => handleFlyTo(lm.lat, lm.lng)}
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(6px)",
              color: "#334155",
              padding: "4px 8px",
              borderRadius: "14px",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#0F172A";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.9)";
              e.currentTarget.style.color = "#334155";
            }}
          >
            {lm.icon} {lm.name}
          </button>
        ))}
      </div>
    </div>
  );
}
