let map, directionsService, directionsRenderer;
let userLocation, eventLocation;

function geocodeAddress(geocoder, address, callback) {
  geocoder.geocode({ address: address }, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      console.log(
        "Konum:",
        address,
        "Koordinatlar:",
        results[0].geometry.location
      );
      callback(results[0].geometry.location);
    } else {
      console.error("Geocode hatası:", status, "Adres:", address);
      alert("Geocode hatası: " + status);
    }
  });
}

function initMap() {
  const geocoder = new google.maps.Geocoder();

  const userKonum = window.userKonum;
  const eventKonum = window.eventKonum;

  geocodeAddress(geocoder, userKonum, function (userLoc) {
    userLocation = userLoc;
    geocodeAddress(geocoder, eventKonum, function (eventLoc) {
      eventLocation = eventLoc;

      map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: userLocation,
      });

      new google.maps.Marker({
        position: userLocation,
        map: map,
        title: "Kullanıcı Konumu",
      });

      new google.maps.Marker({
        position: eventLocation,
        map: map,
        title: "Etkinlik Konumu",
      });

      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer();
      directionsRenderer.setMap(map);

      drawRoute(google.maps.TravelMode.DRIVING);
    });
  });
}

function drawRoute(travelMode) {
  const request = {
    origin: userLocation,
    destination: eventLocation,
    travelMode: travelMode,
  };

  directionsService.route(request, function (result, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);

      const routeLeg = result.routes[0].legs[0];
      const distance = routeLeg.distance.text;
      const duration = routeLeg.duration.text;

      const mapInfo = document.getElementById("map-info");
      mapInfo.innerHTML = `Mesafe: ${distance} <br> Süre: ${duration}`;
    } else {
      console.error("Rota çizilemedi:", status);

      if (status === google.maps.DirectionsStatus.NOT_FOUND) {
        alert("Bisiklet rotası bu bölge için mevcut değil.");
      } else {
        alert("Rota çizilirken bir hata oluştu: " + status);
      }
    }
  });
}

document.getElementById("walkButton").addEventListener("click", function () {
  drawRoute(google.maps.TravelMode.WALKING);
});

document.getElementById("driveButton").addEventListener("click", function () {
  drawRoute(google.maps.TravelMode.DRIVING);
});
