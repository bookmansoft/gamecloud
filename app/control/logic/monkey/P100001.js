let facade = require('../../../../facade/Facade')
let {ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 副本探索 - 随机事件管理
 */
class P100001 extends facade.Control
{
    /**
     * @brief  报文编号 100001：
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param
     * 名称            | 类型     | 描述
     * ----------------|----------|--------------------
     * oper            | int      | 操作类型 1 通关 2 攻打Boss超时 3 临时提交Checkpoint 4 状态查询 5 重新冲关 6 领取离线收益 7 普通重生 8 高级重生 9 请求挂机 10 请求结束挂机
     * gateNo          | int      | 请求确认的关卡编号
     * monsterNum      | int      | 当前进度，也就是已经消灭的怪物数量
     *
     * @return
     * 名称            | 类型     | 描述
     * ------------- --|----------|----------------------
     * code            | int      | 返回码
     * data            | object   | 返回的数值对象
     * .gateNo         | int      | 确认后的当前关卡
     * .status         | int      | 进入关卡的模式（0 新进入  1 回退 2 挂机）
     * .monsterNum     | int      | 确认后的关卡进度
     * .totalMonster   | int      | 当前关卡怪物数量
     * .mOffline       | int      | 挂机收益
     * .power          | LN       | 最低战力要求
     * .money          | LN       | 当前金币数量
     * .leftTime       | int      | 剩余时间（倒计时 秒）
     * .evNum          | int      | 随机事件数量
     * .events         | array    | 随机事件列表
     * ..expiredTime   | int      | 有效期时间戳
     * ..type          | int      | 事件类型 2 遭遇宝箱怪 102 攻击宝箱怪，该事件由 2 点击后转化而来 3 小飞兔
     * ..numOfMax      | int      | 可触发的最大数量
     * ..numOfCur      | int      | 已触发的次数
     *
     * @note
     */
    async Execute(user, input) {
        input.eid = input.eid || 0;
        input.eid = parseInt(input.eid);

        let $data = new D100001();
        $data.params = user.getEventMgr().ExecuteResult(user, input.eid);
        $data.events = user.getEventMgr().getList();
        return {code:$data.params['result'], data: $data};
    }
}

/**
 * 返回报文 Class D100001
 */
class D100001
{
    constructor(){
        /**
         * 执行结果
         * @var
         */
        this.params = {};
        /**
         * 随机事件列表
         * @var
         */
        this.events = {};
    }
}

exports = module.exports = P100001;
