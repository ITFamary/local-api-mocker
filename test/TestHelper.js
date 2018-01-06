/**
 * 测试帮助类
 * Created by CJ on 08/12/2017.
 */
var path = require("path");

class TestHelper {

    /**
     *
     * @return {String} test 目录的绝对目录
     */
    testDirPath() {
        // INIT_CWD 执行 test 的目录
        // PWD 单个执行测试的目录 通常是IDE行为
        var cwd;
        if (process.env.INIT_CWD) {
            cwd = '' + process.env.INIT_CWD;
        } else {
            cwd = '' + process.env.PWD;
        }

        // 如果是非我方目录
        if (path.basename(cwd) === 'local-api-mocker') {
            return path.resolve(cwd, 'test');
        } else
            return path.resolve(cwd, 'local-api-mocker', 'test');
    }
}

module.exports = TestHelper;

