let routesEntry = {
  routes: {},
  SUCCESS: { success: true },
  FAILED: { success: false },

  initialize: () => {
    routesEntry.addListener();

    // Add route btn
    $("#add-route-btn").click(e => {
      let routeName = $("input[name='route_name']").val();
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

  addListener: () => {
    var ref = firebase.database().ref('/routes');
    ref.on('value', (snapshot) => {
      console.log('routes updated ...');
      let routes = {};
      snapshot.forEach(item => {
        routes[item.key] = {
          businesses: item.val().businesses ? item.val().businesses : []
        };
      });
      routesEntry.routes = routes;
      console.log(routesEntry.routes);      
      routesEntry.render();
    });
  },

  render: () => {
    const rootNode = document.querySelector("#route-list");
    Object.keys(routesEntry.routes).forEach(k => {
      let template = document.querySelector("script#route-item").innerHTML;
      let compiled = _.template(template);
      console.log(k);
      let node = document.createElement('div');
      node.innerHTML = compiled({route_name : k});
      rootNode.appendChild(node);
    });
  },

  create: (name) => {
    firebase.database().ref('/routes/').child(`${name}`).set({
      businesses: [],
      time_created: new Date().getTime()
    }).then(snapshot => {
      res.send(SUCCESS)
    }).catch(error => {
      res.send(ERROR);
    });
  },

  updateRoute: (name, businesses) => {
    let updates = {};
    updates['businesses'] = businesses;
    firebase.database().ref('/routes/' + name).update(updates);
  },

  delete: (name) => {
    firebase.database().ref('/routes/' + name).remove();
  }
};

module.exports = routesEntry;