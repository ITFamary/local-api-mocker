/**
 * web服务器的测试
 * Created by CJ on 08/12/2017.
 */

const TestHelper = require("./TestHelper");
const assert = require('assert');
const {MockServer} = require('../src/MockServer');

describe("MockServer", function () {
    var dir = new TestHelper().testDirPath();
    describe('AS测试', function () {
        it('0Promise', function () {
            var allPromise = [];
            Promise.all(allPromise)
                .then(() => {
                    console.log('it works');
                })
        });
    });
    describe('validParameter', function () {
        it('校验单独的布尔', function () {
            const server = new MockServer(dir + "/mockSimpleContent");
            var rs = server.validParameter(
                {
                    enable: 'hello'
                }, {
                    enable: {
                        schema:{
                            type: 'boolean',
                            required: true,
                        }
                    }
                }, {
                }
            );
            console.log(rs);
            assert.equal(rs.length, 1, '发现有错误');

            rs = server.validParameter(
                {
                    enable: true
                }, {
                    enable: {
                        schema:{
                            type: 'boolean',
                            required: true,
                        }
                    }
                }, {
                }
            );
            console.log(rs);
            assert.equal(rs.length, 0, '没毛病');

            rs = server.validParameter(
                {
                    enable: false
                }, {
                    enable: {
                        schema:{
                            type: 'boolean',
                            required: true,
                        }
                    }
                }, {
                }
            );
            console.log(rs);
            assert.equal(rs.length, 0, '没毛病');

        });
        it('校验复杂数据', function () {
            const server = new MockServer(dir + "/mockMultipartRequest");
            var rs = server.validParameter(
                {
                    request: {
                        username: "a"
                    }
                }, {
                    request: {
                        "schema": {
                            "$ref": "#/definitions/User"
                        }
                    }
                }, {
                    "User": {
                        "type": "object",
                        "properties": {
                            "username": {
                                "type": "string"
                                // "required": true
                            },
                            "password": {
                                "type": "string"
                                // "required": true
                            }
                        },
                        "required": [
                            "username",
                            "password"
                        ]
                    }
                }
            );
            console.log(rs);
            assert.equal(rs.length, 1, '发现有错误');

        });

        it('校验复杂数据', function () {
            const server = new MockServer(dir + "/mockMultipartRequest");
            var rs = server.validParameter(
                {
                    request: {
                        username: "a",
                        password: "b"
                    }
                }, {
                    request: {
                        "schema": {
                            "$ref": "#/definitions/User"
                        }
                    }
                }, {
                    "User": {
                        "type": "object",
                        "properties": {
                            "username": {
                                "type": "string"
                                // "required": true
                            },
                            "password": {
                                "type": "string"
                                // "required": true
                            }
                        },
                        "required": [
                            "username",
                            "password"
                        ]
                    }
                }
            );
            console.log(rs);
            assert.equal(rs.length, 0, '没有问题');

        });
    });
    describe("start", function () {

        // it("URI参数的API支持", function () {
        //     const server = new MockServer(dir + "/mockUriParameterAPI");
        //     // server.start();
        // });
        // it("简单结果", function () {
        //     const server = new MockServer(dir + "/mockResult");
        //     // server.start();
        // });
        // it("带脚本的重定向", function () {
        //     const server = new MockServer(dir + "/mockResultRedirect");
        //     // server.start();
        // });
        // it("多个结果", function () {
        //     const server = new MockServer(dir + "/mockResultCondition");
        //     // server.start();
        // });
        // it("Mock Json", function () {
        //     const server = new MockServer(dir + "/mockResultJson");
        //     // server.start();
        // });
        it("多包-是否会影响正常form-多包是否正常工作", function () {
            const server = new MockServer(dir + "/mockMultipartRequest");
            // server.start();
            // curl 'http://localhost:9090/login' -H 'Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryD5hWcMstB21MJD2a' --data-binary $'------WebKitFormBoundaryD5hWcMstB21MJD2a\r\nContent-Disposition: form-data; name="username"\r\n\r\nso\r\n------WebKitFormBoundaryD5hWcMstB21MJD2a\r\nContent-Disposition: form-data; name="password"\r\n\r\nI\r\n------WebKitFormBoundaryD5hWcMstB21MJD2a--\r\n' --compressed -v
        });
        it("整个请求体参数", function () {
            const server = new MockServer(dir + "/mockEntityBody");
            // server.start();
        });
        it("Header和Cookie", function () {
            const server = new MockServer(dir + "/mockHeaderAndCookie");
            // server.start();
        });
        it("地址参数", function () {
            const server = new MockServer(dir + "/mockPathParameter");
            // server.start();
        });
        it("休眠", function () {
            const server = new MockServer(dir + "/mockSleep");
            // server.start();
        });
        it("简易响应", function () {
            const server = new MockServer(dir + "/mockSimpleContent");
            // server.start();
        });
        it("内容处理", function () {
            const server = new MockServer(dir + "/mockEntityBody");
            // server.start();
        });

    })
});