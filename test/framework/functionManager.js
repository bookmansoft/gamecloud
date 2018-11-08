/**
 * 技能类型
 */
const SkillEnum = {
    Duration:0,      //内部使用：持续效果计算

    //region 带来静态加成的被动技能
    Defense:1,      //被动提升防御力5%
    Life:2,         //被动提升生命5%
    Fare:3,         //被动提升运气5%
    Protect:4,      //被动提升免伤率5%
    Lucky:5,        //被动提升幸运率5%
    Score:6,        //关卡结算积分时，在最终结算的基础上x1.5
    Money:7,        //关卡结算金币时，在最终结算的基础上x1.5
    Bonus:12,       //被动提升关卡道具掉率几率10%
    //endregion

    //region 带来动态效果的被动技能
    Revive:8,       //死亡时，马上复活并恢复50%生命，每局限一次
    FlyBoat:9,      //受伤时（扣血），有几率触发飞艇效果5%
    Jump:10,        //第5次跳过障碍可以恢复最大生命的5%，CD 30秒
    Shield:11,      //受伤时，5%触发护盾持续5秒, 不叠加
    Action:13,      //每次成功通过任意关卡后有30%的几率恢复1点体力，扫荡无法触发
    //endregion
};

/**
 * 动作类型
 * @type {{FlyBoat: number, Recover: number, Shield: number, Revive: number, GetAction: number}}
 */
const ActionEnum = {
    FlyBoat: 1,         //飞艇事件
    Recover: 2,         //生命恢复
    Shield: 3,          //触发护盾
    Revive: 4,          //复活
    GetAction: 5,       //获得体力
};

/**
 * 事件类型
 * @type {{Start: number, Hurt: number, Jump: number, Dead: number, Victory: number}}
 */
const NotifyEnum = {
    Start: 1<<0,      //角色存活期
    Hurt: 1 << 1,     //受到一次伤害时触发
    Jump: 1<<2,       //跳跃    飞跃的障碍也要发
    Dead: 1 << 3,     //死亡
    Victory: 1<< 4,   //胜利
};

/**
 * 联合枚举检测类
 */
class Indicator
{
    /**
     * 通过持久化字段初始化对象
     *
     * @param val
     * @private
     */
    constructor(val){
        this._indecate = !!val ? val : 0;
    }

    /**
     * 获取当前复合标志的值，以进行持久化
     *
     * @returns {*}
     */
    get indicate() {
        return this._indecate;
    }

    /**
     * 设置标志位
     *
     * @param val
     */
    set indicate(val){
        this._indecate |= val;
    }

    /**
     * 设置标志位，支持链式操作
     * @param val
     * @returns {Indicator}
     */
    Set(val){
        this.indicate = val;
        return this;
    }

    /**
     * 重置标志位
     *
     * @param val
     */
    unSet(val){
        this._indecate = this._indecate & ~val;
        return this;
    }

    /**
     * 检测当前值
     *
     * @param val
     * @returns {boolean}
     */
    check(val, cur){
        if(!!cur){
            this.Set(cur);
        }
        return (this.indicate & val) == val;
    }
}

/**
 * 技能引发的动作对象
 */
class ActionObj{
    constructor($type, $param){
        this.type = $type;
        this.param = !!$param ? $param : 0;
    }
}

/**
 * 技能类事务对象
 */
class SkillFunction
{
    constructor($parent, $_ft, $_notify, $params){
        this.parent = $parent;
        //感兴趣的事件
        this.Notify = new Indicator($_notify);
        //技能类型
        this.funcType = $_ft;
        //技能参数
        this.params = $params;
    }

    /**
     * 执行技能效果
     * @param $params
     * @constructor
     */
    Execute($param){
        //region 阀值判断
        if(!!this.params.threshold){
            if(!this.parent.threshold[this.funcType]){
                this.parent.threshold[this.funcType] = 0;
            }
            this.parent.threshold[this.funcType] += 1;
            if(this.parent.threshold[this.funcType] < this.params.threshold){
                return [];
            }
            this.parent.threshold[this.funcType] = 0;
        }
        //endregion

        //region 技能触发概率检测
        if(!!this.params.rate){
            if(Math.random() > this.params.rate){
                return [];
            }
        }
        //endregion

        //region 每局使用次数限制检测
        if(!!this.params.max){
            if(!this.parent.maxTimes[this.funcType]){
                this.parent.maxTimes[this.funcType] = 0;
            }
            if(this.params.max <= this.parent.maxTimes[this.funcType]){ // 达到了最大次数限制
                return [];
            }
            this.parent.maxTimes[this.funcType] += 1;
        }
        //endregion

        //region CD检测
        if(!!this.params.cd){
            if(!this.parent.cd[this.funcType]){ // 如果尚未设置，则允许使用，同时记录使用时间
                this.parent.cd[this.funcType] = Date.parse(new Date())/1000;
            }
            else{ // 如果已经设置，则判断是否在CD中，
                if(Date.parse(new Date())/1000 - this.parent.cd[this.funcType] < this.params.cd){// CD中，不允许发动技能
                    return [];
                }
                else{ // 出CD，允许发送，并重新记录使用时间
                    this.parent.cd[this.funcType] = Date.parse(new Date())/1000;
                }
            }
        }
        //endregion

        let ret = [];
        switch(this.funcType){
            case SkillEnum.Duration:
                if(!!this.parent.duration["shield"]){
                    if(Date.parse(new Date())/1000 < this.parent.duration["shield"].duration){
                        let pv = Math.min(this.parent.duration["shield"].value, $param.value);
                        ret.push(new ActionObj(ActionEnum.Recover, pv));

                        this.parent.duration["shield"].value -= pv;
                        if(this.parent.duration["shield"].value == 0){
                            delete this.parent.duration["shield"]; //数值为零，删除
                        }
                    }
                    else{
                        delete this.parent.duration["shield"]; //超时删除
                    }
                }
                break;
            case SkillEnum.Defense:
                this.parent.properties.defense += this.params.value;
                break;
            case SkillEnum.Life:
                this.parent.properties.life += this.params.value;
                break;
            case SkillEnum.Fare:
                this.parent.properties.fare += this.params.value;
                break;
            case SkillEnum.Protect:
                this.parent.properties.protect += this.params.value;
                break;
            case SkillEnum.Lucky:
                this.parent.properties.lucky += this.params.value;
                break;
            case SkillEnum.Score:
                this.parent.properties.score += this.params.value;
                break;
            case SkillEnum.Money:
                this.parent.properties.money += this.params.value;
                break;
            case SkillEnum.Bonus:
                this.parent.properties.bonus += this.params.value;
                break;
            case SkillEnum.Revive:
                ret.push(new ActionObj(ActionEnum.Revive));
                ret.push(new ActionObj(ActionEnum.Recover, this.params.value));
                break;
            case SkillEnum.FlyBoat:
                ret.push(new ActionObj(ActionEnum.FlyBoat));
                break;
            case SkillEnum.Jump:
                ret.push(new ActionObj(ActionEnum.Recover, this.params.value));
                break;
            case SkillEnum.Shield:
                let _r = this.parent.hero.lv*this.params.value/100;
                ret.push(new ActionObj(ActionEnum.Shield, {duration:this.params.duration, value:_r}));

                //持续效果，不能叠加
                if(!this.parent.duration["shield"] || Date.parse(new Date())/1000 > this.parent.duration["shield"].duration){
                    // 之前没有指定效果，或者效果已超时，则可以覆盖
                    this.parent.duration["shield"] = {value:_r*this.parent.hero.life, duration: Date.parse(new Date())/1000 + this.params.duration};
                }
                break;
            case SkillEnum.Action:
                ret.push(new ActionObj(ActionEnum.GetAction, this.params.value));
                break;
        }
        return ret;
    }
}

/**
 * 技能列表管理类
 */
class SkillManager{
    constructor(parent){
        //     Defense:1,      //被动提升防御力5%
        //     Life:2,         //被动提升生命5%
        //     Fare:3,         //被动提升运气5%
        //     Protect:4,      //被动提升免伤率5%
        //     Lucky:5,        //被动提升幸运率5%
        //     Score:6,        //关卡结算积分时，在最终结算的基础上x1.5
        //     Money:7,        //关卡结算金币时，在最终结算的基础上x1.5
        //     Revive:8,       //死亡时，马上复活并恢复50%生命，每局限一次
        //     FlyBoat:9,      //受伤时（扣血），有几率触发飞艇效果5%
        //     Jump:10,        //第5次跳过障碍可以恢复最大生命的5%，CD 30秒
        //     Shield:11,      //受伤时，5%触发护盾持续5秒, 不叠加
        //     Action:13,      //每次成功通过任意关卡后有30%的几率恢复1点体力，扫荡无法触发
        //     Bonus:12,       //被动提升关卡道具掉率几率10%

        this.skillList = {};
        this.skillList[SkillEnum.Duration] = new SkillFunction(parent,SkillEnum.Duration, NotifyEnum.Hurt, {});
        this.skillList[SkillEnum.Defense] = new SkillFunction(parent,SkillEnum.Defense, NotifyEnum.Start, {value: 0.05});
        this.skillList[SkillEnum.Life] = new SkillFunction(parent,SkillEnum.Life, NotifyEnum.Start, {value: 0.05});
        this.skillList[SkillEnum.Fare] = new SkillFunction(parent,SkillEnum.Fare, NotifyEnum.Start, {value: 0.05});
        this.skillList[SkillEnum.Protect] = new SkillFunction(parent,SkillEnum.Protect, NotifyEnum.Start, {value: 0.05});
        this.skillList[SkillEnum.Lucky] = new SkillFunction(parent,SkillEnum.Lucky, NotifyEnum.Start, {value: 0.05});
        this.skillList[SkillEnum.Score] = new SkillFunction(parent,SkillEnum.Score, NotifyEnum.Start, {value: 0.5});
        this.skillList[SkillEnum.Money] = new SkillFunction(parent,SkillEnum.Money, NotifyEnum.Start, {value: 0.5});
        this.skillList[SkillEnum.Bonus] = new SkillFunction(parent,SkillEnum.Bonus, NotifyEnum.Start, {value: 0.1});
        this.skillList[SkillEnum.Revive] = new SkillFunction(parent,SkillEnum.Revive, NotifyEnum.Dead, {max:1, value:0.5});
        this.skillList[SkillEnum.FlyBoat] = new SkillFunction(parent,SkillEnum.FlyBoat, NotifyEnum.Hurt, {rate:0.05});
        this.skillList[SkillEnum.Jump] = new SkillFunction(parent,SkillEnum.Jump, NotifyEnum.Jump, {threshold:5, cd:30, value:0.05});
        this.skillList[SkillEnum.Shield] = new SkillFunction(parent,SkillEnum.Shield, NotifyEnum.Hurt, {rate: 0.05, duration:5, value:1});
        this.skillList[SkillEnum.Action] = new SkillFunction(parent,SkillEnum.Action, NotifyEnum.Victory, {rate:0.3, value:1});
    }
}

/**
 * 技能运行时管理
 * 输入事件，返回动作列表，每个动作要么对英雄属性做出修改，要么触发执行一个特殊动作
 */
class SkillRunner
{
    /**
     * 构造函数
     * @param skillList 技能列表，例如 [1,2,3]
     */
    constructor($heroProperty){
        this.indicator = new Indicator();       //联合枚举检测
        /**
         * 角色因为技能而被动增加的静态属性
         * @type {{defense: number, life: number, fare: number, protect: number, lucky: number, score: number, money: number, bonus: number}}
         */
        this.properties = {
            defense:0,      //防御加成
            life: 0,        //生命加成
            fare:0,         //运气加成
            protect:0,      //免伤加成
            lucky:0,        //幸运加成
            score:0,        //通关获取分数
            money:0,        //通关获取金币
            bonus:0,        //关卡掉落几率
        };
        //外部传入的角色属性，例如生命值和等级等
        this.hero = $heroProperty;

        //技能管理对象，维护所有技能对象列表
        this.skillManager = new SkillManager(this);

        /**
         * 技能列表 List<SkillFunction>
         */
        this.skillList = this.hero.skill.reduce((sofar, cur)=>{
            sofar.push(this.skillManager.skillList[cur]);
            return sofar;
        }, [this.skillManager.skillList[SkillEnum.Duration]]);

        //最大次数限制
        this.maxTimes = {};
        //CD限制
        this.cd = {};
        //阀值限制
        this.threshold = {};
        //持续效果
        this.duration = {};

        //触发被动技能
        this.notify(NotifyEnum.Start);
    }

    setValue(param){
        Object.keys(param).map(key=>{
            this.hero[key] = param.key;
        });
    }

    /**
     * 获取加成效果，考虑了持续效果的影响
     * @returns {{defense: number, life: number, fare: number, protect: number, lucky: number, score: number, money: number, bonus: number}}
     */
    getValue(){
        return this.properties;
    }

    /**
     * 输入特殊事件，触发技能，返回技能引发的动作列表
     * @param $notifyEnum
     */
    notify($notifyEnum, $param){
        let ret = {};
        //检测并发动技能
        this.skillList.filter(item=>{
            return item.Notify.check($notifyEnum);
        }).map(af=>{
            let res = af.Execute($param);
            if(res.length > 0){
                ret[af.funcType] = res;
            }
        });
        return ret;
    }

    /**
     * 进入战场时调用，重置环境变量
     */
    init(){
        //最大次数限制
        this.maxTimes = {};
        //CD限制
        this.cd = {};
        //阀值限制
        this.threshold = {};
        //持续效果
        this.duration = {};
    }
}

describe('技能管理', function() {
    it('技能发动', done => {
        //技能对象可随角色对象的创建而创建，!!!当角色升级、引发技能解锁时需要重新创建
        let sm = new SkillRunner({
            lv:3, 
            skill:[1,2,3,4,5,6,7,8,9,10,11,12,13]
        });
        
        //传入初始属性
        sm.setValue({life: 1000});

        //每次进入战场时，都需要调用以初始化
        sm.init();

        //打印初始的加成效果(NotifyEnum.Start)
        console.log(sm.getValue());
        
        //技能带来的被动加成效果，这些数值可以直接叠加到角色对应属性上

        //发生特定事件时调用，例如发生了1000点的伤害：
        // NotifyEnum.Start: 1<<0,      //角色存活期 - 系统内部自动调用，不需要手动调用
        // NotifyEnum.Hurt: 1 << 1,     //受到伤害时触发, 需要传递本次伤害值 notify(NotifyEnum.Hurt, {value:1000})
        // NotifyEnum.Jump: 1<<2,       //跳跃 每跳跃一次都要发，飞跃的障碍也要发
        // NotifyEnum.Dead: 1 << 3,     //死亡 角色死亡时发送，如果返回的结果中有ActionEnum.Revive，则角色自动复活
        // NotifyEnum.Victory: 1<< 4,   //胜利 战斗胜利时发送
        // 调用后返回动作列表:
        // ActionEnum.FlyBoat: 1,         //飞艇事件
        // ActionEnum.Recover: 2,         //生命恢复
        // ActionEnum.Shield: 3,          //触发护盾
        // ActionEnum.Revive: 4,          //复活
        // ActionEnum.GetAction: 5,       //获得体力
        console.log(sm.notify(NotifyEnum.Hurt, {value:1000}));
        
        done();
    });
});