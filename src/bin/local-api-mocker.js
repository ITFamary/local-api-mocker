/**
 * builder的指令
 * Created by CJ on 06/12/2017.
 */
const path = require("path");
const yargs = require("yargs")
    .usage("local-api-mocker " + require("../../package.json").version + "\n");
const {createServer} = require('../ServerCreator');
const {MockServer} = require('../MockServer');

require("./config-yargs")(yargs);

yargs.parse(process.argv.slice(2), (err, argv, output) => {

    // arguments validation failed
    if (err && output) {
        console.error(output);
        process.exitCode = 1;
        return;
    }

    // help or version info
    if (output) {
        console.log(output);
        return;
    }

    if (argv.verbose) {
        argv["display"] = "verbose";
    }

    function processArgument(arg) {
        if (arg.verbose) {
            console.log(arg);
        }

        if (arg.fetch && !arg.fetchTarget) {
            console.error('fetchTarget required.');
            return;
        }

        if (arg.fetch) {
            // 开始从远程服务器抓取
            createServer(arg.fetchTarget, arg.workingDir, () => {
                console.log('Mock Server Created');
                if (arg.start) {
                    var server = new MockServer(arg.workingDir);
                    server.start();
                }
            });
        } else if (arg.start) {
            var server = new MockServer(arg.workingDir);
            server.start();
        } else {
            console.log('-h for help');
        }
    }

    processArgument(argv);
});