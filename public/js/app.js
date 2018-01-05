import businessEntry from './business';
import routeEntry from './routes';

let MODULE = (function () {
  let obj = {};
  let selectedRouteKey = -1;

  obj.drag = function (e) {
    e.dataTransfer.setData('text', e.target.id);
  }

  obj.allowDrop = function (e) {
    e.preventDefault();
  }

  obj.updateRoute = function (routeKey, businessKey, add) {
    $.ajax({
      type: 'POST',
      url: 'update_route',
      data: {
        add: add,
        routeKey: routeKey,
        businessKey: businessKey
      },
      success: function () {
        console.log(`Update route ${routeKey} with ${businessKey}`);
      }
    });
  }

  obj.drop = function (e) {
    if (selectedRouteKey == -1) {
      alert('Must select a route first');
      return;
    }
    console.log('select route ' + selectedRouteKey);
    e.preventDefault();
    let data = e.dataTransfer.getData('text');
    let elem = $("#" + data);
    if ($(e.target).hasClass('box')) {
      $(e.target).append(elem);
      let add = $(e.target).attr('id') === "routeDetails";
      this.updateRoute(selectedRouteKey, data, add);
    }
  }

  obj.routeItemClickHandler = function(e) {
    $("#routes").find('.background-selected').removeClass('background-selected');
    $(e.target).parent().toggleClass('background-selected');    
  }

  obj.setup = function () {
    $("#routes li").click(e => {
      $("#routes li").each(function (i, elem) {
        $(elem).removeClass('active');
      });

      $(e.currentTarget).addClass('active');
      selectedRouteKey = $("#routes").find('input[name="route_name"]').val();
      console.log('route -> ' + selectedRouteKey);
    });

    $('#editRouteModal').on('show.bs.modal', function (e) {
      let button = $(e.relatedTarget);
      let routeName = button.data('routename');
      $("#edit-route-model-title").html(routeName);
      $("#update-route-form input[name='routeKey']").val(routeName);
    });
  }
  return obj;
}());

$(function () {
  console.log('Document loaded...');

  const config = {
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
    businessEntry.initialize();
  } else {
    routeEntry.initialize();
  }
});



