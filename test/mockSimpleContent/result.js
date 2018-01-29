server.put(
    "/test2", upload.array(), function (req, res, next) {
        // if (!req.is("application/x-www-form-urlencoded") && !req.is("multipart/form-data")) {
        //     res.status(400).end("bad content type");
        //     return;
        // }
        var definitions = null;
        var parameterSpecifications = {
            "enable": {
                // "in": "body",
                // "name": "enable",
                "required": true,
                "schema": {
                    "type": "boolean"
                }
            }
        };
        // 初始化 parameters
        var parameters = {};
        // 获取所有的parameters
        // URI
        // parameters.goodId = req.params.goodId;
        // Query
        // Json
        parameters.enable = req.body;

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
                        "type": "string",
                        "default": "foo"
                    }, context);
                    // res.set("Content-Type", "application/json");
                    exportJson(definitions, jsonSchema).then(json => {
                        res.status(210).send(json);
                    });
                });

        }
    }
);
__result = {
    path: "/test2",
    method: "put"
};