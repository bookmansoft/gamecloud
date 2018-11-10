let CoreOfBase = require('../core/CoreOfBase')

/**
 * URL转CDN地址
 * @param {CoreOfBase} env
 */
function urlToCdn(env, url) {
    let serverId = (env.facade.util.hashCode(url) % env.serverNum("Image")) + 1;
    return `${env.options.UrlHead}://${env.serversInfo["Image"][serverId].webserver.mapping}:${env.serversInfo["Image"][serverId].webserver.port}/socialImg?m=${encodeURIComponent(url)}`;
}

exports.urlToCdn = urlToCdn;