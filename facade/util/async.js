/**
 * request示例
 *
 流

 任何响应都可以输出到文件流。
 request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'))
 反过来，也可以将文件传给PUT或POST请求。未提供header的情况下，会检测文件后缀名，在PUT请求中设置相应的content-type。
 fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))

 请求也可以pipe给自己。这种情况下会保留原content-type和content-length。
 request.get('http://google.com/img.png').pipe(request.put('http://mysite.com/img.png'))

 表单
 request支持application/x-www-form-urlencoded和multipart/form-data实现表单上传。
 request.post('http://service.com/upload', {form:{key:'value'}})
 或者：
 request.post('http://service.com/upload').form({key:'value'})

 HTTP认证
 request.get('http://some.server.com/').auth('username', 'password', false);
 */
"use strict";

var Promiser = require('bluebird');
var requestP = Promiser.promisify(require('request'));
var qs = require('querystring');

/**
 * 异步函数实现的Get操作
 * @param data
 * @returns {*}
 *
 * @note async functiond的函数体内，可以包含多个await以形成串行操作
 */
async function getAsync(data){
    return await requestP(`http://127.0.0.1:8888/public/${data}`);
}

exports.get = function (data){
    //执行多个异步函数，或者反复执行同一个异步函数，会形成并行操作
    return getAsync(data);
};
