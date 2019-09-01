let facade = require('../Facade')
let {MiddlewareParam, ReturnCode, EntityType, IndexType, UserStatus} = facade.const
let CommonFunc = facade.util
let extendObj = facade.tools.extend

/**
 * 用户认证鉴权中间件
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
}

module.exports.handle = handle;
