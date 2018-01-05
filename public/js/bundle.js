/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var businessEntry = {
  COUNTRY_CODE: 'IN',
  map: undefined,
  infowindow: undefined,
  markers: [],
  businessList: {},

  currPlace: {
    address: '',
    lat: undefined,
    lng: undefined,
    isValid: function isValid() {
      return businessEntry.currPlace.address.length > 0 && businessEntry.currPlace.lat && businessEntry.currPlace.lng;
    }
  },

  setCurrentPlace: function setCurrentPlace(address, lat, lng) {
    businessEntry.currPlace.address = address;
    businessEntry.currPlace.lat = lat;
    businessEntry.currPlace.lng = lng;
  },

  load_library: function load_library(url, callback) {
    $.ajax({
      url: url,
      dataType: "script",
      async: false, // <-- This is the key
      success: function success() {
        // businessEntry.initMap();
        if (callback) {
          callback();
        }
      },
      error: function error() {
        console.log('failed to load places library ' + url);
        throw new Error("Could not load script " + script);
      }
    });
  },

  initialize: function initialize() {
    businessEntry.load_library('https://maps.googleapis.com/maps/api/js?key=AIzaSyCMfCSDvfdv4v-PJSMJK6CLTukTCxgEfP4&libraries=places', function () {
      businessEntry.initMap();
    });
    businessEntry.load_library('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore.js');
    businessEntry.setup_listeners();
  },

  setup_listeners: function setup_listeners() {
    // Add listener for business listing.
    var businessRef = firebase.database().ref('/businesses');
    businessRef.on('value', function (snapshot) {
      businessEntry.businessList = {};
      snapshot.forEach(function (item) {
        businessEntry.businessList[item.key] = {
          address: item.val().address,
          lat: item.val().lat,
          lng: item.val().lng,
          time_created: item.val().time_created
        };
      });
      businessEntry.render(businessEntry.businessList);
    });

    // Handle add business 
    $("#add-business-btn").click(function (e) {
      e.preventDefault();
      $("#add-business-btn").attr('enabled', 'false');
      var businessName = $("input[name='business_name']").val();

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
    $("#show-businesses-on-map-btn").click(function (e) {
      businessEntry.renderAllPlacesOnMap();
    });

    $("#clear-markers-btn").click(function (e) {
      businessEntry.clearAllMarkers();
    });
  },

  createEntry: function createEntry(data) {
    firebase.database().ref('/businesses/' + data.business_name).set({
      'address': data.address,
      'lat': data.lat,
      'lng': data.lng,
      'time_created': new Date()
    });
  },

  render: function render(businesses) {
    var root = document.querySelector("#business-list");
    $(root).html('');

    Object.keys(businesses).forEach(function (k) {
      var node = document.createElement('div');
      var template = _.template($(document.querySelector('script#business-item')).html());
      var html = template({
        business_name: k,
        business_address: businesses[k].address,
        lat: businesses[k].lat,
        lng: businesses[k].lng
      });
      console.log(businesses[k].lat);
      node.innerHTML = html;
      root.appendChild(node);
    });

    $('div.list-group-item a').each(function (index, item) {
      $(item).click(function (e) {
        e.preventDefault();
        businessEntry.addMarker($(item).parent().attr('business_name'), $(item).parent().attr('business_address'), $(item).parent().attr('lat'), $(item).parent().attr('lng'));
      });
    });

    $('div.list-group-item button').click(function (e) {
      e.preventDefault();
      $.ajax({
        type: 'POST',
        url: '/remove_business',
        data: {
          name: $(e.target).parent().attr('business_name')
        },
        success: function success(r) {
          alert('item has been removed ' + r);
          console.log('item removed');
        }
      });
    });
  },

  initMap: function initMap() {
    businessEntry.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 22.5266317, lng: 88.3519158 },
      zoom: 14
    });
    var input = document.getElementById('autocomplete');
    var autocomplete = new google.maps.places.Autocomplete(input, {});

    businessEntry.infowindow = new google.maps.InfoWindow();
    var infowindowContent = document.getElementById('infowindow-content');
    businessEntry.infowindow.setContent(infowindowContent);
    var marker = new google.maps.Marker({
      map: businessEntry.map,
      anchorPoint: new google.maps.Point(0, -29)
    });

    autocomplete.setComponentRestrictions({ 'country': [businessEntry.COUNTRY_CODE] });

    autocomplete.addListener('place_changed', function () {
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
        businessEntry.map.setZoom(17); // Why 17? Because it looks good.
      }
      marker.setPosition(place.geometry.location);
      marker.setVisible(true);

      var address = '';
      if (place.address_components) {
        address = [place.address_components[0] && place.address_components[0].short_name || '', place.address_components[1] && place.address_components[1].short_name || '', place.address_components[2] && place.address_components[2].short_name || '', place.address_components[3] && place.address_components[3].short_name || '', place.address_components[4] && place.address_components[4].short_name || '', place.address_components[6] && place.address_components[6].short_name || '', place.address_components[7] && place.address_components[7].short_name || '', place.address_components[8] && place.address_components[8].short_name || ''].join(' ');
      }

      businessEntry.setCurrentPlace(address, place.geometry.location.lat(), place.geometry.location.lng());

      infowindowContent.children['place-icon'].src = place.icon;
      infowindowContent.children['place-name'].textContent = place.name;
      infowindowContent.children['place-address'].textContent = address;
      businessEntry.infowindow.open(map, marker);
    });
  },

  renderAllPlacesOnMap: function renderAllPlacesOnMap() {
    businessEntry.markers = [];
    Object.keys(businessEntry.businessList).forEach(function (k) {
      businessEntry.addMarker(k, businessEntry.businessList[k].address, businessEntry.businessList[k].lat, businessEntry.businessList[k].lng);
    });
  },

  clearAllMarkers: function clearAllMarkers() {
    businessEntry.markers.forEach(function (m) {
      m.setMap(null);
    });
  },

  addMarker: function addMarker(business_name, address, lat, lng) {
    var myLatLng = { lat: parseFloat(lat), lng: parseFloat(lng) };

    var marker = new google.maps.Marker({
      map: businessEntry.map,
      position: myLatLng
    });
    businessEntry.markers.push(marker);

    var description = business_name + '<br>' + address;
    google.maps.event.addListener(marker, 'click', function (content) {
      return function () {
        businessEntry.infowindow.setContent(content);
        businessEntry.infowindow.open(map, marker);
      };
    }(description));
  }
};

module.exports = businessEntry;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(2);
module.exports = __webpack_require__(0);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _business = __webpack_require__(0);

var _business2 = _interopRequireDefault(_business);

var _routes = __webpack_require__(3);

var _routes2 = _interopRequireDefault(_routes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE = function () {
  var obj = {};
  var selectedRouteKey = -1;

  obj.drag = function (e) {
    e.dataTransfer.setData('text', e.target.id);
  };

  obj.allowDrop = function (e) {
    e.preventDefault();
  };

  obj.updateRoute = function (routeKey, businessKey, add) {
    $.ajax({
      type: 'POST',
      url: 'update_route',
      data: {
        add: add,
        routeKey: routeKey,
        businessKey: businessKey
      },
      success: function success() {
        console.log('Update route ' + routeKey + ' with ' + businessKey);
      }
    });
  };

  obj.drop = function (e) {
    if (selectedRouteKey == -1) {
      alert('Must select a route first');
      return;
    }
    console.log('select route ' + selectedRouteKey);
    e.preventDefault();
    var data = e.dataTransfer.getData('text');
    var elem = $("#" + data);
    if ($(e.target).hasClass('box')) {
      $(e.target).append(elem);
      var add = $(e.target).attr('id') === "routeDetails";
      this.updateRoute(selectedRouteKey, data, add);
    }
  };

  obj.routeItemClickHandler = function (e) {
    $("#routes").find('.background-selected').removeClass('background-selected');
    $(e.target).parent().toggleClass('background-selected');
  };

  obj.setup = function () {
    $("#routes li").click(function (e) {
      $("#routes li").each(function (i, elem) {
        $(elem).removeClass('active');
      });

      $(e.currentTarget).addClass('active');
      selectedRouteKey = $("#routes").find('input[name="route_name"]').val();
      console.log('route -> ' + selectedRouteKey);
    });

    $('#editRouteModal').on('show.bs.modal', function (e) {
      var button = $(e.relatedTarget);
      var routeName = button.data('routename');
      $("#edit-route-model-title").html(routeName);
      $("#update-route-form input[name='routeKey']").val(routeName);
    });
  };
  return obj;
}();

$(function () {
  console.log('Document loaded...');

  var config = {
    apiKey: "AIzaSyCerTXhFJVrxLwU6BXjkuG2v4iK88EXE4U",
    authDomain: "lykke-1e98b.firebaseapp.com",
    databaseURL: "https://lykke-1e98b.firebaseio.com",
    projectId: "lykke-1e98b",
    storageBucket: "lykke-1e98b.appspot.com",
    messagingSenderId: "91650177123"
  };
  firebase.initializeApp(config);
  // firebase.database().ref().set({ routes: { time_created: new Date()} });
  // firebase.database().ref().child('posts').set({'success': true});

  MODULE.setup();
  // Hacky way to segment functionality.
  if (window.location.href.indexOf('route') === -1) {
    _business2.default.initialize();
  } else {
    _routes2.default.initialize();
  }
});

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var routesEntry = {
  routes: {},
  SUCCESS: { success: true },
  FAILED: { success: false },

  initialize: function initialize() {
    routesEntry.addListener();

    // Add route btn
    $("#add-route-btn").click(function (e) {
      var routeName = $("input[name='route_name']").val();
      if (!routeName) {
        alert('Must provide a route name');
        return;
      }

      // firebase.database().ref('/routes').once('value', (snapshot) => {
      //   if (!snapshot.val()) {
      //     firebase.database().ref().child('routes').set({time_created: new Date().getTime()});
      //     console.log('created root route');
      //     routesEntry.addListener();
      //   }
      // });

      firebase.database().ref().child('routes/' + routeName).set({
        time_created: new Date().getTime()
      });

      $("input[name='route_name']").val('');
    });
  },

  addListener: function addListener() {
    var ref = firebase.database().ref('/routes');
    ref.on('value', function (snapshot) {
      console.log('routes updated ...');
      var routes = {};
      snapshot.forEach(function (item) {
        routes[item.key] = {
          businesses: item.val().businesses ? item.val().businesses : []
        };
      });
      routesEntry.routes = routes;
      console.log(routesEntry.routes);
      routesEntry.render();
    });
  },

  render: function render() {
    var rootNode = document.querySelector("#route-list");
    Object.keys(routesEntry.routes).forEach(function (k) {
      var template = document.querySelector("script#route-item").innerHTML;
      var compiled = _.template(template);
      console.log(k);
      var node = document.createElement('div');
      node.innerHTML = compiled({ route_name: k });
      rootNode.appendChild(node);
    });
  },

  create: function create(name) {
    firebase.database().ref('/routes/').child("" + name).set({
      businesses: [],
      time_created: new Date().getTime()
    }).then(function (snapshot) {
      res.send(SUCCESS);
    }).catch(function (error) {
      res.send(ERROR);
    });
  },

  updateRoute: function updateRoute(name, businesses) {
    var updates = {};
    updates['businesses'] = businesses;
    firebase.database().ref('/routes/' + name).update(updates);
  },

  delete: function _delete(name) {
    firebase.database().ref('/routes/' + name).remove();
  }
};

module.exports = routesEntry;

/***/ })
/******/ ]);
//# sourceMappingURL=bundle.js.map