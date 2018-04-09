// APPLICATION GLOBAL VARIABLES AND CONSTANTS
var map;
var markers = [];
var bounds;
var infoWindow;
var defaultIcon;
var highlightedIcon;
var service;
var vm;
const IMAGE_TAG_ID = 'thumbnail';
const WIKI_DIV_ID = 'wiki';
const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php'
const MAX_WIKI_LINKS = 3;
const LOADING_IMAGE = 'img/waitimage.gif';
const NO_IMAGE_PLACEHOLDER = 'img/no-image.jpg';

// MODEL DEFAULT DATA
var default_places = [
  {
    googlePlaceId: 'ChIJSw6a_Ob4oUcRTbm3FBoiD6s',
    yelpId: 'havana-bar-erlangen',
    wikiSearchTerm: 'Havana',
    isFavourite: false,
    position: {lat: 49.600394, lng: 11.003527},
    title: 'Havanna Bar',
    categoryIcon: 'https://maps.gstatic.com/mapfiles/place_api/icons/bar-71.png',
  },
  {
    googlePlaceId: 'ChIJkdSwbp__oUcR2CQ-mLpXBv4',
    yelpId: '',
    wikiSearchTerm: 'Huckepack',
    isFavourite: false,
    position: {lat: 49.536461, lng: 10.959506000000033},
    title: 'Huckepack Selbsterntefeld',
    categoryIcon: '',
  },
  {
    googlePlaceId: 'ChIJ5YZGbJIBokcRiUSBQGznHmg',
    yelpId: '',
    wikiSearchTerm: 'adidas',
    isFavourite: false,
    position: {lat: 49.57381, lng: 10.916805},
    title: 'adidas Factory Outlet',
    categoryIcon: '',
  },
  {
    googlePlaceId: 'ChIJEb_2neb4oUcRKyusEEWO5Co',
    yelpId: '',
    wikiSearchTerm: 'Steinbach',
    isFavourite: false,
    position: {lat: 49.602863, lng: 11.005107},
    title: 'Biergarten Steinbachbräu',
    categoryIcon: '',
  },
  {
    googlePlaceId: 'ChIJT_-Fm8r9oUcRPhfkTS-SNBA',
    yelpId: '',
    wikiSearchTerm: 'Friedrich-Alexander-Universität_Erlangen-Nürnberg',
    isFavourite: false,
    position: {lat: 49.59788, lng: 11.004551},
    title: 'Universität Erlangen',
    categoryIcon: '',
  }
]

// VIEW MODEL
var ViewModel = function() {
  var self = this;

  this.placeList = ko.observableArray([]);
  this.filteredPlaceList = ko.observableArray([]);
  this.placesFilter = ko.observable('');
  this.selectedPlace = ko.observable('');

  // Loads data from local storage into placelist
  if (localStorage.storefinder) {
    var parsed = JSON.parse(localStorage.storefinder);
    parsed.placeList.forEach( function(item) {
      self.placeList.push( new Place(item) );
    });
    parsed.filteredPlaceList.forEach( function(item) {
      self.filteredPlaceList.push( new Place(item) );
    });
    this.placesFilter(parsed.placesFilter);
    this.selectedPlace(parsed.selectedPlace);
  }

  // Function to change the selected place
  this.changeSelectedPlace = function(data) {
    self.selectedPlace(data);
    self.highlightMarker();
    saveData();
  }

  // Function to create an array of filtered places
  this.applyFilter = function() {
    self.filteredPlaceList.removeAll();
    self.filteredPlaceList(self.placeList().filter( function(item) {
      return (item.title().includes(self.placesFilter()));
    }).slice());
    self.hideMarkers();
    saveData();
  }

  // Function to highlight a marker with different color, animation and shows the info window if selected
  this.highlightMarker = function(data) {
      for (var i = 0; i < self.filteredPlaceList().length; i++) {
        if (self.filteredPlaceList()[i] == self.selectedPlace()) {
          var icon = highlightedIcon;
          var animation = google.maps.Animation.BOUNCE;
        } else {
          var icon = defaultIcon;
          var animation = null;
        }
        for (var mi = 0; mi < markers.length; mi++) {
          if (markers[mi].googlePlaceId == self.filteredPlaceList()[i].googlePlaceId()) {
            markers[mi].setIcon(icon);
            if (icon == highlightedIcon) {
              populateInfoWindow(markers[mi], Infowindow, self.filteredPlaceList()[i]);
            }
            if (markers[mi].getAnimation() !== animation) {
              markers[mi].setAnimation(animation);
            }
          }
        }
      }
  }

  // hide all markers that do not match the filter
  this.hideMarkers = function() {
    for (var i = 0; i < markers.length; i++) {
      // hide each marker first
      markers[i].setMap(null);
      // show marker if googlePlaceId is part of filtered list
      for (var fi = 0; fi < self.filteredPlaceList().length; fi++) {
        if (markers[i].googlePlaceId == self.filteredPlaceList()[fi].googlePlaceId()) {
          markers[i].setMap(map);
        }
      }
    }
  }

  // Initially generates all markers
  this.generateAllMarkers = function(data) {

    for (var i = 0; i < self.placeList().length; i++) {
      var position = self.placeList()[i].position();
      var title = self.placeList()[i].title();
      var id = i; // self.placeList()[i].googlePlaceId();
      var googlePlaceId = self.placeList()[i].googlePlaceId();

      if (self.placeList()[i] == self.selectedPlace()) {
        var icon = highlightedIcon;
      } else {
        var icon = defaultIcon;
      }

      // Create a marker per location, and put into markers array.
      var marker = new google.maps.Marker({
        map: map,
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        icon: icon,
        id: id,
        googlePlaceId: googlePlaceId
      });

      bounds.extend(position);

      // Push the marker to our array of markers.
      markers.push(marker);

      // adds event listener to make the marker selected on click
      marker.addListener('click', clickHandler(marker, i));

    }

    map.fitBounds(bounds);

  }
}


// Function to handle click events on markers
function clickHandler(marker, index) {
  return function() {
    vm.changeSelectedPlace(vm.placeList()[marker.id]);
  }
}


var Place = function(data) {

  this.googlePlaceId = ko.observable(data.googlePlaceId);
  this.yelpId = ko.observable(data.yelpId);
  this.title = ko.observable(data.title);
  this.position = ko.observable(data.position);
  this.isFavourite = ko.observable(data.isFavourite);
  this.wikiSearchTerm = ko.observable(data.wikiSearchTerm);
  this.categoryIcon = ko.observable(data.categoryIcon);

}


// GOOGLE MAPS FUNCTIONS
function initMap() {
  vm = new ViewModel();
  ko.applyBindings(vm);

  // Constructor creates a new map - only center and zoom are required.
  var startPosition = new google.maps.LatLng(49.561972, 10.961898);
  map = new google.maps.Map(document.getElementById('map'), {
    center: startPosition,
    zoom: 10,
    mapTypeControl: true
  });

  // Initializes key elements of map functionality and search
  defaultIcon = makeMarkerIcon('0091ff');
  highlightedIcon = makeMarkerIcon('FFFF24');
  Infowindow = new google.maps.InfoWindow();
  service = new google.maps.places.PlacesService(map);
  bounds = new google.maps.LatLngBounds();

  // keep center of the map when window is resized
  google.maps.event.addDomListener(window, 'resize', function() {
      map.setCenter(startPosition);
      map.fitBounds(bounds);
  });

  // Adds default places into ViewModel
  default_places.forEach( function(item) {
    if (objectExistsInArray(vm.placeList(), item) == false) {
      vm.placeList.push( new Place(item) );
    }
  });

  // Searches for nearby supermarkets and stores them in the model
  var request = {
    location: startPosition,
    type: ['grocery_or_supermarket'],
    rankBy: google.maps.places.RankBy.DISTANCE
  };
  service.nearbySearch(request, searchHandler);

}

// Callback function to handle google places search results
function searchHandler(results, status) {

  const MAX_ITEMS = 10;
  var numberOfItems;

  if (results.length > MAX_ITEMS) {
    numberOfItems = MAX_ITEMS;
  } else {
    numberOfItems = results.length;
  }

  if (status == google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < numberOfItems; i++) {
      var resultItem = results[i];
      // save search result in the model
      var place = {
        "googlePlaceId": resultItem.place_id,
        "yelpId": '',
        "isFavourite": false,
        "title": resultItem.name,
        "position": resultItem.geometry.location,
        "wikiSearchTerm": 'Erlangen',
        "categoryIcon": resultItem.icon,
      }

      if (objectExistsInArray(vm.placeList(), place) == false) {
        vm.placeList.push( new Place(place) );
      }
    }

    // TODO:Make sure the selected item persists after reload

    vm.generateAllMarkers();

    vm.applyFilter();

    saveData();
  }
}


// Function to retrieve a photo from a googleplace and update the image tag of the infowindow
function getPhoto(placeID) {

  var photoURL = ''

  var request = {
    placeId: placeID
  };

  service.getDetails(request, function(place, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      photoURL = typeof place.photos !== 'undefined'
        ? place.photos[0].getUrl({'maxWidth': 100, 'maxHeight': 100})
        : NO_IMAGE_PLACEHOLDER;
      $('#' + IMAGE_TAG_ID).attr("src",photoURL);
    } else {
      photoURL = NO_IMAGE_PLACEHOLDER;
      $('#' + IMAGE_TAG_ID).attr("src",photoURL);
    }
  });
  return ''; // no return directly since place api returns value asynchronous
}


// Function to persist ViewModel into the local storage of the browser
function saveData() {
    localStorage.storefinder = ko.toJSON(vm);
}

// Function that returns true if an object already exists in an array by matching the googlePlaceId
function objectExistsInArray(array, object) {
  for (var i = 0; i < array.length; i++) {
    if (array[i].googlePlaceId() == object.googlePlaceId) {
      return true;
    }
  }
  return false;
}


// This function populates the infowindow
function populateInfoWindow(marker, infowindow, place) {

  if (infowindow.marker != marker) {
    // Clear the infowindow content to give the streetview time to load.
    infowindow.setContent('');
    infowindow.marker = marker;

    infowindow.setContent('<div id="place_title">' + marker.title +
        '<BR><img id="' + IMAGE_TAG_ID + '" class="thumbnail" src="' +
        getPhoto(place.googlePlaceId()) + '" alt="no image">' +
        '</div><b>Wikipedia:</b><div id="' + WIKI_DIV_ID +
        '"><img src="' + LOADING_IMAGE + '" alt="loading .."></div>');

    infowindow.open(map, marker);
    // Make sure the marker property is cleared if the infowindo is closed.
    infowindow.addListener('closeclick', function() {
      infowindow.marker = null;
    });

    getWikiInformation(place.wikiSearchTerm());

  }
}

// Creates a new marker icon based on the given color
function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
    '|40|_|%E2%80%A2',
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21,34));
  return markerImage;
}

// Access to Yelp / not used because it does not support client authentication
function getYelpInformation(id) {
  var api_host = 'https://api.yelp.com';
  var lookup_path = '/v3/businesses/';
  var api_key = 'enter your key';
  $.ajax({
    url: api_host + lookup_path + '/' + id,
    type: 'get',
    dataType: 'jsonp',
    header: {Authorization: 'Bearer ' + api_key},
    jsonpCallback : 'cb',
    success: function(data, textStatus, jqXHR) {
      console.log('ajax call successful! name = ' + data.name);
      return response.name;
    },
    error: function(response) {
      console.log('Yelp data not available at this time');
    }
  });
}

// Access to Wikipoedia API to retreive additional information
function getWikiInformation(searchTerm) {

    var $wiki = $('#' + WIKI_DIV_ID);
    var number_links;

    wikiURL = WIKI_API_ENDPOINT +
              '?' +
              'format=json&' +
              'action=opensearch&' +
              'search='+ searchTerm + '&' +
              'callback=wikiCallback';

    // in jsonp there is not .fail available du to technical limitations
    // this is a workaround
    var wikiRequestTimeout = setTimeout(function() {
      $wiki.html('service not accessible');
    }, 3000);

    $.ajax({
      url: wikiURL,
      dataType: 'jsonp',
      success: function(data, textStatus, jqXHR) {
        articlelist = data[1];
        $wiki.html('');
        if (articlelist.length >= MAX_WIKI_LINKS) {
          number_links = MAX_WIKI_LINKS;
        } else {
          number_links = articlelist.length;
        }
        for (var i = 0; i < number_links; i++) {
          $wiki.append('<li><a href="'+data[3][i]+'">'+articlelist[i]+'</a></li>');
        };

        clearTimeout(wikiRequestTimeout)
      }
    })

}
