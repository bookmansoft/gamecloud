/**
 * URL转CDN地址
 * @param {CoreOfBase} env
 */
function urlToCdn(env, url) {
    if(env.serverNum("Image") > 0) { //系统中存在Image转换服务器
        let serverId = (env.facade.util.hashCode(url) % env.serverNum("Image")) + 1;
        return `${env.options.UrlHead}://${env.serversInfo["Image"][serverId].webserver.mapping}:${env.serversInfo["Image"][serverId].webserver.port}/socialImg?m=${encodeURIComponent(url)}`;
    } else {
        return url;
    }
}

exports.urlToCdn = urlToCdn;