(function ( window ) {

"use strict";

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
/*
 * 脚本/css文件加载器，支持加载js和css文件并解析，为XRequire和YRequire提供底层支持，也可以单独使用
 * 其中js有异步和同步两种模式，异步模式下有两种子模式：异步下载并解析，异步下载但不解析
 * 三种模式的实现方式分别是：
 * 同步：同步ajax请求获取脚本文本+全局eval，之后向document.head中插入script标签但阻止浏览器自动解析
 * 异步解析：script标签
 * 异步下载不解析：异步ajax请求获取脚本文本，之后向document.head中插入script标签但阻止浏览器自动解析（计划以此为基础实现CommonJS加载器）
 *
 * 接受一个数组作为参数，如果数组中的元素是对象，则会根据对象的path属性加载文件，并且将对象其他的属性设为script/link标签的html属性
 * 如果是一个字符串，则只加载文件
 * 接受的第二个参数为结束回调，接受一个数组为参数，在同步和普通异步模式下，该数组保存的是添加到页面中的所有script标签
 * 在异步下载但不解析模式下，该数组保存了所有下载的脚本的text
 *
 * 加载css文件：简单的创建一个link标签后插入head
 * 加载html文件：发送一个同步ajax请求，返回获得的responseText，只能一次加载一个html文件
 */
var loader = (function () {

    //私有的option对象
    var option = {
        root: "",
        mod: 'async'
    };

    //正则表达式
    var rinvalidAttr = /^\s*(src|href|type|path|rel)\s*$/,
    //是否为绝对路径
        rabsoluteUrl = /^\s*(?:http:\/\/|\/|\.\/|\.\.\/)/,
        rlastSlash = /\/$/;

    var head = document.head || document.getElementsByTagName('head')[0];

    //config方法，设置option对象，实例方法
    var config = function (opt) {

        for (var key in opt) {

            if (opt.hasOwnProperty(key) && option.hasOwnProperty(key)) {

                option[key] = opt[key];
            }
        }

        return this;
    };

    //全局eval，实例方法
    //如果使用了jshint来校验，需要手动设置忽略eval规则，否则会报错
    //copy了jQuery.globalEval的实现，确保在全局作用域下执行
    var globalEval = function (text) {

        (window.execScript || function (text) {

            window['eval'].call(window, text);
        })(text);
    };

    //工具函数，向document.head中插入一个script标签，但阻止浏览器自动解析其中的js代码
    var _insertScriptNotEval = function (script, src, scriptText) {

        head.appendChild(script);

        //制止浏览器自动执行script标签中的js代码，所以临时将type设为text之后插入文本
        script.type = "text";
        script.text = scriptText;

        //由于谷歌浏览器在修改script标签的src属性时依然会执行js代码，因此先设置src，后更改type
        script.src = src;
        //将type重置为text/javascript，不会执行其中的代码，在ff/chrome/ie7+下测试通过
        script.type = "text/javascript";
    };

    //判断是否为绝对路径或者以http://开头的url
    //如果是以上两种情况，忽略root而直接使用传入的绝对路径
    //如果不是，则在所有传入的路径前加上root
    var _modifyPath = function (path) {

        var root = option.root ? option.root.replace(rlastSlash, '') + "/" : "",
            isAbsoluteUrl = rabsoluteUrl.test(path);

        return isAbsoluteUrl ? path : root + path;
    };

    //工具函数，为script/link标签设置附加属性
    var _setAttr = function (file, script, isJs) {

        for (var attr in file) {

            if (file.hasOwnProperty(attr) && !rinvalidAttr.test(attr)) {

                script.setAttribute(attr, isJs && attr === 'data-main' ? modifyPath(file[attr]) : file[attr]);
            }
        }
    };

    //工具函数，发送一个同步ajax请求
    var _sendSyncRequest = function (src) {

        var xhrSync = new XMLHttpRequest();
        xhrSync.open("GET", src, false);
        xhrSync.send();

        if (xhrSync.status !== 200) {

            throw new Error(src + ':' + xhrSync.status + ' ' + xhrSync.statusText);
        }

        return xhrSync.responseText;
    };

    //加载js文件，实例方法
    var load = function () {

        //获取加载模式
        var mod = option.mod,
        //同步模式
            isSync = mod.search('async') === -1,
        //普通异步模式
            isAsync = mod.search('async') !== -1 && mod.search('noteval') === -1,
        //特殊异步模式，下载脚本但不解析
            isAsyncNotEval = mod.search('async') !== -1 && mod.search('noteval') !== -1;

        //需要加载的文件数组，循环中对数组中每一个元素的引用，是否为绝对url
        var files = arguments[0], file,
        //js脚本加载完成后执行的回调
            callback = arguments[1] || function () {
                    console.log('all loaded');
                };

        //计数器，在异步加载模式下使用
        //scripts中存放了加载完成后的一些数据，根据模式的不同会议
        var count = 0, scripts = [];

        //在循环中使用的变量
        var script, src, resText;

        for (var i = 0; i < files.length; i++) {

            file = files[i];

            //修正file对象
            file = typeof file === 'object' ? file : {path: file};
            //修正src
            src = _modifyPath(file.path);
            script = document.createElement('script');

            //同步加载模式
            //通过同步ajax请求获得script标签的内容，然后用eval执行
            //之后插入script标签，并且通过一些很奇怪的方法阻止浏览器自动解析新插入的script标签
            if (isSync) {

                resText = _sendSyncRequest(src);

                //手动解析js代码
                globalEval(resText);

                _insertScriptNotEval(script, src, resText);

                scripts.push(script);

                _setAttr(file, script, true);
            }
            //异步加载
            else {

                //普通异步模式，异步下载并解析脚本
                if (isAsync) {

                    script.src = src;
                    count++;

                    script.onload = script.onreadystatechange = function () {

                        if (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") {

                            //每一个js完成解析后会将计数器减1
                            //当计数器为0时触发结束回调
                            if (--count === 0) {

                                callback(scripts);
                            }
                        }
                    };

                    head.appendChild(script);

                    scripts.push(script);

                    _setAttr(file, script, true);
                }
                //特殊模式，异步下载脚本但不解析
                else if (isAsyncNotEval) {

                    count++;
                    //创造一个局部作用域，消除可能的闭包导致的引用问题
                    (function () {

                        var xhr = new XMLHttpRequest();
                        //这里给xhr设置src和file是为了消除闭包导致的引用问题
                        xhr.src = src;
                        xhr.file = file;
                        xhr.open("GET", src);

                        xhr.onreadystatechange = function () {

                            var script;

                            if (this.readyState == 4) {

                                if (this.status === 200) {

                                    //将获取的脚本文本加入scripts数组
                                    scripts.push(this.responseText);

                                    //向head插入一个script标签但制止浏览器自动解析脚本
                                    script = document.createElement('script');
                                    _insertScriptNotEval(script, this.src, this.responseText);

                                    //所有脚本下载完成后触发回调
                                    if (--count === 0) {

                                        callback(scripts);
                                    }

                                    _setAttr(this.file, script, true);
                                }
                                else {

                                    throw new Error(this.src + ':' + this.status + ' ' + this.responseText);
                                }
                            }
                        };

                        xhr.send();
                    })();
                }
            }
        }

        if (option.mod === 'sync') {

            callback(scripts);
        }
    };

    var loadCss = function (file) {

        file = typeof file === 'object' ? file : {path: file};

        var link = document.createElement('link'),
            rel = file.rel || "stylesheet";

        link.href = _modifyPath(file.path);
        link.rel = rel;

        _setAttr(file, link, false);

        head.appendChild(link);
    };

    var loadHtml = function (file) {

        return _sendSyncRequest(_modifyPath(file));
    };

    return {
        config: config,
        load: load,
        loadCss: loadCss,
        loadHtml: loadHtml,
        globalEval: globalEval
    };
})();
/**
 * CommonJS加载器，基于loader.js实现（提供了底层的功能，参见loader.js）
 * 实现原理：异步ajax+Function构造函数
 * 首先使用正则表达式读取主文件依赖，使用ajax请求脚本文本，之后递归生成依赖树结构
 * 然后使用new Function的方式”包裹“脚本文本，生成一个compile函数，并且接收一个mod对象作为参数，
 * mod对象的结构如下：
 * {
 * id:模块id，即js文件的路径
 * exports:js文件解析后生成的对象
 * compile:new Function生成的函数，执行以后生成exports对象
 * deps:本模块依赖的其他模块id列表
 * status:0/1/2模块状态，0为正在读取，1为已下载，2为已解析
 * }
 *
 * 支持加载css和html文件
 */

(function () {

    var rRequire = /require\s*\(\s*['"]\s*([^()"']+)\s*['"]\s*\)/g,
        rlastSlash = /\/$/,
        rJsfile = /\.js$/,
        rotherFile = /(?:(\.css)|(\.htm[l]?))$/;

    //主文件
    var entrance,
        module = {
            pending: 0
            //下面储存了模块信息
        },
    //一个保存依赖关系的数组，用来判断循环依赖
        depRelations = [],
        baseUrl;

    //修正baseUrl
    var _getBaseUrl = function (url) {

        return url ? url.replace(rlastSlash, '') + "/" : "";
    };

    //判断是否是js文件，如果文件不以.css/.html/.htm结尾，都认为是js文件
    var _isJs = function (path) {

        return !rotherFile.test(path);
    };

    //判断是否是css文件
    var _isCss = function (path) {

        return rotherFile.exec(path) ? !!rotherFile.exec(path)[1] : false;
    };

    var require = function (path) {

        if (!_isCss(path)) {

            var id = path.replace(rJsfile, ''),
                mod = module[id];

            if (mod.status === 1) {

                console.log('compling ' + mod.id);

                mod.compile(mod);
                mod.status = 2;
            }
            else if (mod.status === 0) {

                throw new Error("模块" + path + "未被正确加载！");
            }

            return mod.exports;
        }
        //加载css文件
        else if (_isCss(path)) {

            loader.loadCss(path);
        }
    };

    var _allLoaded = function (module) {

        module[entrance].compile(module);
        module[entrance].status = 2;
    };

    var _fetchAll = function (path, root, depId) {

        var id = path.replace(rJsfile, ''),
            mod,
            depRelation = depId + ' ' + id,
            reverse = id + ' ' + depId;

        root = depId ? root : '';

        //防止模块自己引用自己
        depRelations.push(depId + ' ' + depId);

        //检查循环引用
        if (depId) {

            if (_inArray(depRelations, depRelation) === -1) {

                depRelations.push(reverse);
            }
            else {

                throw new Error('循环引用：' + depId + ',' + id);
            }
        }

        if (!module[id]) {

            module.pending++;

            mod = module[id] = {};
            mod.id = id;
            mod.status = 0;
            mod.exports = {};

            loader.config({
                mod: 'async noteval',
                root: root
            });

            loader.load([path], function (scripts) {

                var result,
                    scriptText = scripts[0],
                    depModId;

                if (_isJs(path)) {

                    mod.compile = new Function("module", scriptText);
                }
                //处理html的情况，直接将responseText设为exports
                else if (!_isCss(path)) {

                    mod.compile = _noop;
                    mod.exports = scriptText;
                }

                mod.deps = [];
                mod.status = 1;

                //递归加载依赖
                while (result = rRequire.exec(scriptText)) {

                    depModId = result[1];

                    if (_inArray(mod.deps, depModId) === -1) {

                        mod.deps.push(depModId);

                        if (!rJsfile.test(depModId) && _isJs(depModId)) {

                            depModId = depModId + ".js";
                        }

                        _fetchAll(depModId, baseUrl, mod.id);
                    }
                }

                module.pending--;

                if (module.pending === 0) {

                    _allLoaded(module);
                }
            });
        }
    };

    //初始化，读取主文件中的依赖并递归生成依赖树
    (function () {

        var mainJs = (function () {

                var scripts = document.getElementsByTagName("script");

                for (var i = 0; i < scripts.length; i++) {

                    if (scripts[i].getAttribute('data-main')) {

                        return scripts[i];
                    }
                }
            })(),
            dataMain = mainJs.getAttribute('data-main');

        baseUrl = _getBaseUrl(mainJs.getAttribute('baseUrl'));
        entrance = dataMain.replace(rJsfile, '');

        _fetchAll(dataMain, baseUrl);
    })();

    window.require = require;
    window.XRequire = {
        require: require,
        getModule: function () {

            return module;
        },
        loader: loader
    };
})();

})( window );