server.get(
    "/test/:id/:branch", upload.array(), function (req, res, next) {
        // if (!req.is("application/x-www-form-urlencoded") && !req.is("multipart/form-data")) {
        //     res.status(400).end("bad content type");
        //     return;
        // }
        var definitions = null;
        var parameterSpecifications = {
            id: {
                "type": "string",
                "required": true
            }, branch: {
                "type": "string",
                "required": true
            }
        };
        // 初始化 parameters
        var parameters = {};
        // 获取所有的parameters
        // URI
        // parameters.goodId = req.params.goodId;
        // Query
        parameters.id = req.params.id;
        parameters.branch = req.params.branch;
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
                        "type": "object",
                        "required": ["id", "branch"],
                        "properties": {
                            "id": {
                                "type": "string",
                                "default": {
                                    "__script": "id"
                                }
                            },
                            "branch": {
                                "type": "string",
                                "default": {
                                    "__script": "branch"
                                }
                            }
                        }
                    }, context);
                    // res.set("Content-Type", "application/json");
                    exportJson(definitions, jsonSchema).then(json => {
                        res.send(json);
                    });
                });

        }
    }
);
__result = {
    path: "/test/*/*",
    method: "get"
};