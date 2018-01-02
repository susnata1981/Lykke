const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const process = require('process');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

// Error definitions
const MISSING_BUSINESS_NAME = 'Missing business name';
const MISSING_ROUTE_NAME = 'Missing route name';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

app.get('/', (req, res) => {
  console.log('requesting home page');

  let p = load_routes();

  let businessPromise = new Promise((resolve, reject) => {
    var ref = admin.database().ref('/businesses');
    let result = {};
    ref.once('value').then(snapshot => {
      snapshot.forEach(item => {
        console.log(`item -> ${JSON.stringify(item)} ${item.key}`);
        result[item.key] = {
          address: item.val().address,
          time_created: item.val().time_created
        }
        console.log(`reuslt -> ${JSON.stringify(result)}`);
        
        // result.push({
        //   name: item.key,
        //   address: item.val().address,
        //   time_created: item.val().time_created
        // });
      });
      console.log('resolving businessPromise -> ' + JSON.stringify(result));      
      resolve(result);
    });
  });

  // let routePromise = new Promise((resolve, reject) => {
  //   let ref = admin.database().ref('/routes');
  //   ref.once('value').then(snapshot => {
  //     console.log(`routes -> ${JSON.stringify(snapshot)}`);
  //     resolve(snapshot);
  //   });
  // });

  let routePromise = new Promise((resolve, reject) => {
    var ref = admin.database().ref('/routes');
    let result = {};
    ref.once('value').then(snapshot => {
      snapshot.forEach(item => {
        result[item.key] = {
          businesses: item.val().businesses ? item.val().businesses: []
        };
      });
      resolve(result);
    });
  });

  Promise.all([businessPromise, routePromise])
    .then(function (results) {
      // console.log(`Before resolved promises ${JSON.stringify(results)}`);
      let data = {
        businesses: results[0],
        routes: results[1]
      };      
      fill_route_data(data);
      console.log(`After Resolved promises ${JSON.stringify(data['routes'])}`);
      res.render('index', { businesses: [], routes: [] });
    }).catch(error => {
      console.log('Failed to resolve promises ' + error);
    });
});

function fill_route_data(data) {
  let routes = data['routes'];
  let businesses = data['businesses'];
  console.log(`routes -> ${JSON.stringify(routes)}`);
  
  // for(var key in routes) {
  //   if (routes.hasOwnProperty(key)) {
  //     console.log(`key -> ${key}`);
  //   }
  // }
  Object.keys(routes).forEach(function(key) {
    console.log("key - ", key, routes[key]);
    routes[key]['businesses'] = get_business_list(businesses, routes[key]['businesses']);
});
}

function get_business_list(all_businesses, route_businesses) {
  let result = [];
  Object.keys(all_businesses).forEach(key => {
    if (route_businesses[key]) {
      let o = {};
      o[key] = true
      result.push(o);
    } else {
      let o = {};
      o[key] = false
      result.push(o);
    }
  });
  // });
  // all_businesses.forEach(b => {
  //   if (route_businesses[b.key]) {
  //     let o = {};
  //     o[b.key] = true
  //     result.push(o);
  //   } else {
  //     let o = {};
  //     o[b.key] = false
  //     result.push(o);
  //   }
  // });
  return result;
}

function update_routes(data) {
  // console.log(`data -> ${JSON.stringify(data)}`);
  // data['routes'].forEach(r => {
  //   // console.log('computing list for route -> '+r.name);
  //   console.log(`route data -> ${JSON.stringify(r)}`);
  //     r['businesses'] = compute_full_list(data['businesses'], r);
  // });
  let routes = data['routes'];
  for (let i = 0; i < routes.length; i++) {
    routes[i]['businesses'] = compute_full_list(data['businesses'], routes[i]);
  }
}

function compute_full_list(master, route) {
  let allBusinesses = master.map(b => b.name);
  let currentBusinesses = route['businesses'].map(b => b.name);

  result = [];
  for (let i = 0; i < master.length; i++) {
    let business = isBusinessPresent(master[i].name, route);
    if (business == null) {
      master[i].included = false;
      result.push({
        name: master[i].name,
        address: master[i].address,
        included: false
      });
    } else {
      result.push({
        name: master[i].name,
        address: master[i].address,
        included: true
      });
    }
  }
  // master.forEach(b => {
  //   let business = isBusinessPresent(b.name, route);
  //   console.log(`isBusinessPresent -> ${business}`);
  //   if (business == null) {
  //     b.included = false;
  //     result.push(b);
  //   } else {
  //     b.included = true;
  //     result.push(b);
  //   }
  // });
  // console.log(`compute_full_list:: result -> ${JSON.stringify(result)}`);
  return result;
}

function isBusinessPresent(business, route) {
  let businessList = route['businesses'];
  for (let i = 0; i < businessList.length; i++) {
    if (businessList[i].name === business) {
      console.log('found match');
      return businessList[i];
    }
  }
  // route['businesses'].forEach(b => {
  //   console.log('isBusiness -> '+business+" -- "+b.name);    
  //   if (b.name === business) {
  //     console.log('found match');
  //     return b;
  //   }
  // });
  return null;
}

function load_routes() {
  let db = admin.database();
  var routeRef = db.ref('/routes');
  let result = [];
  let promises = [];

  return new Promise((resolve, reject) => {
    routeRef.once('value').then(routes => {
      routes.forEach(route => {
        promises.push(load_route(route));
      });

      Promise.all(promises).then(function (results) {
        resolve(results);
      }).catch(error => {
        console.log(`error loading route ${JSON.stringify(error)}`);
      });
    });
  });
}

function load_route(route) {
  console.log(`loading route ${route.key}`);
  let promises = [];
  let db = admin.database();

  return new Promise((resolve, reject) => {
    db.ref('/routes/' + route.key + '/businesses').once('value', businesses => {
      if (!businesses.exists()) {
        resolve({
          name: route.key,
          businesses: []
        });
        return;
      }
      businesses.forEach(business => {
        if (business.val() == null) {
          reject("Missing business entity");
          return;
        }
        promises.push(load_business(business.key));
      });

      Promise.all(promises).then(function (results) {
        resolve({
          name: route.key,
          businesses: results
        });
      }).catch(error => {
        console.log(`failed to load route ${route.key} ${JSON.stringify(error)}`);
      })
    });
  });
}

function load_business(businessKey) {
  return new Promise((resolve, reject) => {
    admin.database().ref('/businesses/' + businessKey).once('value',
      snapshot => {
        if (snapshot.val() == null) {
          reject(`business doesn't exists ${businessKey}`);
        }
        resolve({
          'name': businessKey,
          'address': snapshot.val().address,
          'time_created': snapshot.val().time_created
        });
      });
  });
}

app.post('/add_business', (req, res) => {
  console.log('requesting add business');
  console.log(`form params - ${req.body.business_name} ${req.body.address}`);

  let businessName = req.body.business_name;
  if (!businessName) {
    res.render('error', {
      'error_description': MISSING_BUSINESS_NAME
    });
  }

  admin.database().ref('/businesses').child(`/${businessName}`).set({
    address: req.body.address,
    time_created: new Date().getTime()
  }).then(snapshot => {
    res.redirect('/');
  });
});

app.post('/remove_business', (req, res) => {
  console.log('requesting add business');
  console.log(`form params - ${req.body.name}`);

  if (!req.body.name) {
    res.render('error', {
      'error_description': MISSING_BUSINESS_NAME
    });
  }
  admin.database().ref('/businesses/' + req.body.name).remove();
  res.redirect('/');
});

app.post('/add_route', (req, res) => {
  console.log('requesting add business');
  console.log(`form params - ${req.body.route_name}`);

  let routeName = req.body.route_name;
  if (!routeName) {
    res.render('error', {
      'error_description': MISSING_ROUTE_NAME
    });
  }

  admin.database().ref('/routes').child(`/${routeName}`).set({
    businesses: [],
    time_created: new Date().getTime()
  }).then(snapshot => {
    res.redirect('/');
  }).catch(error => {
    console.log('error adding route. ' + err);
  });
});

app.post('/remove_route', (req, res) => {
  console.log(`form params - ${req.body.route_name}`);

  let routeName = req.body.route_name;
  if (!routeName) {
    res.render('error', {
      'error_description': MISSING_ROUTE_NAME
    });
  }

  admin.database().ref('/routes/' + routeName).remove();
  res.redirect('/');
});

app.post('/update_route', (req, res) => {
  let routeKey = req.body.routeKey;
  let businessKey = req.body.businessKey;
  let add = req.body.add == 'true'

  console.log(`Adding ${businessKey} to ${routeKey} ${add}`);

  if (add) {
    let b = {};
    b[`${businessKey}`] = true;
    admin.database().ref('/routes/' + routeKey).once('value',
      snapshot => {
        console.log(`sp -> ${JSON.stringify(snapshot)}`);
        if (snapshot.child("businesses").exists()) {
          admin.database().ref('/routes/' + routeKey + "/businesses").update(b);
        } else {
          console.log(`snapshot -> ${JSON.stringify(snapshot)}`);
          let b = {};
          b[`${businessKey}`] = true;
          admin.database().ref('/routes/' + routeKey + "/businesses/")
            .set(b)
            .catch(err => {
              console.log('Error updating route ' + err);
            });
        }
      });
  } else {
    console.log('removing item');
    admin.database().ref('/routes/' + routeKey + "/businesses").once('value',
      snapshot => {
        snapshot.forEach(b => {
          console.log(`value -> ${JSON.stringify(b)} ${b.key}`);
          if (b.val().key === businessKey) {
            admin.database().ref('/routes/' + routeKey + "/businesses/" + b.key).remove();
          }
        });
      });
  }
});

exports.app = functions.https.onRequest(app);
