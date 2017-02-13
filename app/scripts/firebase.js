
function FirebaseImp(setDataMethod) {
  this.user = null;
  this.token = null;
  this.clientSetDataMethod = setDataMethod;
  this.refName = 'drawToolSerialData';
  this.config = {
    apiKey: "AIzaSyDUm2l464Cw7IVtBef4o55key6sp5JYgDk",
    authDomain: "colabdraw.firebaseapp.com",
    databaseURL: "https://colabdraw.firebaseio.com",
    storageBucket: "colabdraw.appspot.com",
    messagingSenderId: "432582594397"
  };
  this.initFirebase();
}

FirebaseImp.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseImp.prototype.error = function(error) {
  this.log(error);
};

FirebaseImp.prototype.reqAuth = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithRedirect  (provider)
  .then(this.finishAuth.bind(this))
  .catch(this.failAuth.bind(this));
};

FirebaseImp.prototype.failAuth = function(error) {
  var errorCode = error.code;
  var errorMessage = error.message;
  var email = error.email;
  var credential = error.credential;
  this.error(
  ["couldn't authenticate", errorMessage, error.email]
  .join(" ")
  );
};

FirebaseImp.prototype.finishAuth = function(result) {
  this.user = result.user;
  this.dataRef = firebase.database().ref(this.refName);
  this.registerListeners();
  this.log('logged in');
};

FirebaseImp.prototype.registerListeners = function() {
  console.log("registering listeners");
  var ref = this.dataRef;
  var setData = this.clientSetDataMethod.bind(this);

  ref.on('value', function(data){
    console.log(data.val());
    console.log('value');
    setData(data.val());
  });

  ref.on('child_changed', function(data){
    console.log(data);
    console.log('child_changed');
  });
    ref.on('child_added', function(data){
    console.log(data);
    console.log('child added');
  });

  ref.on('child_removed', function(data){
    console.log(data);
    console.log('child removed');
  });
};

FirebaseImp.prototype.update = function(data) {
  this.log(this.dataRef.update({'serializedData': data}));
};

FirebaseImp.prototype.initFirebase = function() {
  firebase.initializeApp(this.config);
  var finishAuth = this.finishAuth.bind(this);
  var reqAuth    = this.reqAuth.bind(this);
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log(user.displayName + " authenticated");
      finishAuth({result: {user: user}});
    } else {
      reqAuth();
    }
  });
};

module.exports = FirebaseImp;
