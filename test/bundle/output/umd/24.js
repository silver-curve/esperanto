/* this is a banner */
(function (global, factory) {

	'use strict';

	if (typeof define === 'function' && define.amd) {
		// export as AMD
		define([], factory);
	} else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
		// node/browserify
		factory();
	} else {
		// browser global
		global.myModule = {};
		factory();
	}

}(typeof window !== 'undefined' ? window : this, function () {

	'use strict';

	function foo () {
		console.log( 'fooing' );
	}

	function bar () {
		console.log( 'baring' );
	}

	foo();
	bar();

}));
/* this is a footer */