import React, { useEffect, useState, useRef } from 'react';
import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'
import './App.css';
import '@tomtom-international/web-sdk-maps/dist/maps.css'
const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({})

  const [lng, setLng] = useState(75.038711)
  const [lat, setLat] = useState(15.428141)


  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }

    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': 'red',
        'line-width': 6
      }
    })
  }


  const addDeliveryMarker = (lngLat, map) => {

    const element = document.createElement('div')
    element.className = "marker-delivery"

    const popupOffset = {
      bottom: [0, -25]
    }
    const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is you!')

    new tt.Marker({
      element: element
    })
      .setLngLat(lngLat)
      .addTo(map)
      .setPopup(popup).togglePopup()


  }

  useEffect(() => {
    const destinations = []


    const origin = {
      lng: lng,
      lat: lat
    }

    let map = tt.map({
      key: process.env.REACT_APP_MAP_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true
      },
      center: [lng, lat],
      zoom: 14
    })
    setMap(map)

    const addMarker = () => {

      const popupOffset = {
        bottom: [0, -25]
      }
      const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is you!')

      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element
      })
        .setLngLat([lng, lat])
        .addTo(map)

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLng(lngLat.lng)
        setLat(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()
    }
    addMarker()

    const sortedDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)
      })

      console.log(pointsForDestinations)

      const callParameters = {
        key: process.env.REACT_APP_MAP_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)]
      }
      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0]

            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingtime: result.response.routeSummary.travelTimeInSeconds
              }

            })
            resultsArray.sort((a, b) => {
              return a.drivingtime - b.drivingtime
            })
            const sortedLocations = resultsArray.map((result) => {
              return result.location
            })

            resolve(sortedLocations)
          })

      })
    }

    //function to recalculate routes

    const recalculateRoutes = () => {
      sortedDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_MAP_KEY,
            locations: sorted
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
          })
      })
    }



    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDeliveryMarker(e.lngLat, map)
      recalculateRoutes()
    })

    return () => map.remove()
  }, [lng, lat])

  return (
    <>

      {map && <div className="App">
        <div ref={mapElement} className="map" />
        <div className="search_bar">
          <h1>Where to?</h1>
          <input
            type="text"
            id="longitude"
            className="longitude"
            placeholder="Put in Longitude"
            onChange={(e) => { setLng(e.target.value) }}
          />
          <input
            type="text"
            id="latitude"
            className="latitude"
            placeholder="Put in Latitude"
            onChange={(e) => { setLat(e.target.value) }}
          />
        </div>
      </div>
      }
    </>
  );
}

export default App;
