!(function ($) {
	function fn(host, options) {
		var path;

		if (typeof host !== 'string') {
			options = host;
			host = window.location.host;
		}

		return new io.Socket(host, options);
	}

	$.ender({io: fn});
}(ender));
