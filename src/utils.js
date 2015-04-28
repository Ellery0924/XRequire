/**
 * Created by Ellery1 on 15/4/27.
 */

var inArray = function (arr, value) {

    var ret = -1;

    for (var i = 0; i < arr.length; i++) {

        if (arr [i] === value) {
            ret = i;
        }
    }

    return ret;
};

var noop = function () {
};

//shim console
if (!window.console) {

    window.console = {
        log: noop,
        warn: noop,
        error: noop
    }
}