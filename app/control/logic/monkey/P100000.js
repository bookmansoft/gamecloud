let facade = require('../../../../facade/Facade')
let {ResType, ActionExecuteType, ReturnCode, OperEnum ,GuideList} = facade.const
let UserEntity = require('../../../model/entity/UserEntity');
let TollgateObject = require('../../../../facade/util/tollgate/TollgateObject')
let OperationInfo = require('../../../../facade/util/tollgate/OperationInfo')

/**
 * 副本探索管理报文
 */
class P100000 extends facade.Control {
    /**
     * @brief  报文编号 100000：探索副本过程中，提交新的Checkpoint请求服务端确认
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param
     * 名称            | 类型     | 描述
     * ----------------|----------|--------------------
     * oper            | int      | 操作类型 1 通关 2 攻打Boss超时 3 临时提交Checkpoint 4 状态查询 5 重新冲关 6 领取离线收益 7 普通重生 8 高级重生 9 请求挂机 10 请求结束挂机 12 推进新手引导
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
     * .bossId         | int      | 当前关卡Boss的编号，普通关卡无效
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
        let $op = new OperationInfo(input.oper, input.gateNo, input.monsterNum);
        let $explore = user.getTollgateMgr().doSomething($op);

        let $data = new D100000();

        $data.his = user.hisGateNo;
        $data.money = user.getPocket().GetRes(ResType.Gold);
        $data.rl = user.getTollgateMgr().revivalLeftNum;
        $data.rt = user.getTollgateMgr().revivalNum;

        //随机事件
        $data.events = user.getEventMgr().getList();
        $data.evNum = Object.keys($data.events).length;

        $data.gateNo = $explore.curGateNo;
        $data.monsterNum = $explore.curMonsterNum;
        $data.totalMonster = $explore.totalMonster;
        $data.bossId = $explore.bossId;
        $data.status = $explore.tollgateStatus.state;
        $data.power = $explore.totalBlood;
        $data.mOffline = $explore.getMoneyOffline();
        $data.leftTime = $explore.ExpiredTime - facade.util.now();
        $data.aStone = $explore.dropStone;

        $data.added =  $op.money;

        if(input.oper == OperEnum.Require){
            //检测新手引导
            user.baseMgr.vip.checkGuide();
        }
        if(input.oper == OperEnum.GuideFinish){
            user.baseMgr.vip.GuideNo = input.gid;
        } 
        $data.newGuide = GuideList[user.baseMgr.vip.GuideNo].next;        
        return {code:$explore.errorCode, data: $data};
    }
}

/**
 * 返回报文 Class D100000
 */
class D100000
{
    constructor(){
        /**
         * 经过确认后的关卡
         * @var
         */
        this.gateNo = 0;
        /**
         * 历史最高关卡
         * @var
         */
        this.his = 0;
        /**
         * 进入关卡的姿态
         * @var
         */
        this.status = 0;
        /**
         * 经过确认后的进度
         * @var
         */
        this.monsterNum = 0;
        /**
         * 关卡怪物总数
         * @var
         */
        this.totalMonster = 0;
        /**
         * 本关随机出来的Boss的编号，系统据此确定属性相克
         */
        this.bossId = 0;
        /**
         * 当前离线奖励
         * @var
         */
        this.mOffline = 0; 
        /**
         * 当前关卡最低战力要求
         * @var
         */
        this.power = 0;
        /**
         * 当前总金币
         * @var
         */
        this.money = 0;
        /**
         * 剩余时间（挂机剩余时间或过关剩余时间）
         * @var
         */
        this.leftTime = 0;
        /**
         * 随机事件数量
         * @var int
         */
        this.evNum = 0;
        /**
         * 随机事件列表
         * @var
         */
        this.events = {};
        /**
         * 本次新增的金币数量
         * @var
         */
        this.added = 0;
        /**
         * 本关可掉落的魂石数量
         * @var
         */
        this.aStone = 0;
        /**
         * 剩余的重生次数
         * @var
         */
        this.rl = 0;
        /**
         * 累计的重生次数
         * @var
         */
        this.rt = 0;
        /**
         * 新手引导进程
         * @var
         */
        this.newGuide = 0;
    }
}

exports = module.exports = P100000;
