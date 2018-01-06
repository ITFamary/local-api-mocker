const jsf = require('json-schema-faker');
const assert = require('assert');
const TestHelper = require("./TestHelper");
const {MockServer} = require('../src/MockServer');

describe('Faker', function () {
    var dir = new TestHelper().testDirPath();
    const server = new MockServer(dir + "/mockMultipartRequest");
    describe('default', function () {
        it('生成', function () {
            return server.exportJson(null, {
                "type": "string",
                "default": "v1"
            }).then(v => {
                assert.equal(v, 'v1', '难道不是v1');
            })
        })
    })
});