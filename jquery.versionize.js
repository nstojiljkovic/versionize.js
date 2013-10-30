/***************************************************************
 *  Copyright notice
 *
 *  (c) 2013 Nikola Stojiljkovic <nikola.stojiljkovic(at)essentialdots.com>
 *  All rights reserved
 *
 *  This script is part of the TYPO3 project. The TYPO3 project is
 *  free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  The GNU General Public License can be found at
 *  http://www.gnu.org/copyleft/gpl.html.
 *
 *  This script is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  This copyright notice MUST APPEAR in all copies of the script!
 ***************************************************************/

; (function($) {
	$.fn.versionize = function(versionName, callback) {
		if (!$(this).length) {
			return this;
		}

		$(this).each(function(idx, el) {
			var $el = $(el),
				$elOriginal = $el.data('versionize-original') ? $el.data('versionize-original') : $el,
				$elSelectedVersion = null,
				versionString = 'versionize-ver-' + versionName;

//			window.console.log(versionName);
//			debugger;

			if (!$elOriginal.data(versionString)) {
				// create element's version
				$elSelectedVersion = $elOriginal.clone(true, true);
				// assign the version to the original element
				$elOriginal.data(versionString, $elSelectedVersion);
				// create reference to the original
				$elSelectedVersion.data('versionize-original', $elOriginal);

				// replaceWith works fine in Zepto, doesn't play nice with jQuery
				// $el.replaceWith($elSelectedVersion);
				$el.after($elSelectedVersion);
				$el.detach();

				if (callback && $.isFunction(callback)) {
					$.proxy(callback, $elSelectedVersion)();
				}
			} else {
				$elSelectedVersion = $elOriginal.data(versionString);

				if ($el.get(0) !== $elSelectedVersion.get(0)) {
					// replaceWith works fine in Zepto, doesn't play nice with jQuery
					// $el.replaceWith($elSelectedVersion);
					$el.after($elSelectedVersion);
					$el.detach();
				}
			}
		});

		return this;
	};

	/**
	 * Allows for registration of query handlers.
	 * Manages the query handler's state and is responsible for wiring up browser events
	 *
	 * @constructor
	 */
	function VersionizeDispatch () {
		if(!window.matchMedia) {
			throw new Error('matchMedia not present, legacy browsers require a polyfill');
		}
		if(!window.enquire) {
			throw new Error('enquire.js not present');
		}
	}

	function in_array(needle, haystack, argStrict) {
		var key = '',
			strict = !! argStrict;

		if (strict) {
			for (key in haystack) {
				if (haystack[key] === needle) {
					return true;
				}
			}
		} else {
			for (key in haystack) {
				if (haystack[key] == needle) {
					return true;
				}
			}
		}

		return false;
	}

	function removeA(arr) {
		var what, a = arguments, L = a.length, ax;
		while (L > 1 && arr.length) {
			what = a[--L];
			while ((ax= arr.indexOf(what)) !== -1) {
				arr.splice(ax, 1);
			}
		}
		return arr;
	}

	if(!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(what, i) {
			i = i || 0;
			var L = this.length;
			while (i < L) {
				if(this[i] === what) return i;
				++i;
			}
			return -1;
		};
	}

	var mediaQueries = {};
	var mediaQueryListeners = {};
	var mediaQueriesExcludes = {};
	var mediaQueriesInvertedExcludes = {};
	var fallbackQueries = [];
	var callbackObjects = {};
	var callbackDependencies = {};
	var matchQueriesCallbacks = {};
	var browserSupportsMatchMedia = window.matchMedia( 'only all' ).matches;
	var versionizeDispatchInitialized = false;
	var currentQueryMatch = [];
	var recursionLevel = 0;
	var maxRecursionLevel = 99;
	var initMatches = [];
	var executedMatches = {};
	var initElementsStack = [];

	function initialize($el, matches) {
		initMatches = matches || [];
		executedMatches = {};
		recursionLevel = 0;
		initElementsStack.push($el);
		if (initElementsStack.length > 2) {
			window.console.log('WARNING: Too many recursive calls to versionize.init. Number of calls: ' + initElementsStack.length);
		}
//		window.console.log('XXX: ' + initElementsStack.length);
//		window.console.log($el);

		for (var i = 0; i < currentQueryMatch.length ; i++) {
			var qN = currentQueryMatch[i];
			for (var j = 0; matchQueriesCallbacks[qN] && j < matchQueriesCallbacks[qN].length ; j++) {
				var cN = matchQueriesCallbacks[qN][j];
				initializeCallbackWithDependencies($el, cN, qN);
			}
		}

		initElementsStack.pop();
	};

	function initializeCallbackWithDependencies($el, cN, qN) {
		//window.console.log(cN + ', ' + qN);
		if (++recursionLevel <= maxRecursionLevel) {
			var depedencies = callbackDependencies[cN][qN] || [];
			for (var i = 0; i < depedencies.length ; i++) {
				initializeCallbackWithDependencies($el, depedencies[i], qN);
			}
			runCallback($el, cN, qN);
		} else {
			window.console.log('ERROR: Max recursion level reached for initializing callbacks. Did you make a circular dependency?');
		}
	}

	function runCallback($el, cN, qN) {
		//window.console.log('RUN CALLBACK: ' + cN + ', ' + qN);

		var hash = 'versionize-initOnce-'+cN+'-'+qN;
		var callback = callbackObjects[cN][qN] || {};
		if (!$el.data(hash)) {
			//window.console.log('INIT: ' + cN + ', ' + qN);
			$el.data(hash, true);
			if (callback['init']) {
				try {
					callback['init']($el);
				} catch (err) {
					window.console.log('EXCEPTION: ' + err.message);
				}
			}
		}
		if (callback['match'] && !executedMatches[cN+','+qN] && in_array(qN, initMatches)) {
			//window.console.log('MATCH: ' + cN + ', ' + qN);
			executedMatches[cN+','+qN] = true;
			try {
				callback['match']($el);
			} catch (err) {
				window.console.log('EXCEPTION: ' + err.message);
			}
		}
	}

	VersionizeDispatch.prototype = {

		registerQuery: function(n, query, excludeIfMatchedQueries, noMatchMediaFallback) {
			mediaQueries[n] = query;
			mediaQueriesExcludes[n] = excludeIfMatchedQueries;
			$.each(excludeIfMatchedQueries || [], function(i, nE) {
				if (!mediaQueriesInvertedExcludes[nE]) {
					mediaQueriesInvertedExcludes[nE] = [];
				}
				if (!in_array(n, mediaQueriesInvertedExcludes[nE])) {
					mediaQueriesInvertedExcludes[nE].push(n);
				}
			});

			if (noMatchMediaFallback && !in_array(n, fallbackQueries)) {
				fallbackQueries.push(n);
			}
		},

		registerCallback: function (n, matchQueries, dependencies, callbacks) {
			if (!callbackObjects[n]) {
				callbackObjects[n] = {};
			}if (!callbackDependencies[n]) {
				callbackDependencies[n] = {};
			}
			if (typeof matchQueries === 'string') {
				matchQueries = [matchQueries];
			}
			if (typeof matchQueries === 'object') {
				for (var i = 0; i < matchQueries.length ; i++) {
					callbackObjects[n][matchQueries[i]] = callbacks;
					callbackDependencies[n][matchQueries[i]] = dependencies || [];
					if (!matchQueriesCallbacks[matchQueries[i]]) {
						matchQueriesCallbacks[matchQueries[i]] = [n];
					} else {
						matchQueriesCallbacks[matchQueries[i]].push(n);
					}
				}
			}
		},

		isQueryActive: function(n) {
			return in_array(n, currentQueryMatch);
		},

		init: function($el) {
			if (!versionizeDispatchInitialized) {
				versionizeDispatchInitialized = true;

				$.each(mediaQueries, function(n, query){
					var mediaQueryListener = {
						mediaQuery : query,
						mediaQueryName : n,
						deferSetup : false
					};
					mediaQueryListeners[n] = mediaQueryListener;

					mediaQueryListener.setup = $.proxy(function() {
						//window.console.log('setup: ' + this.mediaQueryName);
					}, mediaQueryListener);

					mediaQueryListener.match = $.proxy(function() {
						if (browserSupportsMatchMedia) {
							var exclude = false;
							$.each(mediaQueriesExcludes[this.mediaQueryName], function(i, nE) {
								exclude = exclude || window.matchMedia( mediaQueries[nE] ).matches;

								if (exclude) {
									return false;
								}
							});

							if (exclude) {
								this.unmatch();
							} else {
								// unmatch listeners which depend on current one being unmatched
								$.each(mediaQueriesInvertedExcludes[this.mediaQueryName] || [], function(i, nE) {
									if (window.matchMedia( mediaQueries[nE] ).matches && mediaQueryListeners[nE]) {
										mediaQueryListeners[nE].unmatch();
									}
								});

								// add query to the current array
								if (!in_array(this.mediaQueryName, currentQueryMatch)) {
									currentQueryMatch.push(this.mediaQueryName);
								}
								//window.console.log('MATCH: ' + this.mediaQueryName);
								//window.console.log(currentQueryMatch);
								initialize($('html'), [this.mediaQueryName]);
							}
						} else {
							if (!in_array(this.mediaQueryName, currentQueryMatch)) {
								currentQueryMatch.push(this.mediaQueryName);
							}
							//window.console.log('MATCH: ' + this.mediaQueryName);
							//window.console.log(currentQueryMatch);
							initialize($('html'), [this.mediaQueryName]);
						}
					}, mediaQueryListener);

					mediaQueryListener.unmatch = $.proxy(function() {
						if (in_array(this.mediaQueryName, currentQueryMatch)) {
							removeA(currentQueryMatch, this.mediaQueryName);
						}
						//window.console.log('unmatch: ' + this.mediaQueryName);
						//window.console.log(currentQueryMatch);

						// match listeners which depend on current one being unmatched
						$.each(mediaQueriesInvertedExcludes[this.mediaQueryName] || [], function(i, nE) {
							if (window.matchMedia( mediaQueries[nE] ).matches && mediaQueryListeners[nE]) {
								mediaQueryListeners[nE].match();
							}
						});
					}, mediaQueryListener);
				});

				if (browserSupportsMatchMedia) {
					$.each(mediaQueryListeners, function(i, mediaQueryListener) {
						enquire.register(mediaQueryListener.mediaQuery, mediaQueryListener, false);
					});
				} else {
					$.each(fallbackQueries, function(i, n) {
						mediaQueryListeners[n].match();
					});
				}
			}

			initialize($el, currentQueryMatch);
		}
	};

	window.versionize = window.versionize || new VersionizeDispatch();

})(typeof jQuery === 'undefined' ? $ : jQuery);
