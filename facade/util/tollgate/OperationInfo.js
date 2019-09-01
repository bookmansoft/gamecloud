let facade = require('../../Facade')
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let {ReturnCode} = facade.const

/**
 * 客户端上行的挂机结果
 * 服务端进行必要的合理性判定，如果判定合理则进行奖励发放、通关处理，否则回退到上一关，包括：
 * 1、根据当前已经消灭的怪物，计算并下发当前金币值
 * 2、根据时间戳判断本次战斗耗时是否合理
 * 3、判断胜负结果是否合理
 */
class OperationInfo
{
    constructor(...$param){
        //region 输入参数
        /*
        * 操作模式
        */
        this.Oper = $param[0];
        /*
        * 当前挂机关卡编号
        */
        this.gateNo = 0;
        /*
        * 当前已经消灭的怪物数量
        */
        this.monsterNum = 0;
        //endregion

        if($param.length > 1){
            this.gateNo = $param[1];
        }
        if($param.length > 2){
            this.monsterNum = $param[2];
        }
        
        //region 输出参数
        /**
         * 本次操作产生的金币数
         * @var {LargeNumberCalculator}
         */
        this.money = new LargeNumberCalculator(0, 0);
        /**
         * 转生操作：本次操作产生的魂石（击杀Boss掉落）
         * 其他操作：本关可能产生的魂石数量
         * @var
         */
        this.stone = 0;
        /**
         * 转生操作：本次操作产生的英魂（转生时由魂石转化而来）
         * @var
         */
        this.stoneHero = 0;
        /**
         * 返回码
         * @var {Number}
         */
        this.errorCode = ReturnCode.Success;
        //endregion
    }
}

exports = module.exports = OperationInfo;