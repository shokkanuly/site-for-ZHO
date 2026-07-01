import React, { useEffect, useRef, useState } from "react";

// Landmarks in Temirtau for the schematic fallback map
const TEMIRTAU_LANDMARKS = [
  { name: "Мет. комбинат Qarmet", x: 75, y: 35, color: "#FF5252" },
  { name: "Самаркандское вдхр.", x: 25, y: 70, color: "#40C4FF" },
  { name: "Центральный парк", x: 45, y: 50, color: "#00E676" },
  { name: "Акимат города", x: 50, y: 42, color: "#FFD700" },
  { name: "Jasyl El Штаб", x: 35, y: 48, color: "#00E676" }
];

export default function MapWidget({
  latitude,
  longitude,
  onCoordinateSelect,
  readOnly = false,
  markers = []
}) {
  const mapContainerRef = useRef(null);
  const [useFallback, setUseFallback] = useState(true);
  const [fallbackPin, setFallbackPin] = useState(null);

  // Map limits centered on Temirtau
  const minLat = 50.00;
  const maxLat = 50.12;
  const minLng = 72.85;
  const maxLng = 73.08;

  // Converts geographic coordinates to SVG coordinates (0-100%)
  const geoToPercent = (lat, lng) => {
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  // Converts SVG percentages to geographic coordinates
  const percentToGeo = (x, y) => {
    const lat = minLat + ((100 - y) / 100) * (maxLat - minLat);
    const lng = minLng + (x / 100) * (maxLng - minLng);
    return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
  };

  useEffect(() => {
    // Check if Yandex Maps script loaded successfully
    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(() => {
        setUseFallback(false);
        try {
          // Clean container
          if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = "";
          }

          const map = new window.ymaps.Map(mapContainerRef.current, {
            center: [latitude || 50.0633, longitude || 72.9644],
            zoom: 12,
            controls: ["zoomControl"]
          });

          // Add active markers
          if (markers.length > 0) {
            markers.forEach((m) => {
              const placemark = new window.ymaps.Placemark([m.latitude, m.longitude], {
                hintContent: m.title,
                balloonContent: `<strong>${m.title}</strong><br/>${m.address}`
              }, {
                preset: 'islands#greenIcon'
              });
              map.geoObjects.add(placemark);
            });
          } else if (latitude && longitude) {
            const placemark = new window.ymaps.Placemark([latitude, longitude], {
              hintContent: "Выбранная локация",
              balloonContent: "Место сбора волонтеров"
            }, {
              preset: 'islands#redCircleDotIcon'
            });
            map.geoObjects.add(placemark);
          }

          if (!readOnly && onCoordinateSelect) {
            map.events.add("click", (e) => {
              const coords = e.get("coords");
              onCoordinateSelect(coords[0], coords[1]);
              
              // Clear previous inputs
              map.geoObjects.removeAll();
              const newPlacemark = new window.ymaps.Placemark(coords, {
                hintContent: "Выбранная локация"
              }, {
                preset: 'islands#redCircleDotIcon'
              });
              map.geoObjects.add(newPlacemark);
            });
          }
        } catch (err) {
          console.warn("Yandex maps init failed, using schematic map:", err);
          setUseFallback(true);
        }
      });
    } else {
      setUseFallback(true);
    }
  }, [latitude, longitude, markers, readOnly]);

  const handleFallbackClick = (e) => {
    if (readOnly || !onCoordinateSelect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const geo = percentToGeo(x, y);
    setFallbackPin({ x, y });
    onCoordinateSelect(geo.lat, geo.lng);
  };

  // Set default Pin coordinate percentages
  let activePinPercent = null;
  if (latitude && longitude) {
    activePinPercent = geoToPercent(latitude, longitude);
  }

  return (
    <div className="map-widget-container">
      {useFallback ? (
        <div className="map-placeholder-grid" onClick={handleFallbackClick}>
          {/* Grid background lines */}
          <div className="map-ui-overlay">
            <div>Карта Темиртау</div>
            <div style={{ color: "#777" }}>
              {readOnly ? "Акции и точки сбора" : "Точка сбора"}
            </div>
          </div>



          {/* Render markers */}
          {markers.map((m) => {
            const pos = geoToPercent(m.latitude, m.longitude);
            const getPinColor = (cat) => {
              if (cat === "jasyl_el") return "#00897B";
              if (cat === "taza_qazaqstan") return "#4CAF50";
              if (cat === "shanyraq") return "#FFB300";
              if (cat === "zan_men_tartip") return "#1E88E5";
              return "#7E57C2";
            };
            return (
              <div
                key={m.id}
                className="map-pin active"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`,
                  backgroundColor: getPinColor(m.category),
                  borderColor: "#FFFFFF",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                }}
                title={m.title}
              />
            );
          })}

          {/* Render single selection pin */}
          {!readOnly && (fallbackPin || activePinPercent) && (
            <div
              className="map-pin"
              style={{
                left: `${fallbackPin ? fallbackPin.x : activePinPercent?.x}%`,
                top: `${fallbackPin ? fallbackPin.y : activePinPercent?.y}%`,
                backgroundColor: "#00E676"
              }}
            />
          )}

          {/* Single static pin for preview */}
          {readOnly && activePinPercent && markers.length === 0 && (
            <div
              className="map-pin active"
              style={{
                left: `${activePinPercent.x}%`,
                top: `${activePinPercent.y}%`
              }}
            />
          )}
        </div>
      ) : (
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
