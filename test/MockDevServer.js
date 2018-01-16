class MockDevServer {
    constructor() {
        this.app = {
            use: function () {
                console.log(arguments);
            },
            _router: {
                stack: []
            }
        }
    }
}

module.exports = MockDevServer;