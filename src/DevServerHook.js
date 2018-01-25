// 负责跟webpack devServer 通讯 试试维护

// import {join} from "path";
const WebSocket = require('ws');
const branchFetch = require('git-branch');
const merge = require('merge');
const proxy = require('express-http-proxy');
const {existsSync} = require('fs');
const chokidar = require('chokidar');
const chalk = require('chalk');
// const write = require('write-file-stdout');
const util = require('util');
const getPaths = require('./getPaths');
const {createServerFromLocalFile, createServer} = require('./ServerCreator');
const {MockServer} = require('./MockServer');

const DEFAULT_PORT = 9090;
const portFinder = require('portfinder');

const paths = getPaths(process.cwd());
const configFile = paths.resolveApp('.api.mock.js');

function getConfig() {
    if (existsSync(configFile)) {
        // disable require cache
        // Object.keys(require.cache).forEach(file => {
        //     if (file === configFile || file.indexOf(mockDir) > -1) {
        //         debug(`delete cache ${file}`);
        //         delete require.cache[file];
        //     }
        // });
        return require(configFile);
    }
}

function createProxy(method, path, target) {
    return proxy(target, {
        filter(req) {
            return method ? req.method.toLowerCase() === method.toLowerCase() : true;
        },
        proxyReqPathResolver(req) {
            // console.log('我的要求地址:');
            return 'http://' + target + req.originalUrl;
        },
        // forwardPath(req) {
        //     let matchPath = req.originalUrl;
        //     const matches = matchPath.match(path);
        //     if (matches.length > 1) {
        //         matchPath = matches[1];
        //     }
        //     return join(winPath(url.parse(target).path), matchPath);
        // },
    });
}


function toProxy(server, port) {
    var proxy = {};
    const mockServerUrl = util.format('http://localhost:%d', port);
    new Set(server.uris.map(data => {
        return data.path;
    })).forEach(uri => {
        proxy[uri] = {
            target: mockServerUrl,
            secure: false
        };
    });
    return proxy;
}

function setupStaticServer(home, options) {
    return new Promise((resolve, reject) => {
        portFinder.basePort = DEFAULT_PORT;
        portFinder.getPort((err, port) => {
            if (err) {
                reject(err);
                return;
            }
            // 现在port有了
            // 现在要配置 option
            try {
                var server = new MockServer(home);
                // 将uris 转换成proxy
                server.start(port);
                var myProxy = toProxy(server, port);
                options.proxy = merge(options.proxy || {}, myProxy);
                resolve(options);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function addProxy(server, app, port) {
    // https://github.com/chimurai/http-proxy-middleware/issues/40#issuecomment-163398924
    server.uris.forEach(data => {
        app.use(data.path, createProxy(data.method, data.path, 'localhost:' + port));
        // console.log('proxy for ', data.path, ' method:', data.method, ' to:' + 'localhost:' + port);
    });
    return server.uris.length;
}

function setupServer(devServer, home, watcher) {
    return new Promise((resolve, reject) => {
        portFinder.basePort = DEFAULT_PORT;
        portFinder.getPort((err, port) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                // 现在port有了
                // 现在要配置 option
                var server = new MockServer(home);
                // 将uris 转换成proxy
                server.start(port);

                const {app} = devServer;
                // 添加proxy

                var toLog = `${util.format("%j", app._router.stack)}`;
                var apiLength = addProxy(server, app, port);
                toLog += `\n\n\n${util.format("%j", app._router.stack)}`;

                // 调整 stack，把 historyApiFallback 放到最后
                let lastIndex = null;
                app._router.stack.forEach((item, index) => {
                    if (item.name === 'webpackDevMiddleware') {
                        lastIndex = index;
                    }
                });
                // const mockAPILength = app._router.stack.length - 1 - lastIndex;
                if (lastIndex && lastIndex > 0) {
                    const newStack = app._router.stack;
                    newStack.push(newStack[lastIndex - 1]);
                    newStack.push(newStack[lastIndex]);
                    newStack.splice(lastIndex - 1, 2);
                    app._router.stack = newStack;
                }

                //把 最后一个之外 其他apiLength 都移动到 p开始的位置
                let firstPareserIndex = null;
                app._router.stack.forEach((item, index) => {
                    if ((item.name === 'jsonParser' || item.name === 'urlencodedParser') && firstPareserIndex == null) {
                        firstPareserIndex = index;
                    }
                });
                let firstProxyIndex = null;
                app._router.stack.forEach((item, index) => {
                    if ((item.name === 'handleProxy') && firstProxyIndex == null) {
                        firstProxyIndex = index;
                    }
                });
                toLog += `\n\n\n${util.format("%j", app._router.stack)}`;
                const newStack = app._router.stack;
                var apiStacks = newStack.splice(firstProxyIndex, apiLength);
                toLog += `\n\n\n取出新增的api\n${util.format("%j", apiStacks)}`;
                toLog += `\n\n\n添加到新位置:${firstPareserIndex}`;
                for (var i = 0; i < apiStacks.length; i++) {
                    newStack.splice(firstPareserIndex + i, 0, apiStacks[i]);
                }
                app._router.stack = newStack;
                toLog += `\n\n\n${util.format("%j", app._router.stack)}`;

                // 测试下将相关代理移除
                // app._router.stack.splice(firstPareserIndex, apiLength);
                // toLog += `\n\n\n${util.format("%j",app._router.stack)}`;
                // write('same.log',toLog);

                watcher(() => {
                    app._router.stack.splice(firstPareserIndex, apiLength);
                    if (server) {
                        // console.log(server);
                        server.stop();
                        server = null;
                    }
                    return hook(devServer);
                });

                resolve({server, apiLength});
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * 使用远程响应作为服务器
 *
 * @param {Object} config 相关配置
 * @param {String} dir 目录
 * @returns {Promise<String>} 完成建立之后的目录
 */
function forRemote(config, dir) {
    // https://www.npmjs.com/package/git-branch
    var branchPromise;
    if (config.branch)
        branchPromise = Promise.resolve(config.branch);
    else {
        branchPromise = new Promise((resolve, reject) => {
            branchFetch((err, str) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(str);
            })
        });
    }
    return new Promise((resolve, reject) => {
        branchPromise
            .then(branch => {
                createServer(config.ssl ? 'https://' : 'http://' + config.apiServerHost + '/projectApiJson/' + config.projectId + '/' + branch, dir)
                    .then(() => {
                        config.branch = branch;
                        resolve(dir);
                    }).catch(reject);
            })
            .catch(reject);
    })

}

/**
 * 使用本地文件建立服务器
 * @param {String} filePath 本地api文件
 * @param {String} dir 目录
 * @returns {Promise<String>} 完成建立之后的目录
 */
function forLocalFile(filePath, dir) {
    // Promise
    return createServerFromLocalFile(filePath, dir)
        .then(() => dir);
}

/**
 *
 * @return {boolean} 是否应该启用hook
 */
function shouldHook() {
    const config = getConfig();
    return config !== undefined;
}

/**
 * 绑定到webpack devServer
 * @param devServer
 */
function hook(devServer) {
    const config = getConfig();
    // 配置中包括 localApiFile 或者 projectId

    return hookWithConfig(devServer, config);
}

/**
 * 静态hook，一次性给出新的webpack dev server options
 * @param {*} options
 */
function staticHook(options) {
    const config = getConfig();
    return hookWithConfig(null, config, options);
}

function createWebSocket(config, target) {
    const url = config.ssl ? 'wss' : 'ws' + '://' + config.apiServerHost + '/watchProjectApi/' + config.projectId + '/' + config.branch;
    // console.debug('target url:' + url);
    const ws = new WebSocket(url);
    // ws.onopen = () => {
    //     console.debug('open webSocket!');
    // };
    var jobFinish = false; // 任务是否完成，一个已完成的任务 无需再度建立链接
    var WIP = false; // 工作是否在进行中
    ws.onmessage = evt => {
        if (jobFinish)
            return;
        console.log(chalk.green('ONLINE CHANGED: ', evt.data));
        if (WIP) {
            console.warn(chalk.yellow('but we are building...'));
            return;
        }
        target()
            .then(() => {
                WIP = false;
                jobFinish = true;
                ws.close();
            })
            .catch((e) => {
                WIP = false;
                console.error(e);
                console.log(chalk.cyan('Please visit ' + config.ssl ? 'https' : 'http' + '://' + config.apiServerHost +
                    '/editor/' + config.projectId + '/' + config.branch + ' to make right.'));
            });
        WIP = true;
    };
    ws.onclose = () => {
        if (jobFinish)
            return;
        console.log(chalk.red('RECONNECT...'));
        createWebSocket(config, target);
    }
}

function hookWithConfig(devServer, config, options) {
    if (!config)
        return;
    const {localApiFile, mockDir} = config;
    const mockServerDir = paths.appDirectory + "/" + (mockDir || '.mock');

    // 锁定本地文件，若更新时 则放弃掉原MockServer并且调整devServer的Proxy
    // 研究下这个devServer到底是什么鬼 可以api化的空间
    var forDir;
    var watcher;
    if (localApiFile) {
        forDir = forLocalFile(localApiFile, mockServerDir);
        watcher = function (target) {
            const watcher = chokidar.watch(localApiFile);

            var WIP = false;
            watcher.on('change', path => {
                console.log(chalk.green('CHANGED'), path.replace(paths.appDirectory, '.'));
                if (WIP)
                    return;
                target()
                    .then(() => {
                        WIP = false;
                        watcher.close();
                    })
                    .catch((e) => {
                        WIP = false;
                        console.error(e);
                        console.log(chalk.cyan('make it right, system will try later.'));
                    });
                WIP = true;
            })
        };
    } else if (config.projectId) {
        config.apiServerHost = config.apiServerHost || 'csm.lmjia.cn';
        config.useGitBranch = config.useGitBranch || !config.branch;
        forDir = forRemote(config, mockServerDir);
        watcher = function (target) {
            forDir.then(() => {
                createWebSocket(config, target);
            });
        };
    } else
        throw 'localApiFile必须被声明';

    if (devServer != null) {
        return forDir
            .then(() => setupServer(devServer, mockServerDir, watcher));
    } else {
        return forDir.then(dir => setupStaticServer(dir, options));
    }
}

module.exports = {hook, staticHook, shouldHook, hookWithConfig};
