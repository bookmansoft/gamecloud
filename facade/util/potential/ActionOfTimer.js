let facade = require('../../Facade')
let {ActionType, ActionStatus, em_Effect_Comm, ReturnCode} = facade.const
let commonFunc = require('../commonFunc')
let EffectManager = require('../../../facade/util/comm/EffectManager')
let EffectObject = require('../../../facade/util/comm/EffectObject')
let UserEntity = facade.UserEntity
let ConfigManager = require('../../util/potential/ConfigManager')

/**
 * 时效性技能类，包括：
 * 1、技能面板上6个可以点击释放的主动技能
 * 2、任务奖励中送出的两个时效性技能
 */
class ActionOfTimer
{
    constructor($_id) {
        /**
         * 技能编号
         * @var int
         */
        this.id = $_id;
        /**
         * 对非冷却型技能有效：可使用的数量
         * @var int
         */
        this.num = 0;
        /**
         * 对冷却型技能有效：冷却时间戳
         * @var int
         */
        this.cd = 0;
        this.isDarty = false;
        /**
         * 技能当前状态
         * @var int
         */
        this.status = ActionStatus.Normal;
    }

    ToString(){
        return `${this.id},${this.num},${this.cd}`;
    }

    /**
     * 使用方式分类：1、按次使用  2、CD模式
     * @return int
     */
    getType() {
        return parseInt(ConfigManager.getActionConfig()[this.id]['type']);
    }

    /**
     * 返回技能冷却时间（秒为单位，考虑了科技效果）
     * @return int
     */
    getCollDown($user)
    {
        let $ret = parseInt(ConfigManager.getActionConfig()[this.id]['coolDown']);
        switch(this.id){
            case 1:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill1_Rcd, $ret);
                break;
            case 2:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill2_Rcd, $ret);
                break;
            case 3:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill3_Rcd, $ret);
                break;
            case 4:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill4_Rcd, $ret);
                break;
            case 5:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill5_Rcd, $ret);
                break;
            case 6:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill6_Rcd, $ret);
                break;
            default:
                break;
        }
        return $user.effect().CalcFinallyValue(em_Effect_Comm.SkillCooldownTime, $ret);
    }

    /**
     * 返回有效期时间（秒为单位，考虑了科技影响）
     * @return int
     */
    getExpired($user) {
        let $ret = parseInt(ConfigManager.getActionConfig()[this.id]['expired']);
        switch(this.id) {
            case 1:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill1_Timer, $ret);
                break;
            case 2:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill2_Timer, $ret);
                break;
            case 3:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill3_Timer, $ret);
                break;
            case 4:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill4_Timer, $ret);
                break;
            case 5:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill5_Timer, $ret);
                break;
            case 6:
                $ret = $user.effect().CalcFinallyValue(em_Effect_Comm.Skill6_Timer, $ret);
                break;
            default:
                break;
        }
        return $user.effect().CalcFinallyValue(em_Effect_Comm.SkillContinueTime, $ret);
    }

    getEffectStr() 
    {
        return ConfigManager.getActionConfig()[this.id]['effects'];
    }

    /**
     * 使用技能，返回操作结果码
     * @param {UserEntity} $user
     * @param bool $
     * @return int
     */
    Execute($user, $isExecute = false) {
        this.isDarty = false;

        let $curTime = commonFunc.now();
        switch(this.getType()){
            case ActionType.digital:
                if($isExecute){
                    if(this.num <= 0){
                        return ReturnCode.paramError;
                    }
                    this.num -= 1;
                    this.isDarty = true;
                    if(this.cd < $curTime){
                        this.cd = $curTime + this.getExpired($user);
                    }
                    else{
                        this.cd += this.getExpired($user);
                    }
                }
                break;

            case ActionType.coolDown:
                switch(this.status){
                    case ActionStatus.Normal: //当前状态为普通态
                        if($isExecute){
                            //改变技能状态为Extension，同时叠加施展期间隔
                            this.isDarty = true;
                            this.status = ActionStatus.Extension;
                            this.cd = $curTime + this.getExpired($user);
                        }
                        break;
                    case ActionStatus.Extension://当前状态为有效施展中
                        if(this.cd + this.getCollDown($user) < $curTime){
                            //如果已过冷却期，先恢复为正常状态，否则跳过
                            this.isDarty = true;
                            this.status = ActionStatus.Normal;

                            if($isExecute){
                                //将状态改为
                                this.status = ActionStatus.Extension;
                                this.cd = $curTime + this.getExpired($user);
                            }
                        }
                        else if(this.cd <= $curTime){ //施展期已结束，应该进入冷却期
                            this.isDarty = true;
                            this.status = ActionStatus.CollDown;
                            this.cd += this.getCollDown($user);
                            return ReturnCode.colldown;
                        }
                        else{//处于施展期
                            return ReturnCode.colldown;
                        }
                        break;
                    case ActionStatus.CollDown: //当前状态为冷却中
                        if(this.cd < $curTime)
                        {
                            this.isDarty = true;
                            this.status = ActionStatus.Normal;
                            if($isExecute){
                                this.status = ActionStatus.Extension;
                                this.cd = $curTime + this.getExpired($user);
                            }
                        }
                        else{
                            return ReturnCode.colldown;
                        }
                        break;
                }
                break;
        }

        if($isExecute){
            //添加所有动态效果
            let $eList = (new EffectManager(this.getEffectStr())).toArray();
            for(let $value of $eList){
                let $eObj = null;
                switch(this.id) {
                    case 4: //考虑了能够增强技能效果的科技，目前只有可增强4号技能的科技
                        $eObj = new EffectObject($value.type, $user.effect().CalcFinallyValue(em_Effect_Comm.Skill4_Enhance, value.value));
                        break;
                    default:
                        $eObj = new EffectObject($value.type, $value.value, $curTime + this.getExpired($user));
                        break;
                }
                if($eObj){
                    $user.AddTimer($eObj);
                }
            }
        }

        return ReturnCode.Success;
    }

    /**
     * 使用道具增加技能数量
     * @param {Number} $num
     * @return {Number}
     */
    Add($num) {
        if($num < 0 || $num > 5000){
            return ReturnCode.paramError;
        }

        switch(this.getType()){
            case ActionType.digital: //增加可用数量
                this.num += $num;
                break;
            case ActionType.coolDown: //消除冷却期
                if(this.status == ActionStatus.CollDown){
                    this.cd = commonFunc.now();
                    this.status = ActionStatus.Normal;
                }
                break;
        }
        return ReturnCode.Success;
    }
}

exports = module.exports = ActionOfTimer;