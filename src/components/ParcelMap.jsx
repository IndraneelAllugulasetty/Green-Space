
import { MapContainer, TileLayer, ScaleControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './ParcelMap.css'

function ParcelMap() {
  return (
    <div className="parcel-map-wrapper">
      <MapContainer
        center={[12.2958, 76.6394]}
        zoom={12}
        scrollWheelZoom={true}
        className="parcel-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ScaleControl position="bottomleft" />
      </MapContainer>
    </div>
  )
}

export default ParcelMap
