
import ParcelMap from './components/ParcelMap'
import './GISPage.css'

function GISPage() {
  return (
    <main className="gis-page">
      <header className="gis-header">
        <div>
          <h1>Project Green</h1>
          <p>Land Information & GIS Visualization</p>
        </div>

        <span className="gis-status">
          GIS Module
        </span>
      </header>

      <section className="gis-content">
        <div className="gis-title">
          <div>
            <h2>Geographical Parcel Explorer</h2>
            <p>
              Explore geographical locations and land parcels.
            </p>
          </div>
        </div>

        <ParcelMap />
        
        <p className="map-attribution">
          Map data © OpenStreetMap contributors
        </p>
      </section>
    </main>
  )
}

export default GISPage
