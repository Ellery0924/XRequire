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

var rRequire = /require\s*\(\s*['"]\s*([^()"']+)\s*['"]\s*\)/g,
    rJsfile = /\.js(\?.*)?$/,
    rlastSlash = /\/$/,
    rotherFile = /(?:(\.css)|(\.htm[l]?))(\?.*)?$/;

//主文件
var entrance,
    module = {
        pending: 0
        //下面储存了模块信息
    },
//一个保存依赖关系的数组，用来判断循环依赖
    depRelations = [],
    baseUrl;

var getBaseUrl = function (url) {

    return url ? url.replace(rlastSlash, '') + "/" : "";
};

var require = function (path) {

    var isJs = !rotherFile.test(path),
        isCss = rotherFile.exec(path) ? !!rotherFile.exec(path)[1] : false,
        isHtml = rotherFile.exec(path) ? !!rotherFile.exec(path)[2] : false;

    if (isJs) {

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
    else if (isCss) {

        loader.load([path]);
    }
    else if (isHtml) {

        return loader.load([path]);
    }
};

var fetchAll = function (path, root, depId) {

    var id = path.replace(rJsfile, ''),
        mod,
        depRelation = depId + ' ' + id,
        reverse = id + ' ' + depId;

    root = depId ? root : '';

    //检查循环引用
    if (depId) {

        if (inArray(depRelations, depRelation) === -1) {

            depRelations.push(reverse);
        }
        else {

            throw new Error('循环引用：' + depId + ',' + id);
        }
    }

    if (!module[id] && !rotherFile.test(path)) {

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

            var result, scriptText = scripts[0], depModId;

            mod.compile = new Function("module", scriptText);
            mod.deps = [];
            mod.status = 1;

            while (result = rRequire.exec(scriptText)) {

                depModId = result[1];

                if (inArray(mod.deps, depModId) === -1) {

                    mod.deps.push(depModId);

                    if (!rJsfile.test(depModId) && !rotherFile.test(depModId)) {

                        depModId = depModId + ".js";
                    }

                    fetchAll(depModId, baseUrl, mod.id);
                }
            }

            module.pending--;

            if (module.pending === 0) {

                allLoaded(module);
            }
        });
    }
};

var allLoaded = function (module) {

    module[entrance].compile(module);
    module[entrance].status = 2;
};

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

    baseUrl = getBaseUrl(mainJs.getAttribute('baseUrl'));
    entrance = dataMain.replace(rJsfile, '');

    fetchAll(dataMain, baseUrl);
})();

window.require = require;
window.XRequire = {
    require: require,
    loader: loader,
    module: module
};
