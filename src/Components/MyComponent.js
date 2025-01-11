import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { io } from "socket.io-client";
import L from "leaflet";
import 'leaflet/dist/leaflet.css'; 
import markerIcon from '../Images/Gps (2).png'; 

delete L.Icon.Default.prototype._getIconUrl;

const CustomIcon = new L.Icon({
  iconUrl: markerIcon, 
  iconSize: [32, 32], 
  iconAnchor: [16, 32], 
  popupAnchor: [0, -32], 
});

const socket = io("http://localhost:4000");

const MapComponent = () => {
  const [users, setUsers] = useState({}); 

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          socket.emit("client_location_send", { latitude, longitude });
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
      setUsers((prevUsers) => ({ ...prevUsers, [data.id]: data })); 
    });

    socket.on("user-disconnected", (id) => {
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
        
        {/* Display users (the current position of clients) */}
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
        
        {/* Display nearby towers for each user */}
        {Object.keys(users).map((id) => (
          users[id].towers && users[id].towers.map((tower, index) => (
            <Marker
              key={`tower-${index}-${id}`}
              position={[tower.latitude, tower.longitude]}
              icon={CustomIcon} 
            >
              <Popup>
                <div>
                  <b>{tower.name}</b>
                  <br />
                  <b>Lat:</b> {tower.latitude.toFixed(4)}
                  <br />
                  <b>Lon:</b> {tower.longitude.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          ))
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
