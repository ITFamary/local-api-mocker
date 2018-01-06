server.get(
    "/test", upload.array(), function (req, res, next) {
        var definitions = null;
        var parameterSpecifications = {};
        // 初始化 parameters
        var parameters = {};
        // 获取所有的parameters
        // URI
        // parameters.goodId = req.params.goodId;
        // Query
        // parameters.request = req.body;
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
            sleep({});
            var allPromises = [];

            Promise.all(allPromises)
                .then(() => {
                    res.sendStatus(200);
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
    path: "/test",
    method: "get"
};