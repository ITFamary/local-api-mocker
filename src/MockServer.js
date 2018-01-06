/**
 * mock 服务器
 * Created by CJ on 07/12/2017.
 */


const sleep = require('thread-sleep');
const jsonServer = require('json-server');
const glob = require('glob');
const fs = require('fs');
const vm = require('vm');
const isString = require('lodash.isstring');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer'); // v1.0.5
const upload = multer(); // for parsing multipart/form-data
const jsf = require('json-schema-faker');
jsf.option({
    useDefaultValue: true,
});
const {Validator, ValidationError} = require('jsonschema');
const clone = require('clone');
var $RefParser = require('json-schema-ref-parser');
// console.log(jsf.version);
// jsf.extend('faker', function () {
//     return require('faker');
// });
// jsf.extend('chance', function () {
//     return require('chance');
// });

// const JsonSchemaValidator = require("./JsonSchemaValidator");

class MockServer {
    constructor(dir) {
        this.dir = dir;
        this.uris = [];
        this.server = jsonServer.create();
        this.exportJson = this.exportJson.bind(this);
        this.sleep = this.sleep.bind(this);
        this.validParameter = this.validParameter.bind(this);
        this.buildJsonSchema = this.buildJsonSchema.bind(this);
        this._buildJsonSchema = this._buildJsonSchema.bind(this);
        this.stop = this.stop.bind(this);
        this.start = this.start.bind(this);

        // const router = jsonServer.router('db.json');
        const middlewares = jsonServer.defaults();

        this.server.use(bodyParser.json()); // for parsing application/json
        this.server.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
        this.server.use(cookieParser());

        // Add custom routes before JSON Server router
        // this.server.get('/echo', (req, res) => {
        //     res.jsonp(req.query);
        // });

        var files = glob.sync(dir + "/**.js");
        const context = vm.createContext({
            exportJson: this.exportJson,
            sleep: this.sleep,
            validParameter: this.validParameter,
            buildJsonSchema: this.buildJsonSchema,
            upload,
            server: this.server,
            console: console,
            vm: vm
        });
        //
        var uris = this.uris;
        files.forEach(function (path) {
            // console.log(path);
            const code = fs.readFileSync(path, {encoding: 'utf8'});
            // 通过vm 开启调用
            const script = new vm.Script(code, {
                filename: path,
                timeout: 100000,
            });

            // 没有必要吧
            // var filter = function (pathname, req) {
            //     return (pathname.match('^/api') && req.method === 'GET');
            // };
            //
            // var apiProxy = proxy(filter, {target: 'http://www.example.org'})
            // 将
            // var uri =

            // 进行收集
            script.runInContext(context);
            uris.push(context.__result);
        });

        this.server.use(middlewares);
    }

    /**
     * 将json-schema生成特定的json
     * @param schema json-schema
     * @param definitions 其他定义
     * @return {Promise<Object>}
     */
    exportJson(definitions, schema) {
        // return jsf.resolve(schema);
        if (definitions)
            schema.definitions = definitions;
        return Promise.resolve(jsf(schema));
    }

    /**
     * 停止特定时间
     * @param toSleep 默认500-2000 ms
     */
    sleep(toSleep) {
        toSleep = toSleep || {};
        toSleep.type = toSleep.type || 'number';
        toSleep.minimum = toSleep.minimum || 500;
        toSleep.maximum = toSleep.maximum || 2000;
        this.exportJson(null, toSleep)
            .then(ms => {
                sleep(ms);
            });
    }

    /**
     * 构建json-schema
     * 就是代替其中的__script代码 将它转换成
     * @param input 原始格式的json-schema
     * @param context 规范格式的json-schema
     */
    buildJsonSchema(input, context) {
// 循环所有数据 如果发现存在__script 则进行计算 并且替换掉整个对象
        return this._buildJsonSchema(input, context);
    }

    _buildJsonSchema(input, context) {
        if (Array.isArray(input)) {
            return input.map(v => {
                if (this.isScript(v)) {
                    return new vm.Script(v.__script).runInContext(context);
                }
                else
                    return this._buildJsonSchema(v, context);
            });
        } else if (typeof input === 'object') {
            // 看看它的值
            var newVar = {};
            Object.keys(input).map(key => {
                var val = input[key];
                if (this.isScript(val))
                    newVar[key] = new vm.Script(val.__script).runInContext(context);
                else
                    newVar[key] = this._buildJsonSchema(val, context);
            });
            return newVar;
        } else
            return input;
    }

    /**
     *
     * @param obj
     * @return {boolean} 是否是一个可被脚本的对象
     */
    isScript(obj) {
        return (typeof obj === 'object') && isString(obj.__script);
    }

    /**
     * 可参考json-schema 标准
     * @param parameters 已获取的参数
     * @param parameterSpecifications 参数规格
     * @param definitions 数据定义
     * @return {Array} length为0则为有效
     */
    validParameter(parameters, parameterSpecifications, definitions) {
        // var result = true;
        var errors = [];
        Object.keys(parameterSpecifications).forEach(function (name) {
            var val = parameterSpecifications[name];
            if (val.required && !parameters[name]) {
                errors.push({
                    name,
                    errors: [new ValidationError("required")]
                });
                return false;
            }
            if (val.schema) {
                // schema 才是我们想要的
                val = val.schema;
                val = clone(val);
                if (definitions)
                    val.definitions = definitions;
                var validator = new Validator();
                // validator.addSchema(definitions,"#/definitions/");
                var validatorResult = validator.validate(parameters[name], val);
                if (!validatorResult.valid) {
                    errors.push({
                        name,
                        errors: validatorResult.errors
                    });
                    return false;
                }
            }
        });
        return errors;
    }

    /**
     * 可参考json-schema 标准
     * @param parameters 已获取的参数
     * @param parameterSpecifications 参数规格
     * @param definitions 数据定义
     * @return {Promise<any[]>} length为0则为有效
     */
    validParameterWithPromise(parameters, parameterSpecifications, definitions) {
        // var result = true;
        var promises = [];
        // var errors = {};
        Object.keys(parameterSpecifications).forEach(function (name) {
            var val = parameterSpecifications[name];
            if (val.required && !parameters[name]) {
                // result = false;
                promises.push(Promise.resolve({
                    name,
                    errors: [new ValidationError("required")]
                }));
                // errors[name] = new ValidationError("required");
                return false;
            }
            if (definitions)
                val.definitions = definitions;

            promises.push(
                new Promise(function (resolve, reject) {
                    $RefParser.dereference(val)
                        .then(schema => {
                            var validator = new Validator();
                            var validatorResult = validator.validate(parameters[name], schema);
                            if (!validatorResult.valid) {
                                resolve({
                                    name,
                                    errors: validatorResult.errors
                                })
                            } else
                                resolve();
                        }).catch(reject);
                })
            );
            // $RefParser.dereference(val)
            //     .then(schema=>{
            //
            //     })
            // var validator = new Validator();
            // var validatorResult = validator.validate(parameters[name], val);
            // if (!validatorResult.valid) {
            //     result = false;
            //     errors.name = validatorResult.errors;
            //     return false;
            // }
            // 是否存在
            // if (!new JsonSchemaValidator(name, val).valid(parameters[name], newValue => parameters[name] = newValue, function () {
            //         console.error('validParameter',arguments);
            //     })) {
            //     result = false;
            //     return false;
            // }

        });
        return Promise.all(promises);
    }

    start(port) {
        // server.use(router);
        let realPort = port || 3000;
        this.toClose = this.server.listen(realPort, () => {
            console.log('Mock Server is running on ' + realPort)
        });
    }

    stop() {
        this.toClose.close();
    }
}

module.exports = {MockServer};