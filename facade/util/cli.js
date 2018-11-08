#!/usr/bin/env node

/**
 * 控制台应用程序, 调用示例：node cli --name=chick
 * Added by Liub 2017.8.13
 */

let {CommMode} = require('../define/comm');
let remote = require('./clientComm')(CommMode.ws);
let serversInfo = require('../../game.config').servers;

//require('shelljs/global');

//环境检测示例
// if (!which('git')) {
//   echo('Sorry, this script requires git');
//   exit(1);
// }
//end

//命令行参数分析
// let argv = require('yargs')
//     .option('n', {
//         //通过argv.n或者argv.name获取name命名参数，例如 --name=chick
//         //如果只是作为开关使用，可以添加 boolean: true 调整default 去除 type 即可
//         alias : 'name',
//         demand: true,         //必须的参数
//         describe: '请输入名称',
//         default: 'tom',
//         type: 'string'
//     })
//     .usage('Usage: node cli [options]')
//     .example('node cli printInfo', '屏显服务器信息')
//     .help('h')
//     .alias('h', 'help')
//     .epilog('copyright 2017')
//     .argv;

//console.log(argv.n);          //获取指定的命名参数
//console.log(argv._);          //以数组形式，获取所有非命名参数

//控制台输入 例如输入 save Android 1 将在Android上关闭外部连接、强制保存全部用户数据
console.log("请输入远程命令:");
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
        let al = chunk.replace('\r\n', '').split(' ');
        for(let i=1;i<al.length;i++){
            al[i] = encodeURIComponent(al[i]);
        }
        remote.fetch({func:'Console.command', data:al}, msg=>{
            console.log(msg);
        });
    }
});
process.stdin.on('end', () => {
    process.stdout.write('end');
});

//end
