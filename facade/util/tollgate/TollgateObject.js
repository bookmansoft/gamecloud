let facade = require('../../Facade')
let {em_Effect_Comm, TollgateType} = facade.const
let LargeNumberCalculator = facade.Util.LargeNumberCalculator

/**
 * 根据指定的关卡号，创建的关卡对象
 */
class TollgateObject
{
    /**
     * 构造函数
     * @param {*}               $no       //关卡编号
     * @param {BaseUserEntity}  $user     //用户对象
     */
    constructor($no, $user) {
        this.owner = $user;
        this.GateNo = $no;

        this.dropStone = 0;
        this.bossId = 0;

        if(this.GateNo % 10 == 0){ //大关
            this.GateType = TollgateType.BigGate;
            this.bossId = parseInt($user.core.fileMap.MonsterList.randomElement()[0]['id']);

            if(facade.util.rand(0, 99) < (100 * $user.effect().CalcFinallyValue(em_Effect_Comm.StoneGetRate, 0.6))){//魂石掉率概率测试
                //（当前关卡数/25（向下取整后）-2）* ( 1 + 图腾效果加成百分比 )
                this.dropStone = Math.max(0, Math.floor(this.GateNo / 25) - 2);
                this.dropStone = $user.effect().CalcFinallyValue(em_Effect_Comm.StoneGetNum, this.dropStone);
                //宠物特技增加的魂石
                this.dropStone = $user.effect().CalcFinallyValue(em_Effect_Comm.StoneOutput20, this.dropStone);
            }
        }
        else if(this.GateNo % 5 == 0){ //中关
            this.GateType = TollgateType.MediumGate;
            this.bossId = parseInt($user.core.fileMap.MonsterList.randomElement()[0]['id']);
        }
        else{ //小关
            this.GateType = TollgateType.SmallGate;
        }
        /**
         * 当前关卡怪物总数，考虑了科技的影响
         * @var int|mixed
         */
        this.totalMonster = Math.max(1, $user.CalcResult(em_Effect_Comm.ReduceMonsterNum, $user.core.fileMap.TollgateConfig[this.GateType]['baseMonsterNum']));
        /**
         * 当前关卡总血量，考虑了科技的影响
         */
        this.totalBlood = LargeNumberCalculator.instance(200, 0)
            ._mul_(LargeNumberCalculator.Power(150, 7.0 * this.GateNo/200.0))
            .CalcFinallyValue($user.effect(), [em_Effect_Comm.ReduceBossBlood]);
    }

    static instance($no, $user){
        return new this($no, $user);
    }
}

exports  = module.exports = TollgateObject;