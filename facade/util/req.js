/**
 * Request功能封装
 */
var fs = require('fs');
var request = require('request');
var rp = require('request-promise');

//示例：抓取图片
//request('https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1490206507236&di=5e2bfd913a684a9190bb7a12ad60fbad&imgtype=0&src=http%3A%2F%2Fimg2015.zdface.com%2F20160717%2Fc08eb20a19477625d31ca616c67b5717.jpg')
// .pipe(fs.createWriteStream('doodle.png'));

/**
 * Request普通版本
 * @param url
 * @param func 参数包括：error（为null则表示正常） json（解析成JSON的返回值）
 */
function getUrl (url, func){
    try{
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try{
                    let js = JSON.parse(body);
                    func(null, js);
                }
                catch(e){
                    func(e);
                }
            }
            else{
                func(error);
            }
        });
    }
    catch(e){
        func(e);
    }
}

/**
 * Promise版Request Get
 * @param url
 */
function pGetUrl(url, headers){
    //console.log(`\r\n发起远程请求(${Date()})：${url}\r\n`);
    if(!headers){
        headers = {};
    }
    headers['User-Agent'] = 'Request-Promise';
    return rp({
        uri: url,
        headers: headers,
        json: true // Automatically parses the JSON string in the response
    });
}

/**
 * Promise版Request Post
 * @param url
 * @param body
 */
function pPostUrl (url, body){
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true // Automatically stringifies the body to JSON
    };
    return rp(options);
}

/**
 * Promise版Request Form
 * @param url
 * @param form
 */
function pForm (url, form){
    var options = {
        method: 'POST',
        uri: url,
        form: form,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    };
    return rp(options);
}

exports.pGetUrl = pGetUrl;
exports.pForm = pForm;
exports.pPostUrl = pPostUrl;
exports.getUrl = getUrl;
