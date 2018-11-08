/**
 * Created by admin on 2017-05-26.
 */
function handle(data){ //用户数据发生变化
    //通告给Index
    this.remoteCall('newAttr', {domain: data.user.domain, openid: data.user.openid, attr: data.attr});
}

module.exports.handle = handle;