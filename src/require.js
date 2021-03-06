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
