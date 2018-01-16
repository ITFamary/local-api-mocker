const {hookWithConfig} = require('../src/DevServerHook');
const MockDevServer = require('./MockDevServer');
const assert = require('assert');
const branchFetch = require('git-branch');

describe('DevServerHook', function () {
    //测试通过网络获取
    const targetHost = 'csm.lmjia.cn';

    function assertConfigWorkAsOneAPI(config) {
        var server = new MockDevServer();
        return hookWithConfig(server, config)
            .then(rs => {
                console.log(rs);
                assert.equal(rs.apiLength, 1, '应该获得了一个api');
                assert.notEqual(rs.server, null, 'sever总在的吧');
                rs.server.stop();
            });
    }

    it('从网络中获取', function () {
        var config = {
            projectId: 'demo',
            apiServerHost: targetHost,
            branch: 'master'
        };

        return assertConfigWorkAsOneAPI(config);
    });
    it('自动从git中获取', function () {
        // 首先确认下 我们是否在服务端
        // 先获取分支 如果获取到了 master 那就继续哈
        return new Promise((resolve, reject) => {
            branchFetch(function (err, str) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(str);
            })
        }).catch(err => {
            console.log('不在git中？算了', err);
        }).then(branch => {
            if (branch !== 'master') {
                console.log('仅仅在master分支完成测试');
                return;
            }
            return assertConfigWorkAsOneAPI({
                projectId: 'demo',
                apiServerHost: targetHost
            })
        });
    });
    // 测试 watch的功能，思路
});