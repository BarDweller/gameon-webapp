'use strict';

/**
 * User service. Wraps fetch to/from server and local storage to deal
 * with information about the user/player.
 * 
 * @ngdoc service
 * @name playerApp.user
 * @description
 * # user
 * Factory in the playerApp.
 */
angular.module('playerApp')
  .factory('user',
  [          '$log','$state','API','$http',
    function ($log,  $state,  API,  $http) {

    var user = {};

    user.profile = {};

    user.rules = {};
    user.rules.nameRule = "At least 3 characters, no spaces.";
    user.rules.namePattern = /^\w{3,}$/;
    user.rules.colorRule = "At least 3 characters, no spaces.";
    user.rules.colorPattern = /^\w{3,}$/;

    user.load = function(id,name) {
    	
      $log.debug('quering token %o',localStorage.token);	

      //we're using the id from the token introspect as our player db id.
      user.profile.id = id;

      // Load the user's information from the DB and/or session
      // Load needs to come from the Auth token
      var playerURL = API.PROFILE_URL + user.profile.id;
      var parameters = {};
      var q;

      // Fetch data about the user
      $log.debug('fetch data from %o', playerURL);
      q = $http({
        method : 'GET',
        url : playerURL,
        cache : false,
        params : parameters
      }).then(function(response) {
        $log.debug(response.status + ' ' + response.statusText + ' ' + playerURL);

        var tmp = angular.fromJson(response.data);
        user.profile.name = tmp.name;
        user.profile.favoriteColor = tmp.favoriteColor;
        user.profile.location = tmp.location;

        return true;          
      }, function(response) {
        $log.debug(response.status + ' ' + response.statusText + ' ' + playerURL);

        // User can't be found, which is fine, we can go build one!
        user.profile.name = name.replace(/ /g , '_');

        return false;
      });

      return q;
    };
    
    user.create = function() {
      $log.debug("Saving user data: %o", user.profile);
      // CREATE -- needs to test for ID uniqueness.. so only go on to 
      // the next state if all data could validate properly.

      var playerURL = API.PROFILE_URL; 
      
      $http({
        method : 'POST',
        url : playerURL,
        cache : false,
        data : user.profile
      }).then(function(response) {
        $log.debug(response.status + ' ' + response.statusText + ' ' + playerURL);
        $state.go('play.room');
        
      }, function(response) {
        $log.debug(response.status + ' ' + response.statusText + ' ' + playerURL);

        // go to the sad state.. (Can't find the player information, and can't save it either)
        $state.go('default.yuk');
      });
      
    };
    
    return user;
  }]);