mapboxgl.accessToken =
  "pk.eyJ1IjoiY2twbGVpc2VyIiwiYSI6ImNqemI5ZzNiMjAyZ2czbW8xeHB3ZXN1emcifQ.L_-vpGP-Qe1WmKcFBwOTGA"
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v9",
  center: [-98, 38.88],
  maxZoom: 5,
  minZoom: 1,
  zoom: 3
})

var airports = []

var popup = new mapboxgl.Popup({
  closeButton: false
})

var filterEl = document.getElementById("feature-filter")
var listingEl = document.getElementById("feature-listing")

function renderListings(features) {
  listingEl.innerHTML = ""
  if (features.length) {
    features.forEach(function(feature) {
      var prop = feature.properties
      var item = document.createElement("a")
      item.href = prop.wikipedia
      item.target = "_blank"
      item.textContent = prop.name + " (" + prop.abbrev + ")"
      item.addEventListener("mouseover", function() {
        popup
          .setLngLat(feature.geometry.coordinates)
          .setText(
            feature.properties.name +
              " (" +
              feature.properties.abbrev +
              ")"
          )
          .addTo(map)
      })
      listingEl.appendChild(item)
    })
    filterEl.parentNode.style.display = "block"
  } else {
    var empty = document.createElement("p")
    empty.textContent = "Drag the map to populate results"
    listingEl.appendChild(empty)

    filterEl.parentNode.style.display = "none"

    map.setFilter("airport", ["has", "abbrev"])
  }
}

function normalize(string) {
  return string.trim().toLowerCase()
}

function getUniqueFeatures(array, comparatorProperty) {
  var existingFeatureKeys = {}
  // Because features come from tiled vector data, feature geometries may be split
  // or duplicated across tile boundaries and, as a result, features may appear
  // multiple times in query results.
  var uniqueFeatures = array.filter(function(el) {
    if (existingFeatureKeys[el.properties[comparatorProperty]]) {
      return false
    } else {
      existingFeatureKeys[el.properties[comparatorProperty]] = true
      return true
    }
  })

  return uniqueFeatures
}

map.on("load", function() {
  map.addLayer({
    id: "airport",
    source: {
      type: "vector",
      url: "mapbox://mapbox.04w69w5j"
    },
    "source-layer": "ne_10m_airports",
    type: "symbol",
    layout: {
      "icon-image": "airport-15",
      "icon-padding": 0,
      "icon-allow-overlap": true
    }
  })

  map.on("moveend", function() {
    var features = map.queryRenderedFeatures({ layers: ["airport"] })

    if (features) {
      var uniqueFeatures = getUniqueFeatures(features, "iata_code")
      // Populate features for the listing overlay.
      renderListings(uniqueFeatures)

      // Clear the input container
      filterEl.value = ""

      // Store the current features in sn `airports` variable to
      // later use for filtering on `keyup`.
      airports = uniqueFeatures
    }
  })

  map.on("mousemove", "airport", function(e) {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "pointer"

    // Populate the popup and set its coordinates based on the feature.
    var feature = e.features[0]
    popup
      .setLngLat(feature.geometry.coordinates)
      .setText(
        feature.properties.name + " (" + feature.properties.abbrev + ")"
      )
      .addTo(map)
  })

  map.on("mouseleave", "airport", function() {
    map.getCanvas().style.cursor = ""
    popup.remove()
  })

  filterEl.addEventListener("keyup", function(e) {
    var value = normalize(e.target.value)

    // Filter visible features that don't match the input value.
    var filtered = airports.filter(function(feature) {
      var name = normalize(feature.properties.name)
      var code = normalize(feature.properties.abbrev)
      return name.indexOf(value) > -1 || code.indexOf(value) > -1
    })

    // Populate the sidebar with filtered results
    renderListings(filtered)

    // Set the filter to populate features into the layer.
    map.setFilter("airport", [
      "match",
      ["get", "abbrev"],
      filtered.map(function(feature) {
        return feature.properties.abbrev
      }),
      true,
      false
    ])
  })

  renderListings([])
})
