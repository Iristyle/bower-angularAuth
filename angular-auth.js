/**
 * @license Angular Auth
 * (c) 2012 Witold Szczerba
 * License: MIT
 */
angular.module('angular-auth', [])

/**
 * Holds all the requests which failed due to 401 response,
 * so they can be re-requested in the future, once login is completed.
 */
    .factory('requests401', ['$injector', function($injector) {
    var buffer = [];
    var $http; //initialized later because of circular dependency problem
    function retry(config, deferred) {
        $http = $http || $injector.get('$http');
        $http(config).then(function(response) {
            deferred.resolve(response);
        });
    }

    return {
        add: function(config, deferred) {
            buffer.push({
                config: config,
                deferred: deferred
            });
        },
        retryAll: function() {
            for (var i = 0; i < buffer.length; ++i) {
                retry(buffer[i].config, buffer[i].deferred);
            }
            buffer = [];
        }
    };
}])

/**
 * $http interceptor.
 * On 401 response - it stores the request and broadcasts 'event:angular-auth-loginRequired'.
 */
    .config(function($httpProvider) {
        var interceptor = function($rootScope, $q, requests401) {
            function success(response) {
                return response;
            }

            function error(response) {
                var status = response.status;
                //We're only going to worry about 401s that come back from the ping service
                if (status == 401 && /.*\/ping/i.test(response.config.url)) {
                    var deferred = $q.defer();
                    requests401.add(response.config, deferred);
                    $rootScope.$broadcast('event:angular-auth-loginRequired');
                    return deferred.promise;
                }
                // otherwise
                return $q.reject(response);
            }

            return function(promise) {
                return promise.then(success, error);
            };

        };
        $httpProvider.responseInterceptors.push(interceptor);
    });
