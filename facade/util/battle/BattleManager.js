let {BattleBuffEnum, NotifyEnum, EmitType,OperationType,PeriodTypeEnum,AttackMode,ActionTypeEnum} = require('./enum')
let EventEmitter = require('events').EventEmitter; //事件管理
let BattleUser = require('./player');
let {ActionObject,ActionOfUserControl,ConfigMgr} = require('./Action');
let {OperationItem} = require('./util')

/**
 * 战场管理类，负责战场初始化、战斗进程控制和计算、输出流式战斗指令序列
 */
class BattleRoom extends EventEmitter
{
    /**
     * 构造函数
     */
    constructor(){
        super();

        //输出指令序列
        this.OperationList = [];
        //事务堆栈，按照先进后出原则执行
        this.WorldTransActionList = [];
        //上一个执行过的事务，包含一些执行状态以便查询
        this.LastAction = null;
        //功方
        this.Attacker = null;
        //守方
        this.Defenser = null;
        //行动令牌拥有者
        this.Controler = null;
        /**
         * 事件句柄
         */
        this.EventIndex = 0;
        /**
         * 全局的时间轴
         */
        this.GlobalFrame = 0;

        this.on(EmitType.Action, (...params)=>{
            this.PushAction(params[0]);
        });
    }

    lockFrame($idx){
        if(this.GlobalFrame < $idx){
            this.GlobalFrame = $idx;
        }
        return this;
    }

    /**
     * 添加系统行为记录（开始、结束等）
     * @param {*} $operType     记录类型
     * @param {Object} $params       记录参数
     * @return {int}            所创建记录的流水号
     */
    record($operType, $params = {}){
        let rec = new OperationItem($operType, $params);
        rec.PreCondition = this.EventIndex;
        rec.EventIndex = this.GetEventHandle();
        this.OperationList.push(rec);
        return rec.EventIndex;
    }

    /**
     * 创建战场
     * @param {user} $me
     * @param {user} $enemy
     * @return {BattleRoom}
     */
    static CreateRoom($me, $enemy){
        let $_battle = new BattleRoom();
        $_battle.Attacker = new BattleUser($me, $_battle);
        $_battle.Defenser = new BattleUser($enemy, $_battle);

        return $_battle;
    }

    static getHeroConfig($id){
        return ConfigMgr.PetList()[$id];
    }

    /**
     * 根据分组信息，以及用户对象，构造英雄的技能列表
     * @param {*} loc 
     * @param {*} user 
     */
    static getSkills(loc, user){
        return loc.reduce((sofar, cur)=>{
            let cfg = this.getHeroConfig(cur);
            if(cfg.profession == 0){ //法术卡，将其包含的技能填充到主角的技能列表中，等级取自法术卡自身的等级,受星级限制开放
                //升星解锁新的技能
                let $ev = user.getPotentialMgr().GetHero(cur).getEnLevel() || 1;
                cfg.ActionList[$ev-1].map(it=>{
                    let fc = parseInt(it);
                    if(!sofar.find(fo=>fo[0]==fc)){//去重
                        sofar.push([fc, user.getPotentialMgr().GetHero(cur).getCardLevel()]);
                    }
                });
            }
            else{//英雄卡，将其对应的召唤技追加到主角的技能列表中，所召唤英雄的等级取自英雄卡自身的等级
                sofar.push([cfg.boot, user.getPotentialMgr().GetHero(cur).getCardLevel()]);
            }
            return sofar;
        }, []);
    }

	/**
     * 获取事件唯一句柄
     */
	GetEventHandle(){
		return ++this.EventIndex;
	};

    /**
     * 计算生成并输出战斗指令序列
     * @return {OperationItem[]}
     */
    QuickBattle(){
        if (this.Attacker == null || this.Defenser == null){
            return [];
        }

        //为玩家颁发行动令牌（控方）
        if (this.Attacker.Power >= this.Defenser.Power){
            this.Controler = this.Attacker; 
        }
        else{
            this.Controler = this.Defenser;
        }

        //为控方英雄颁发行动令牌（拥有控牌权的英雄）
        let $hi = this.Controler.NextHero(true);
        if ($hi != null){
            this.emit(EmitType.Action, new ActionOfUserControl($hi));
        }

        //记录开始指令
        this.record(OperationType.Start, {me:this.Attacker.id, enemy:this.Defenser.id, a: this.Attacker.Power, b: this.Defenser.Power});
        for (let $hi of this.Defenser.getTargetHeros(null, AttackMode.All)){
            let $bid = $hi.lockFrame(this.GlobalFrame).record(OperationType.Enter, {value:$hi.Attributes});
            //发动降临技，锁定到出生帧
            $hi.lockBornFrame($bid).Notify(NotifyEnum.PeriodEnter, null);
        };
        for (let $hi of this.Attacker.getTargetHeros(null, AttackMode.All)){
            let $bid = $hi.lockFrame(this.GlobalFrame).record(OperationType.Enter, {value:$hi.Attributes});
            //发动降临技，锁定到出生帧
            $hi.lockBornFrame($bid).Notify(NotifyEnum.PeriodEnter, null);
        };

        let recy = 0; //避免死循环
        while (this.ActionCount > 0 && recy++ < 5000){
            let $CurAction = this.PeekAction();
            if ($CurAction.isEnd) { //当前事务执行完毕，准备出栈
                this.LastAction = this.PopAction();
            }
            else{
                $CurAction.Execute();
            }
        }
        console.log(`本次战斗经历${recy}手，剩余事务${this.ActionCount}`);

        //记录结束指令
        this.lockFrame(this.GlobalFrame).record(OperationType.End, {victory:this.Attacker.TotalLife > this.Defenser.TotalLife, a:this.Attacker.TotalLife, b:this.Defenser.TotalLife});

        return this.OperationList;
    }

    /**
     * 寻找下一个控方
     * @return {BattleUser}
     */
    NextControl(){
        if (this.Controler.enemy.CountVersion <= this.Controler.CountVersion){
            //如果当前敌方回合数小于等于控方，则切换到敌方
            this.Controler = this.Controler.enemy;
        }
        return this.Controler;
    }

    /**
     * 战局是否有效
     * @return {Boolean}
     */
    isValid(){
        return this.Attacker.TotalLife > 0 && this.Defenser.TotalLife > 0;
    }

    /**
     * 攻方是否获胜
     */
    get victory(){
        return this.Attacker.TotalLife > 0;
    }

    /**
     * 向堆栈顶部增加一个事务
     * @param {ActionObject} $ao  
     */
    PushAction($ao){
        if ($ao != null){
            $ao.ParentAction = this.PeekAction(); //将当前栈顶事物设置为父节点
            this.WorldTransActionList.push($ao);

            //特殊事务入栈时，要执行一些特殊处理
            switch($ao.type){
                case ActionTypeEnum.PeriodOfUserControl:
                    this.Controler.CurrentPeriod = PeriodTypeEnum.PeriodOfUserControl;
                    break;
            }
        }
    }

    /**
     * 从堆栈顶部弹出一个事务
     * @return {ActionObject}
     */
    PopAction(){
        let ret = null;
        if (this.WorldTransActionList.length > 0) {
            ret = this.WorldTransActionList.pop();
            ret.AfterExecute(); //后续操作

            //特殊事务出栈时，要执行一些特殊处理
            switch (ret.type) {
                case ActionTypeEnum.PeriodOfUserControl: 
                    if (this.isValid()) { 
                        if(this.Controler.CurHero.checkBuff(BattleBuffEnum.WindFury)){//风怒 连续行动
                            this.Controler.CurHero.removeBuff(BattleBuffEnum.WindFury);
                            this.emit(EmitType.Action, new ActionOfUserControl(this.Controler.CurHero));
                        }
                        else{//下一位控制者进入自身回合
                            this.Controler.CurrentPeriod = PeriodTypeEnum.None; //当前控制者离开自身回合
                            let $hi = this.NextControl().NextHero(true);
                            if ($hi != null){
                                this.emit(EmitType.Action, new ActionOfUserControl($hi));
                            }
                        }
                    }
                    break;

                default:
                    break;
            }
        }
        return ret;
    }

    /// <summary>
    /// 清空堆栈
    /// </summary>
    ClearAction(){
        this.WorldTransActionList = [];
    }

    /**
     * 获取栈顶事务对象（不出栈）
     * @return {ActionObject}
     */
    PeekAction(){
        if (this.WorldTransActionList.length > 0){
            return this.WorldTransActionList[this.WorldTransActionList.length-1];
        }
        else{
            return null;
        }
    }

    /**
     * 返回事务记录数
     */
    get ActionCount(){
        return this.WorldTransActionList.length;
    }
}

exports = module.exports = BattleRoom;
