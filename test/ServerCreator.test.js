const TestHelper = require("./TestHelper");
const assert = require('assert');
const {createServer} = require('../src/ServerCreator');
const path = require("path");
const UglifyJS = require("uglify-es");
const fs = require('fs');
const glob = require('glob');
const rimraf = require('rimraf');
const merge = require('merge');

describe('ServerCreator', function () {
    const dir = new TestHelper().testDirPath();

    function assertSameCode(dirName) {
        const humanFile = dir + "/" + dirName + "/result.js";
        const workingDir = dir + "/dist_" + dirName;
        const apiFile = dir + "/" + dirName + "/api2.json";
        // 这个apiFile并非完整的
        // 通过建立一个临时文件
        const tempDir = fs.mkdtempSync('LAM_TEST');
        const context = merge({
            swagger: "2.0-with-api-mocker-1.0",
            info: {
                title: "测试" + dirName,
                version: "1.0"
            }
        }, JSON.parse(fs.readFileSync(apiFile, {encoding: 'utf8'})));

        let entryApiFilePath = path.resolve(tempDir, "api.json");
        var stream = fs.createWriteStream(entryApiFilePath, {encoding: 'utf8'});
        var promise = new Promise(function (resolve, reject) {
            stream.end(Buffer.from(JSON.stringify(context)), function () {
                createServer(path.join("file://", entryApiFilePath), workingDir, resolve);
            });
        });

        return promise.then(x => {
            if (fs.existsSync(tempDir)) {
                rimraf.sync(tempDir);
                fs.rmdir(tempDir);
            }

            const code = fs.readFileSync(humanFile, {encoding: 'utf8'});
            // console.log(UglifyJS.minify(code).code);
            var files = glob.sync(workingDir + "/**.js");
            assert.equal(files.length, 1, "应该成功生成了一个JS文件");
            // readFile
            const generatedCode = fs.readFileSync(files[0], {encoding: 'utf8'});
            assert.equal(UglifyJS.minify(generatedCode).code, UglifyJS.minify(code).code, '生成的文件需符合要求');


        });

    }

    describe('createServer', function () {
        // it('URI参数生成算法1', function () {
        //     return assertSameCode("mockUriParameterAPI");
        // });
        // it('简单结果', function () {
        //     return assertSameCode("mockResult");
        // });
        // it('带脚本的重定向', function () {
        //     return assertSameCode("mockResultRedirect");
        // });
        // it('多个结果', function () {
        //     return assertSameCode("mockResultCondition");
        // });
        // it('json Schema', function () {
        //     return assertSameCode("mockResultJson");
        // });
        it('多包生成', function () {
            return assertSameCode("mockMultipartRequest");
        });
        it('获取body', function () {
            return assertSameCode("mockEntityBody");
        });
        it('mockHeaderAndCookie', function () {
            return assertSameCode("mockHeaderAndCookie");
        });
        it('地址参数', function () {
            return assertSameCode("mockPathParameter");
        });
        it('休眠', function () {
            return assertSameCode("mockSleep");
        });
        it('建议响应', function () {
            return assertSameCode("mockSimpleContent");
        });
    });
});
