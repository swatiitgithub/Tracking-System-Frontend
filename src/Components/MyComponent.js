import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import { io } from "socket.io-client";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import markerIcon from "../Images/Gps (2).png"; // Replace with your marker icon path

delete L.Icon.Default.prototype._getIconUrl;

const CustomIcon = new L.Icon({
  iconUrl: markerIcon,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Change backend URL here to your hosted backend on Render
const socket = io("https://real-time-tracking-system-8dra.onrender.com");

const MapComponent = () => {
  const [users, setUsers] = useState({});
  const [towers, setTowers] = useState([]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Sending location: ${latitude}, ${longitude}`);
          socket.emit("client_location_send", { latitude, longitude });

          try {
            const response = await fetch(
              `https://real-time-tracking-system-8dra.onrender.com/towers?latitude=${latitude}&longitude=${longitude}`
            );
            const data = await response.json();
            setTowers(data.cells || []);
          } catch (error) {
            console.error("Error fetching tower data:", error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true, timeout: 1000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    socket.on("update-users", (data) => {
      console.log("Received user data:", data);
      setUsers((prevUsers) => ({ ...prevUsers, [data.id]: data }));
    });

    socket.on("user-disconnected", (id) => {
      console.log(`User disconnected: ${id}`);
      setUsers((prevUsers) => {
        const updatedUsers = { ...prevUsers };
        delete updatedUsers[id];
        return updatedUsers;
      });
    });

    return () => {
      socket.off("update-users");
      socket.off("user-disconnected");
    };
  }, []);

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <MapContainer center={[20, 78]} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        {Object.keys(users).map((id) => (
          <Marker
            key={id}
            position={[users[id].latitude, users[id].longitude]}
            icon={CustomIcon}
          >
            <Popup>
              <div>
                <b>User ID:</b> {id}
                <br />
                <b>Lat:</b> {users[id].latitude.toFixed(4)}
                <br />
                <b>Lon:</b> {users[id].longitude.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        ))}
        {towers.map((tower, index) => (
          <Circle
            key={index}
            center={[tower.lat, tower.lon]}
            radius={200} // Radius in meters
            pathOptions={{ color: "red" }}
          >
            <Popup>
              <b>Cell Tower</b>
              <br />
              Lat: {tower.lat}
              <br />
              Lon: {tower.lon}
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
