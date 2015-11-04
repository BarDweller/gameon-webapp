'use strict';

/**
 * Authentication service. Provides token validation methods.
 * 
 * @ngdoc service
 * @name playerApp.auth
 * @description
 * # auth
 * Factory in the playerApp.
 */
angular.module('playerApp')
  .factory('auth', 
  [          '$log','API','$http',
    function ($log,  API,  $http) {
	    console.log("Loading AUTH");
	  
        var _token,
            _authenticated = null; 

        /**
         * Triggered by OAuth-style login: we need to validate the returned
         * token.
         */
        function validate_token(token) {
          $log.debug('Validating token %o', token);
          
          _authenticated = null;
          _token = undefined;
          delete localStorage.token;

          var q = $http({
              method : 'GET',
              url : API.VERIFY_URL + token,
              cache : false
          }).then(function(response) {
              $log.debug('Verify(good) '+response.status + ' ' + response.statusText + ' ' + response.data);
              var tmp = angular.fromJson(response.data);
              
        	  $log.debug("Token was valid");
              // server verified good token.
              _token = token;         
              console.log(_token);
              localStorage.token = angular.toJson(_token);
              
              return true; // return value of the promise
          }, function(response) {
            $log.debug('Verify(bad) '+response.status + ' ' + response.statusText + ' ' + response.data);
            return false;
          });
          
          _authenticated = q;

          // RETURNING A PROMISE
          return q;
        }
        
        /**
         * Used during login to obtain id for user. 
         */
        function introspect_token() {
          $log.debug('Introspect token %o', _token);
          var token = _token;
          
          _token = undefined;
          delete localStorage.token;

          var q = $http({
              method : 'GET',
              url : API.INTROSPECT_URL + token,
              cache : false
          }).then(function(response) {
              $log.debug('Introspect(good) '+response.status + ' ' + response.statusText + ' ' + response.data);
              var tmp = angular.fromJson(response.data);
              
              //since we now know token state, we can setup a promise that acts like verify had been invoked.
              _authenticated = new Promise(function(resolve,reject){
            	  resolve(true);            	  
              });
              
              // server verified good token.
              _token = token;
              tmp.token = token;
              localStorage.token = angular.toJson(_token);
            
              return tmp; // return value of the promise
          }, function(response) {
            $log.debug('Introspect(bad) '+response.status + ' ' + response.statusText + ' ' + response.data);
            
            //since we now know token state, we can setup a promise that acts like verify had been invoked.
            _authenticated = new Promise(function(resolve,reject){
          	  resolve(true);            	  
            });
                        
          });

          // RETURNING A PROMISE
          return q;
        }
        
        /**
         * Used during login to obtain id for user. 
         */
        function obtain_jwt() {
          $log.debug('Obtain JWT for token %o', _token);

          var q = $http({
              method : 'GET',
              url : API.JWT_URL + token,
              cache : false
          }).then(function(response) {
        	  //http 200 
              $log.debug('JWT(good) '+response.status + ' ' + response.statusText + ' ' + response.data);
              var tmp = angular.fromJson(response.data);    
              
              //since we now know token state, we can setup a promise that acts like verify had been invoked.
              _authenticated = new Promise(function(resolve,reject){
            	  resolve(true);            	  
              });
              
              _jwt = tmp.jwt;
              localStorage.jwt = tmp.jwt;
              
              return tmp.jwt; // return value of the promise
          }, function(response) {
        	  //http error
              $log.debug('JWT(bad) '+response.status + ' ' + response.statusText + ' ' + response.data);
              
              //since we now know token state, we can setup a promise that acts like verify had been invoked.
              _authenticated = new Promise(function(resolve,reject){
            	  resolve(false);            	  
              });
          });

          // RETURNING A PROMISE
          return q;
        }

        return {
            getAuthenticationState: function () {
                $log.debug('isAuthenticated: %o %o', this, _authenticated);
                if (_authenticated !== null) {
                    $log.debug('user already authenticated %o %o',_authenticated,_token);
                } else {
                    $log.debug('attempting to restore session from %o',localStorage.token);
                    var tmp = angular.fromJson(localStorage.token);
                    $log.debug('session restored : %o ',tmp);
                    _authenticated = this.validate_token(tmp);
                }
                return _authenticated;
            },
            validate_token: validate_token,
            introspect_token: introspect_token,
            token: function (){
            	$log.debug("AUTH.TOKEN returning %o ",this._token);
            	return this._token;
            }
        };
    }]);