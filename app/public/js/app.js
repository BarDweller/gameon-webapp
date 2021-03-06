/*!
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements;
 * and to You under the Apache License, Version 2.0.
 */
'use strict';

/**
 * @ngdoc overview
 * @name playerApp
 * @description
 * # playerApp
 *
 * Main module of the application.
 */

var baseUrl = window.location.host;

// Angular templates (used to feed $templateCache)
//angular.module('templates', []);

angular.module('playerApp', ['ngResource', 'ngSanitize', 'ui.router', 'ngWebSocket', 'luegg.directives', 'hc.marked', 'templates'])
  .run(
    ['$rootScope', '$state', '$stateParams',
      function ($rootScope, $state, $stateParams) {
        // make life easier
        $rootScope.$on("$stateChangeError", console.log.bind(console));

        // From https://github.com/angular-ui/ui-router/blob/gh-pages/sample/app/app.js
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
      }
    ])
  .constant("API", {
    "HOST": baseUrl,
    "PROFILE_URL": "https://" + baseUrl + "/players/v1/",
    "WS_URL": "wss://" + baseUrl + "/mediator/ws/",
    "CERT_URL": "https://" + baseUrl + "/auth/PublicCertificate",
    "GOOGLE": "https://" + baseUrl + "/auth/GoogleAuth",
    "TWITTER": "https://" + baseUrl + "/auth/TwitterAuth",
    "FACEBOOK": "https://" + baseUrl + "/auth/FacebookAuth",
    "GITHUB": "https://" + baseUrl + "/auth/GitHubAuth",
    "REDHAT": "https://" + baseUrl + "/auth/RedHatAuth",
    "DUMMY": "https://" + baseUrl + "/auth/DummyAuth?dummyUserName=DevUser&callbackHost=https://" + baseUrl
  })
  .config(['markedProvider', function (markedProvider) {
    markedProvider.setOptions({ sanitize: true });
  }])
  .config(['$locationProvider', function ($locationProvider) {
    $locationProvider.hashPrefix('');
  }])
  .config(
    ['$stateProvider', '$urlServiceProvider',
      function ($stateProvider, $urlServiceProvider) {

        // Use $urlServiceProvider to configure any redirects (when) and invalid urls (otherwise).
        // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
        $urlServiceProvider.rules
          .otherwise('/');

        //////////////////////////
        // State Configurations

        $stateProvider
          .state('default', {
            url: '/',
            templateUrl: '/default.html',
            controller: 'DefaultCtrl as ctrl',
            onEnter: function (go_ga) {
              console.info("state -> default");
              go_ga.hit('default');
            }
          })
          .state('default.terms', {
            url: '^/terms'
          })
          .state('default.login', {
            url: '^/login',
            onEnter: function (auth, go_ga) {
              console.info("state -> default.login");
              auth.setStartingState('default.login');
              go_ga.hit('login');
              go_ga.report('send', 'event', 'GameOn', 'App', 'login');
            }
          })
          .state('default.auth', {
            url: '^/login/callback/{jwt:.*}',
            // State triggered by authentication callback (only).
            onEnter: function ($state, $stateParams, auth) {
              console.info("state -> default.auth using %o", auth);
              auth.get_public_key(
                function () {
                  console.log("got public cert.. proceeding to jwt validation.");
                  // remember jwt for later
                  auth.remember_jwt($stateParams.jwt);
                  $state.go('default.validatejwt');
                },
                function () {
                  auth.logout();
                  $state.go('default.yuk');
                });
            }
          })
          .state('default.validatejwt', {
            // State triggered by default.auth after obtaining public key
            onEnter: function ($state, auth, go_ga) {
              console.info("state -> default.validatejwt using %o", auth);
              if (auth.validate_jwt()) {
                console.log("token callback from auth service was valid");
                go_ga.report('send', 'event', 'GameOn', 'App', 'login-pass');
                $state.go('default.usersetup');
              } else {
                //TODO: goto a login failed page..
                go_ga.report('send', 'event', 'GameOn', 'App', 'login-fail');
                $state.go(auth.getStartingState());
              }
            }
          })
          .state('default.usersetup', {
            url: '^/login/usersetup',
            // State triggered by default.validatejwt
            onEnter: function ($state, auth, user, go_ga) {
              console.info("state -> default.usersetup");
              var jwt = auth.get_jwt();
              if (jwt !== null) {
                // Verify the returned token...
                go_ga.hit('usersetup');
                console.log("building user object; token info object was %o", jwt);
                // user.load returns a promise that resolves to true if the user was found, or false.
                user.load(jwt.id, jwt.name).then(function (userKnownToDB) {
                  if (userKnownToDB) {
                    go_ga.report('send', 'event', 'GameOn', 'App', 'login-existing');
                    $state.go('play.room');
                  } else {
                    go_ga.report('send', 'event', 'GameOn', 'App', 'login-new');
                    $state.go('default.profile');
                  }
                });
              } else {
                // cached / recovered token was invalid.
                // TODO: goto a login failed page..
                go_ga.report('send', 'event', 'GameOn', 'App', 'login-missing-token');
                $state.go(auth.getStartingState());
              }
            }
          })
          .state('default.profile', { // initial profile creation
            url: '^/login/profile',
            onEnter: function ($state, user, auth, go_ga) {
              console.info("state: default.profile: %o", user);
              // if we're missing our auth token info.. user may have hit refresh here..
              // since we've just lost all our context, send them back to the start..
              // mebbe can make this nicer ;p
              if ( user.profile.name != null ) {
                go_ga.hit('profile');
                console.log("default.profile.onEnter has this %o with %o", user.profile.name, auth);
              } else {
                console.log("Missing user info.. redirecting.. ");
                $state.go('default.usersetup');
              }
            }
          })
          .state('default.yuk', {
            url: '^/yuk',
          })
          .state('redhat', {
            url: '^/redhat',
            templateUrl: '/redhat.html',
            controller: 'RedHatCtrl as redhatCtrl',
            onEnter: function (go_ga) {
              console.info("state -> redhat");
              go_ga.hit('redhat');
              go_ga.report('send', 'event', 'GameOn', 'App', 'redhat-intro');
            }
          })
          .state('redhat.login', {
            url: '^/redhat/login',
            onEnter: function (auth, go_ga) {
              console.info("state -> redhat.login");
              auth.setStartingState('redhat');
              go_ga.hit('redhat');
              go_ga.report('send', 'event', 'GameOn', 'App', 'redhat-login');
            }
          })
          .state('play', {
            // With abstract set to true, that means this state can not be explicitly activated.
            // It can only be implicitly activated by activating one of its children.
            abstract: true,
            url: '/play',
            templateUrl: '/play.html',
            controller: 'PlayCtrl as play',
            resolve: {
              // a fictional var that we'll have injected to onEntry and into the PlayCtrl.
              // resolve will make sure we don't create PlayCtrl or enter onEntry until
              // the promises below are all complete.
              "userAndAuth": function (auth, user, $state) {
                return auth.getAuthenticationState().then(function (isAuthenticated) {
                  if (!isAuthenticated) {
                    $state.go(auth.getStartingState());
                  } else {
                    if (typeof user.profile._id === 'undefined') {
                      $state.go('default.usersetup');
                    }
                  }
                });
              }
            },
            onEnter: function ($state, auth, user, userAndAuth) {
              console.log("In play state", user, auth, userAndAuth);
            }
          })
          .state('play.room', {
            url: '',
            templateUrl: '/play.room.html',
            onEnter: function (go_ga) {
              go_ga.hit('game_screen');
              go_ga.report('send', 'event', 'GameOn', 'App', 'play');
            }
          })
          .state('play.myrooms', {
            url: '/myrooms',
            templateUrl: '/play.myrooms.html',
            onEnter: function (go_ga) {
              go_ga.hit('room_editor');
              go_ga.report('send', 'event', 'GameOn', 'App', 'edit_rooms');
            }
          })
          .state('play.me', {
            url: '/me',
            templateUrl: '/play.me.html',
            onEnter: function (go_ga, user) {
              user.refresh();
              go_ga.hit('profile_editor');
              go_ga.report('send', 'event', 'GameOn', 'App', 'edit_profile');
            }
          });
      }
    ]);
