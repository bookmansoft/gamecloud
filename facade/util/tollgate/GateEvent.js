let facade = require('../../Facade')
let {ResType, EventConfig, EventEnum} = facade.const
let TollgateObject = require('./TollgateObject')

/**
 * 副本中的随机事件
 * Class GateEvent
 * @package App\Logic\UserEvent
 */
class GateEvent
{
    constructor($et = EventEnum.Rabbit){
        /**
         * 事件类型
         * @var int
         */
        this.type = $et;
        /**
         * expired time of this event.
         */
        let $config = EventConfig.getEvents();
        if($config[this.type]['expired'] == 0){
            this.expiredTime = 0;
        }
        else{
            this.expiredTime = facade.util.now() + $config[this.type]['expired'];
        }
        /**
         * 可触发的最大数量
         * @var int
         */
        this.numOfMax = 0;
        /**
         * 已触发的次数
         * @var int
         */
        this.numOfCur = 0;
    }

    /**
     * 执行事件
     * @param {UserEntity} $user
     */
    Execute($user) {
        let $params = {}, $gate=null, $bonus=null;
        switch(this.type){
            case EventEnum.BossAppear://遭遇宝箱怪
                //点击后转化为攻击宝箱怪事件: 金币宝箱怪或者魂石宝箱怪
                $params = {'result': 0};
                break;
            case EventEnum.BossAttack://攻击宝箱怪
                //获取一定的金币，击败宝箱怪时必须判断战斗时间是否合理
                $gate = TollgateObject.instance(Math.ceil($user.getTollgateMgr().curGateNo/10)*10, $user);//获取指定关卡的配置信息
                $bonus = $gate.totalBlood._clone_().CalcFinallyValue($user.effect(), [em_Effect_Comm.BoxMoney]);
                $params = {'result': 0, 'money': $bonus};
                $user.getPocket().AddRes($bonus, true, ResType.Gold);
                break;
            case EventEnum.BossStoneAttack://攻击宝箱怪
                //获取一定的魂石，击败宝箱怪时必须判断战斗时间是否合理
                $bonus = $user.effect().CalcFinallyValue(em_Effect_Comm.BoxMoney, $user.getTollgateMgr().curGateNo / 10);
                $params = {'result': 0, 'stone': $bonus};
                $user.getBonus({type:ResType.Stone, num:$bonus});
                break;
            case EventEnum.Rabbit://小飞兔
                //获取一定的奖励，产生小飞兔事件时，必须判断是否达到了每日最大次数的限制
                $params = {'result': 0, 'bonus': `${ResType.Diamond},50`};
                $user.getBonus({type:ResType.Diamond, num:50});
                break;
            case EventEnum.Enemy://遭遇玩家挑战
                //todo: 遭遇玩家，点击后触发一场PVP战斗
                $params = {'result': 0};
                break;
        }
        return facade.tools.extend($params, {'type': this.type, 'expired': this.expiredTime - facade.util.now(), 'num': this.numOfCur, 'max': this.numOfMax});
    }
}

exports = module.exports = GateEvent;
