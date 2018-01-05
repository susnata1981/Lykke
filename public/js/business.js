let businessEntry = {
  COUNTRY_CODE: 'IN',
  map: undefined,
  infowindow: undefined,
  markers: [],
  businessList: {},

  currPlace: {
    address: '',
    lat: undefined,
    lng: undefined,
    isValid: () => {
      return businessEntry.currPlace.address.length > 0 && businessEntry.currPlace.lat && businessEntry.currPlace.lng;
    }
  },

  setCurrentPlace: (address, lat, lng) => {
    businessEntry.currPlace.address = address;
    businessEntry.currPlace.lat = lat;
    businessEntry.currPlace.lng = lng;
  },

  load_library: (url, callback) => {
    $.ajax({
      url: url,
      dataType: "script",
      async: false,           // <-- This is the key
      success: function () {
        // businessEntry.initMap();
        if (callback) {
          callback();
        }
      },
      error: function () {
        console.log('failed to load places library ' + url);
        throw new Error("Could not load script " + script);
      }
    });
  },

  initialize: () => {
    businessEntry.load_library('https://maps.googleapis.com/maps/api/js?key=AIzaSyCMfCSDvfdv4v-PJSMJK6CLTukTCxgEfP4&libraries=places',
      () => { businessEntry.initMap() });
    businessEntry.load_library('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore.js');
    businessEntry.setup_listeners();
  },

  setup_listeners: () => {
    // Add listener for business listing.
    var businessRef = firebase.database().ref('/businesses');
    businessRef.on('value', (snapshot) => {
      businessEntry.businessList = {};
      snapshot.forEach(item => {
        businessEntry.businessList[item.key] = {
          address: item.val().address,
          lat: item.val().lat,
          lng: item.val().lng,
          time_created: item.val().time_created
        }
      });
      businessEntry.render(businessEntry.businessList);
    });

    // Handle add business 
    $("#add-business-btn").click(e => {
      e.preventDefault();
      $("#add-business-btn").attr('enabled', 'false');
      let businessName = $("input[name='business_name']").val();

      if (!businessName) {
        alert('Must provide a business name');
        return;
      }

      if (!businessEntry.currPlace.isValid()) {
        alert('Must select address from dropdown');
        return;
      }

      businessEntry.createEntry({
        business_name: businessName,
        address: businessEntry.currPlace.address,
        lat: businessEntry.currPlace.lat,
        lng: businessEntry.currPlace.lng
      });

      $("input[name='business_name']").val('');
      $("input[name='address']").val('');
    });

    // Show all businesses
    $("#show-businesses-on-map-btn").click(e => {
      businessEntry.renderAllPlacesOnMap();
    });

    $("#clear-markers-btn").click(e => {
      businessEntry.clearAllMarkers();
    });
  },

  createEntry: (data) => {
    firebase.database().ref('/businesses/' + data.business_name).set({
      'address': data.address,
      'lat': data.lat,
      'lng': data.lng,
      'time_created': new Date()
    });
  },

  render: (businesses) => {
    let root = document.querySelector("#business-list");
    $(root).html('');

    Object.keys(businesses).forEach(k => {
      let node = document.createElement('div');
      let template = _.template($(document.querySelector('script#business-item')).html());
      let html = template({
        business_name: k,
        business_address: businesses[k].address,
        lat: businesses[k].lat,
        lng: businesses[k].lng
      });
      console.log(businesses[k].lat);
      node.innerHTML = html;
      root.appendChild(node);
    });

    $('div.list-group-item a').each((index, item) => {
      $(item).click(e => {
        e.preventDefault();
        businessEntry.addMarker(
          $(item).parent().attr('business_name'),
          $(item).parent().attr('business_address'),
          $(item).parent().attr('lat'),
          $(item).parent().attr('lng'));
      });
    });

    $('div.list-group-item button').click((e) => {
      e.preventDefault();
      $.ajax({
        type: 'POST',
        url: '/remove_business',
        data: {
          name: $(e.target).parent().attr('business_name')
        },
        success: (r) => {
          alert('item has been removed ' + r);
          console.log('item removed');
        }
      });
    });
  },

  initMap: () => {
    businessEntry.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 22.5266317, lng: 88.3519158 },
      zoom: 14
    });
    let input = document.getElementById('autocomplete');
    let autocomplete = new google.maps.places.Autocomplete(input, {
    });

    businessEntry.infowindow = new google.maps.InfoWindow();
    let infowindowContent = document.getElementById('infowindow-content');
    businessEntry.infowindow.setContent(infowindowContent);
    let marker = new google.maps.Marker({
      map: businessEntry.map,
      anchorPoint: new google.maps.Point(0, -29)
    });

    autocomplete.setComponentRestrictions(
      { 'country': [businessEntry.COUNTRY_CODE] });

    autocomplete.addListener('place_changed', () => {
      businessEntry.infowindow.close();
      marker.setVisible(false);
      var place = autocomplete.getPlace();
      if (!place.geometry) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        businessEntry.map.fitBounds(place.geometry.viewport);
      } else {
        businessEntry.map.setCenter(place.geometry.location);
        businessEntry.map.setZoom(17);  // Why 17? Because it looks good.
      }
      marker.setPosition(place.geometry.location);
      marker.setVisible(true);

      var address = '';
      if (place.address_components) {
        address = [
          (place.address_components[0] && place.address_components[0].short_name || ''),
          (place.address_components[1] && place.address_components[1].short_name || ''),
          (place.address_components[2] && place.address_components[2].short_name || ''),
          (place.address_components[3] && place.address_components[3].short_name || ''),
          (place.address_components[4] && place.address_components[4].short_name || ''),
          (place.address_components[6] && place.address_components[6].short_name || ''),
          (place.address_components[7] && place.address_components[7].short_name || ''),
          (place.address_components[8] && place.address_components[8].short_name || '')
        ].join(' ');
      }

      businessEntry.setCurrentPlace(address, place.geometry.location.lat(), place.geometry.location.lng());

      infowindowContent.children['place-icon'].src = place.icon;
      infowindowContent.children['place-name'].textContent = place.name;
      infowindowContent.children['place-address'].textContent = address;
      businessEntry.infowindow.open(map, marker);
    });
  },

  renderAllPlacesOnMap: () => {
    businessEntry.markers = [];
    Object.keys(businessEntry.businessList).forEach((k) => {
      businessEntry.addMarker(k, businessEntry.businessList[k].address, businessEntry.businessList[k].lat, businessEntry.businessList[k].lng);
    });
  },

  clearAllMarkers: () => {
    businessEntry.markers.forEach(m => {
      m.setMap(null);
    });
  },

  addMarker(business_name, address, lat, lng) {
    const myLatLng = { lat: parseFloat(lat), lng: parseFloat(lng) };

    
    let marker = new google.maps.Marker({
      map: businessEntry.map,
      position: myLatLng
    });
    businessEntry.markers.push(marker);

    const description = `${business_name}<br>${address}`;
    google.maps.event.addListener(marker, 'click', (function (content) {
      return function () {
        businessEntry.infowindow.setContent(content);
        businessEntry.infowindow.open(map, marker);
      }
    })(description));
  }
}

module.exports = businessEntry;