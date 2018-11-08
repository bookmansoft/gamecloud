/**
 * 战斗状态管理
 */
class StatusManager
{
    constructor($st = null)
    {
        /**
         * 状态持续回合数 Dictionary<T, int>
         */
        this.ValidPeriod = {}; 
        /**
         * 状态保存变量
         */
        this.Status = 0;
    
        if($st){
            this.Set($st);
        }
    }

    /**
     * 状态初始化
     */
    Init(){
        this.Status = 0;

        //初始化状态持续回合数
        Object.keys(this.ValidPeriod).map($key=>{
            this.ValidPeriod[$key] = 0;

        });
    }

    /**
     * 设置带持续回合数的状态
     * 注意：调用Increase(T, -1)或者Set(T)，都会设置永久有效的Buff。保留Increase(T, -1)这种形式是为了将设置权交给配置表
     * @param {Number} $DescStatus   要设置的状态位
     * @param {Number} $cnt          增加的持续回合数，如果为-1表示持久有效, 默认1
     */
    Increase($DescStatus, $cnt=1){
        if ($cnt == 0) { return; }

        if (!!this.ValidPeriod[$DescStatus]){
            if ($cnt == -1){
                //新增回合数为永久有效，最终设置为永久有效
                this.ValidPeriod[$DescStatus] = $cnt;
            }
            else{
                if (this.ValidPeriod[$DescStatus] != -1 && $cnt > 0){
                    //如果原先已经是永久有效就不处理，否则叠加新增持续回合数
                    this.ValidPeriod[$DescStatus] += $cnt;
                }
            }
        }
        else {
            //先前没有持续回合标志，进行添加（无论是否永久）
            this.ValidPeriod[$DescStatus] = $cnt;
        }
        this.Set($DescStatus);
    }

    /**
     * 返回指定状态剩余持续回合数（-1表示永久持续）
     * @param {Number} $DescStatus 指定的检测状态 BattleBuffEnum
     * @return {Number} 剩余持续回合数，-1表示永久持续
     */
    LeftCount($DescStatus) {
        if (!this.ValidPeriod[$DescStatus]){
            if (this.Check($DescStatus))
            {
                return -1;
            }
            else
            {
                return 0;
            }
        }
        else
        {
            return this.ValidPeriod[$DescStatus];
        }
    }

    /**
     * 扣减指定状态的持续回合数，如果回合数降为0则消除此状态
     * 注意：如果没有设置持续回合数，或者持续回合数被设置为-1，则此状态为永久持续状态,多次调用Descrease也不会消除该状态
     * 永久持续状态必须直接调用UnSet来消除。
     * @param {Number} $DescStatus 指定的状态类型 BattleBuffEnum
     * @return {Boolean} Buff是否已经结束 true 已结束 false 仍旧有效
     */
    Decrease($DescStatus){
        if(!!this.ValidPeriod[$DescStatus]){
            if (this.ValidPeriod[$DescStatus] > 0) {
                this.ValidPeriod[$DescStatus] -= 1;
            }
    
            if (this.ValidPeriod[$DescStatus] == 0){
                this.UnSet($DescStatus);
            }
            else{
                return false;
            }
        }
        return true;
    }

    /**
     * 将指定状态叠加到状态集中
     * @param {*}  $DescStatus BattleBuffEnum
     */
    Set($DescStatus){
        this.Status = this.Status | $DescStatus;
    }

    /**
     * 从状态集中去除指定的状态
     * @param {Number}  $DescStatus BattleBuffEnum
     */
    UnSet($DescStatus){
        this.Status = this.Status & ~$DescStatus;
        //清除持续回合信息
        delete this.ValidPeriod[$DescStatus];
    }

    /**
     * 检测状态集中是否已经设置了指定状态
     * @param {Number} $DescStatus  BattleBuffEnum
     */
    Check($DescStatus){
        return (this.Status & $DescStatus) == $DescStatus;
    }

    /**
     * 列表所有已经设置的状态位
     * @return {[]}
     */
    List(){
        let $ret = [];
        for(let $i = 0; $i < 32; $i++){
            $ai = 1 << $i;
            if (this.Check($ai))
            {
                $ret.push($ai);
            }
        }
        return $ret;
    }

    /**
     * 是否为空状态集（所有状态均未设置）
     * @return {Boolean}
     */
    isNull(){
        return this.Status == 0;
    }

    /**
     * 获取数值
     * @return {Number}
     */
    get Value(){
        return this.Status;
    }
}

exports = module.exports = StatusManager;