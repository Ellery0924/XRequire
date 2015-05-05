var _inArray = function (arr, value) {

    var ret = -1;

    for (var i = 0; i < arr.length; i++) {

        if (arr [i] === value) {
            ret = i;
        }
    }

    return ret;
};

var _noop = function () {
};

//shim console
if (!window.console) {

    window.console = {
        log: _noop,
        warn: _noop,
        error: _noop
    }
}