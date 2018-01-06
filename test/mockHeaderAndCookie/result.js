server.get(
    "/test", upload.array(), function (req, res, next) {
        // if (!req.is("application/x-www-form-urlencoded") && !req.is("multipart/form-data")) {
        //     res.status(400).end("bad content type");
        //     return;
        // }
        var definitions = null;
        var parameterSpecifications = {
            id: {
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
        parameters.id = req.query.id;
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
            var _cookieSchema1 = buildJsonSchema({
                "type": "string",
                "default": {"__script": "id"}
            }, context);
            allPromises.push(exportJson(definitions, _cookieSchema1).then(rs => {
                if (rs)
                    res.cookie("n2", rs);
                else
                    res.clearCookie("n2");
            }));

            var _headerSchema1 = buildJsonSchema({
                "type": "string",
                "default": {"__script": "id"}
            }, context);
            allPromises.push(exportJson(definitions, _headerSchema1).then(rs => {
                res.set("n1", rs);
            }));

            Promise.all(allPromises)
                .then(() => {
                    res.sendStatus(200);
                });

        }
    }
);
__result = {
    path: "/test",
    method: "get"
};