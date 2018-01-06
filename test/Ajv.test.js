// const Ajv = require('ajv');
const assert = require('assert');
const {Validator} = require('jsonschema');

describe('Ajv测试', function () {

    var v = new Validator();
    // var instance = new Ajv();
    let schema = {
        "type": "string",
        "required": true,
        "definitions": {
            "User": {
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string"
                    },
                    "password": {
                        "type": "string"
                    }
                },
                "required": [
                    "username",
                    "password"
                ]
            }
        }
    };

    // required 不管用？
    // it('1', function () {
    //     // assert.equal(instance.validate(schema, "b"),false,'验证');
    //     assert(v.validate(null,schema).valid,false,"");
    // });
    // it('2', function () {
    //     // assert.equal(instance.validate(schema, "b"),false,'验证');
    //     assert(v.validate(1,schema).valid,false,"");
    // });
    it('3', function () {
        assert.equal(v.validate("1", schema).valid, true, "");
    });
    it('JSON内部的必要数据', function () {
        let schema = {
            "type": "object",
            "properties": {
                "username": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                }
            },
            "required": [
                "username",
                "password"
            ]
        };
        let validatorResult = v.validate({
            username: "a"
        }, schema);
        console.log(validatorResult.errors, validatorResult, validatorResult.valid);
        assert.equal(validatorResult.valid, false, '缺乏必要的password');
    });

});
