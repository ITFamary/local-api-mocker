/**
 * 配置builder的参数
 * Created by CJ on 06/12/2017.
 */

var FETCH_GROUP = "Fetch options:";
var MOCK_GROUP = "Mock options:";

module.exports = function (yargs) {
    yargs
        .help("help")
        .alias("help", "h")
        .version()
        .alias("version", "v")
        .options({
            "verbose": {
                alias: "d",
                type: "boolean",
                describe: "Show more details"
            }, "workingDir": {
                alias: "c",
                type: "string",
                describe: "工作目录",
                // defaultDescription: "默认9999",
                default: "mock",
            },
            "fetch": {
                type: "boolean",
                alias: "f",
                describe: "抓取远程数据",
                group: FETCH_GROUP
            }, "fetchTarget": {
                type: "string",
                alias: "t",
                describe: "远程地址",
                group: FETCH_GROUP
            }, "start": {
                type: "boolean",
                alias: "s",
                describe: "开启本地mock服务器",
                group: MOCK_GROUP
            }, "port": {
                type: "number",
                describe: "本地mock服务器的port",
                defaultDescription: "默认9999",
                default: 9999,
                group: MOCK_GROUP
            },
        })
        .strict()
};
