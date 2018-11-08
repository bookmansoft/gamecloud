let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')

/**
 * 用户登录
 */
class P999001 extends facade.Control
{
    /**
     * @brief  报文编号 999001：系统管理 内容待充实
     *
     * @date   2016.10.12
     *
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * mobile      | string   | 手机号码
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .id         | int      | 用户ID
     * .mobile     | string   | 用户手机号
     * .passport   | string   | 用户登录令牌
     *
     * @note
     */
    async Execute(user, objData) {
        let $ret = new D999001();
        let $code = ReturnCode.Success;
        $ret.mobile = objData.mobile;
        ret.passport = objData.mobile;

        return {code:$code, data: $ret};
    }
}

/**
 * 返回报文 Class D999001
 */
class D999001
{
    constructor(){
        this.id = 0;
        this.mobile = '';
        this.passport = '';
    }
}

exports = module.exports = P999001;
