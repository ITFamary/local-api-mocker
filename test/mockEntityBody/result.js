server.post(
    "/testForm", upload.array(), function (req, res, next) {
        // 请求类型
        // console.log(req.body);
        // console.log(req.params);
        if (!req.is("application/x-www-form-urlencoded") && !req.is("multipart/form-data") && !req.is("application/json")) {
            res.status(400).end("bad content type");
            return;
        }
        var definitions = {
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
        };
        var parameterSpecifications = {
            request: {
                "schema": {
                    "$ref": "#/definitions/User"
                }
            }
        };
        // 初始化 parameters
        var parameters = {};
        // 获取所有的parameters
        // URI
        // parameters.goodId = req.params.goodId;
        // Query
        parameters.request = req.body;
        // Json
        // parameters.price = req.body.price;

        // 参数必须符合规格
        var errors = validParameter(parameters, parameterSpecifications, definitions);
        if (errors && errors.length > 0) {
            console.debug(errors);
            res
                .status(400)
                .send(errors);
            return;
        }
        parameters.__request = req;
        parameters.__response = res;
        const context = vm.createContext(parameters);
        // 执行结果
        {
            var allPromises = [];

            Promise.all(allPromises)
                .then(() => {
                    var jsonSchema = buildJsonSchema({
                        "$ref": "#/definitions/User",
                        "properties": {
                            "username": {
                                "enum": [
                                    {
                                        "__script": "request.username"
                                    }
                                ]
                            },
                            "password": {
                                "enum": [
                                    {
                                        "__script": "request.password"
                                    }
                                ]
                            }
                        }
                    }, context);
                    // res.set("Content-Type", "application/json");
                    exportJson(definitions, jsonSchema).then(json => {
                        res.send(json);
                    });
                });

        }
        //
        // {
        //     res.send({
        //         username: parameters.username,
        //         password: parameters.password
        //     });
        // }
    }
);
__result = {
    path: "/testForm",
    method: "post"
};