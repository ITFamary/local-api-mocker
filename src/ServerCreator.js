/**
 * 负责建立一个服务器的配置
 * Created by CJ on 07/12/2017.
 */
const getUri = require('get-uri');
const fs = require('fs');
const toString = require('stream-to-string');
const isString = require('lodash.isstring');
const clone = require('clone');
const rimraf = require('rimraf');
const util = require('util');
const path = require('path');


/**
 * 编写期望目标请求类型的代码
 * @param array 期望类型
 * @return {*} 代码buffer
 */
function writeExceptedContentType(array) {
    if (!array)
        return Buffer.alloc(0);
    // 对象自动处理成object
    if (!Array.isArray(array)) {
        array = [array];
    }
    if (array.length === 0)
        return Buffer.alloc(0);
    var str;
    str = ('if (');
    for (var i = 0; i < array.length; i++) {
        if (i !== 0) {
            str = str + ('&&');
        }
        str = str + util.format('!req.is("%s")', array[i]);
    }

    str = str + (') {\nres.status(400).end("bad content type");\n' +
        '            return;\n' +
        '        }');
    return Buffer.from(str);
}

/**
 * 将array里的数据保存到dist中 以其中name为key；当然name是必须存在的
 * @param dist
 * @param array
 */
function arrayToObjectJSON(dist, array) {
    if (!array)
        return;
    // 对象自动处理成object
    if (!Array.isArray(array)) {
        array = [array];
    }
    array.forEach(function (value) {
        var target = JSON.parse(JSON.stringify(value));
        delete target.name;
        delete target.in;
        dist[value.name] = target;
    })
}

/**
 * 编写「获取参数」的代码块
 * body,header,path,query,formData
 * @param array 配置
 * @param supplier 生成器
 * @return {*} 代码buffer
 */
function writeParameter(array, supplier) {
    if (!array)
        return Buffer.alloc(0);
    // 对象自动处理成object
    if (!Array.isArray(array)) {
        array = [array];
    }
    if (array.length === 0)
        return Buffer.alloc(0);
    var str = '';
    array.forEach(function (value) {
        // parameters.goodId = req.params.goodId;
        // writeParameter(api.uriParameter, name => util.format('req.params.%s', name)),
        //     writeParameter(api.formParameter, name => util.format('req.body.%s || req.query.%s', name, name)),
        //     writeParameter(api.jsonParameter, name => util.format('req.body.%s', name)),
        switch (value.in) {
            case 'body':
                str = str + util.format('parameters.%s = req.body;\n', value.name);
                break;
            case 'header':
                str = str + util.format('parameters.%s = req.get(\"%s\");\n', value.name, value.name);
                break;
            case 'path':
                str = str + util.format('parameters.%s = req.params.%s;\n', value.name, value.name);
                break;
            case 'query':
                str = str + util.format('parameters.%s = req.query.%s;\n', value.name, value.name);
                break;
            case 'formData':
                str = str + util.format('parameters.%s = req.body.%s || req.query.%s;\n', value.name, value.name, value.name);
                break;
            default:
                throw 'do not know about in:' + value.in;
        }
    });
    return Buffer.from(str);
}

/**
 * 从一个可脚本化的地方生成代码
 * @param part 需控制的部分
 * @param tag 类别
 * @return {string|*} 代码
 */
function generateCodeFromPart(part, tag) {
    // 如果是字符串则直接渲染 如果是对象则
    if (isString(part)) {
        return util.format('"%s"', part);
    }
    if ((part instanceof Object) && part.script) {
        return util.format('new vm.Script("%s").runInContext(context)', part.script);
    }
    throw 'excepted ' + tag + '`s type String or Object, but ' + (typeof  part);
}

/**
 * 将代码按照既定Mapper进行转换
 * @param part 可能是一个对象也可能是数个对象
 * @param mapper 转换者
 * @return {Buffer}
 */
function generateCodeBufferFromParts(part, mapper) {
    var parts;
    if (!part) {
        parts = [];
    } else if (!Array.isArray(part)) {
        parts = [part];
    } else
        parts = part;
    if (parts.length === 0)
        return Buffer.alloc(0);

    return Buffer.concat(parts.map(mapper));
}

function _renderResultCode(beforePromiseBuffer, coreBuffer, promiseBuffer, end) {
    return Buffer.concat([
        Buffer.from('{\n'),
        beforePromiseBuffer,
        Buffer.from('var allPromises=[];\n'),
        promiseBuffer,
        Buffer.from('Promise.all(allPromises)\n' +
            '               .then(()=>{\n'),
        coreBuffer,
        Buffer.from('})\n'),
        end ? Buffer.from('\nreturn;\n}\n') : Buffer.from('\n}\n')
    ]);
}

/**
 * 渲染某一结果
 * @param end 是否应该追加return;
 * @param result 结果规格
 */
function renderResultCode(result, end = false) {
    var cookieCount = 0;
    var cookies = result.cookies || {};
    var cookieBuffer = Buffer.concat(Object.keys(cookies).map(name => {
        cookieCount++;
        var cookie = cookies[name];
        return util.format('var _cookieSchema%d = buildJsonSchema(%j,context);\nallPromises.push(exportJson(definitions, _cookieSchema%d).then(rs => {\n' +
            'if (rs)\n' +
            '            res.cookie("%s", rs);\n' +
            '        else\n' +
            '            res.clearCookie("%s");\n' +
            '            }));\n', cookieCount, cookie, cookieCount, name, name);
    }).map(str => Buffer.from(str)));

    var headerCount = 0;
    var headers = result.headers || {};
    var headerBuffer = Buffer.concat(Object.keys(headers).map(name => {
        headerCount++;
        var header = headers[name];
        return util.format('var _headerSchema%d = buildJsonSchema(%j,context);\nallPromises.push(exportJson(definitions, _headerSchema%d).then(rs => {\n' +
            '                res.set("%s", rs);\n' +
            '            }));\n', headerCount, header, headerCount, name);
    }).map(str => Buffer.from(str)));

    var sleepBuffer;
    if (result.hold) {
        // 默认1-3
        sleepBuffer = Buffer.from(util.format('sleep(%j);\n', result.hold));
    } else {
        sleepBuffer = Buffer.alloc(0);
    }


    var redirectTarget = result.redirectTarget;
    if (redirectTarget) {
        return _renderResultCode(
            sleepBuffer,
            Buffer.from(util.format('res.redirect(%s);\n', generateCodeFromPart(redirectTarget, 'redirectTarget'))),
            Buffer.concat([cookieBuffer, headerBuffer]), end);
    }
    var code = result.status || 200;
    // 需要我们处理的结果
    if (result.schema) {
        var s1 = util.format('var jsonSchema = buildJsonSchema(%j,context);\n', result.schema);
        var s2;
        if (result.contentType) {
            var ct = generateCodeFromPart(result.contentType, 'contentType');
            s2 = util.format('res.set("Content-Type", %s);\n', ct);
        } else
            s2 = '';
        var s3 = util.format('exportJson(definitions,jsonSchema).then(json => {\n' +
            '                res.status(%d).send(json);\n' +
            '            });\n',code);
        return _renderResultCode(sleepBuffer, Buffer.from(s1 + s2 + s3), Buffer.concat([cookieBuffer, headerBuffer]), end);
    }
    if (result.statusText) {
        return _renderResultCode(sleepBuffer, Buffer.from(util.format('res.status(%d).send("%s");\n', code, result.statusText))
            , Buffer.concat([cookieBuffer, headerBuffer]), end);
    } else
        return _renderResultCode(sleepBuffer, Buffer.from(util.format('res.sendStatus(%d);\n', code))
            , Buffer.concat([cookieBuffer, headerBuffer]), end);
}

/**
 * 编写返回结果代码
 * @param responses 结果规格
 * @return {*} 代码Buffer
 */
function createResultCode(responses) {
    // 有条件的结果
    // status
    var results = Object.keys(responses).map(s => {
        var r1 = clone(responses[s]);
        r1.status = s;
        return r1;
    });

    var conditionalResults = results.filter(r => r.condition)
        .map(r => {
            var code = generateCodeFromPart(r.condition, 'condition');
            var p1 = util.format('if (%s)', code);
            return Buffer.concat([
                Buffer.from(p1),
                renderResultCode(r, true)
            ]);
        });
    // 无条件的结果
    var freeResult = results.find(r => !r.condition);
    if (freeResult) {
        conditionalResults.push(renderResultCode(freeResult));
    } else {
        conditionalResults.push(Buffer.from('next();\n'));
    }
    return Buffer.concat(conditionalResults);
}

function createVMContentBuffer() {
    return Buffer.from('parameters.__request = req;\n' +
        '        parameters.__response = res;\n' +
        '        const context = vm.createContext(parameters);\n');
}

/**
 * 路径uri的正则表达式
 * @type {RegExp}
 */
const pathParameterPattern = /{([a-zA-Z0-9-]+)}/;

/**
 *
 * @param path openAPI 的path
 * @return {*} express 服务器认可的uri
 */
function toExpressPath(path) {
    var input = path;
    while (input.match(pathParameterPattern))
        input = input.replace(pathParameterPattern, ':$1');
    return input;
}

function toProxyPath(path) {
    var input = path;
    while (input.match(pathParameterPattern))
        input = input.replace(pathParameterPattern, '*');
    return input;
}

function createServer(remoteFile, dir, cb) {
    // console.debug("create server from ", remoteFile, " to ", dir);
    getUri(remoteFile, (err, rs) => {
        if (err) throw err;
        // console.debug('get remote response');
        if (fs.existsSync(dir)) {
            rimraf.sync(dir);
            // fs.rmdirSync(dir);
        }

        fs.mkdirSync(dir);
        // mock 服务器的结构 应该是

        // rs.setEncoding('utf8');
        toString(rs, 'utf8').then(str => {
            var allPromises = [];
            var list = JSON.parse(str);
            var definitions = list.definitions;
            let writeApi = function (path, method, api) {
                // console.debug('path:', path, ',method:', method);
                // 确定文件名
                var newPath = path.replace('/', '-');
                while (newPath.search('/') !== -1)
                    newPath = newPath.replace('/', '-');
                // while (newPath.search(':') !== -1)
                //     newPath = newPath.replace(':', '-');
                var fileName = dir + "/" + method + "-" + newPath + ".js";
                // console.debug(fileName);
                // 把 uriParameter formParameter jsonParameter 提取到object中
                var parameterSpecifications = {};
                arrayToObjectJSON(parameterSpecifications, api.parameters);


                // 输入标准
                var parameterSpecificationsBuffer = Buffer.concat([
                    Buffer.from('var parameterSpecifications = '),
                    Buffer.from(JSON.stringify(parameterSpecifications)),
                    Buffer.from(';\n'),
                    Buffer.from('var definitions = '),
                    Buffer.from(!definitions ? 'null' : JSON.stringify(definitions)),
                    Buffer.from(';\n')
                ]);
                // 输入代码

                // exceptedContentType
                var exceptedContentType = writeExceptedContentType(api.consumes);
                // 参数
                var parameterBuffer = Buffer.concat([
                    Buffer.from('var parameters = {};\n'),
                    writeParameter(api.parameters),
                    Buffer.from('var errors = validParameter(parameters, parameterSpecifications,definitions);\n' +
                        '        if (errors && errors.length>0) {\n' +
                        '            console.debug(errors);\n' +
                        '            res\n' +
                        '                .status(400)\n' +
                        '                .send(errors);\n' +
                        '            return;\n' +
                        '        }\n')
                ]);
                // 结果处理
                //// 上下文建立
                var contentCodeBuffer = createVMContentBuffer();
                var resultCodeBuffer = createResultCode(api.responses);

                // , upload.array()
                // 确认下风险，
                // 1，是否会影响正常form 测试代码
                // 2, 是否会影响json请求 测试代码
                // 3, 多包是否正常工作
                // 其他改进，formParameter 将优先从body中获取 没有则从query中
                var codeBefore = Buffer.from(util.format('server.%s("%s", upload.array(), function (req, res, next) {\n'
                    , method.toLowerCase(), toExpressPath(path)));

                var codeEnd = Buffer.from('});\n');

                // 文件输出
                var stream = fs.createWriteStream(fileName, {encoding: 'utf8'});
                // stream.write();

                allPromises.push(new Promise(function (resolve, reject) {
                    stream.end(Buffer.concat([
                        codeBefore,
                        exceptedContentType,
                        parameterSpecificationsBuffer,
                        parameterBuffer,
                        contentCodeBuffer,
                        resultCodeBuffer,
                        codeEnd,
                        Buffer.from(util.format('\n__result={\n' +
                            '    path:"%s",\n' +
                            '    method:"%s"\n' +
                            '};\n', toProxyPath(path), method))
                    ]), resolve);
                }));
            };

            Object.keys(list.paths).forEach(path => {
                // 这个path 是定义的path 需要转换成express的path
                var apiOnThisPath = list.paths[path];
                Object.keys(apiOnThisPath).forEach(method => {
                    writeApi(path, method, apiOnThisPath[method]);
                });
            });
            Promise.all(allPromises).then(cb);
        });

    });
}

module.exports = {
    /**
     * 从本地文件中创建服务器
     * @param filePath 本地文件
     * @param dir 工作目录
     * @param cb 完成回调
     */
    createServerFromLocalFile(filePath, dir, cb) {
        createServer(path.join('file://', path.resolve(filePath)), dir, cb);
    },

    /**
     * 创建服务器目录结构
     * @param remoteFile 远程文件
     * @param dir 目录
     * @param cb
     */
    createServer: createServer
};