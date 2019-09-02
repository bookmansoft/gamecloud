let {RankType, IndexType} = require('../../core/CoreOfBase/enum')

/**
 * 排序管理，标准流程如下：
 * 1、创建 Ranking 对象时，从接口参数集 rankParams 中获取排行榜尺寸、重新排序时间间隔等一系列参数，基本配置为100条、每隔10秒进行刷新
 * 2、数据库载入阶段，调用 Update(entity, true) 添加排行记录
 * 3、数据库加载完毕，调用 Init() 进行排序
 * 4、当有新的数据变化时，调用 UpdateRecord(info, type, false) 添加排行记录，并引发重新排序
 * 5、系统监视器定期调用 RunMonitor 监测特殊事件，例如跨天时每日榜自动清空
 */
class Ranking
{
    /**
     * 获取和 $class 相关联的 Ranking 对象
     * @return {Ranking}
     * 
     * @note 静态函数中的this指向类（类似PHP静态函数中的self），而其实例中的this指针指向实例对象
     */
    static muster($class){
        if(!$class || !$class.rankParams){
            throw new Error('class/Object using Ranking must have rankParams function');
        }

        if(!$class.$ranking){
            $class.$ranking = new this($class.rankParams);
        }

        return $class.$ranking;
    }

    /**
     * 构造函数
     */
    constructor(params){
        //region 接收接口参数，设置重要参数的缺省值
        this.params = params;           
        this.params.rankNumber = this.params.rankNumber || 100;
        //endregion

        this.rankList = new Map;        //分类存储排名记录
        this.indexList = new Map;       //排名记录的反向索引

        //为各类排名创建初始数据结构
        for(let rType of Object.values(RankType)){
            this.rankList.set(rType, []);
            this.indexList.set(rType, new Map);
        }

        //记录榜单更新时间（日），以提供日榜自动刷新功能
        this.dailyDay = (new Date()).toDateString();
    }

    /**
     * 添加新的记录，或者更新已有记录，并更新排名
     */
    UpdateRecord(infoMgr, rType, init=false){
        if(infoMgr.score <=0){
            return;
        }

        let rankData = this.rankList.get(rType);
        let indexData = this.indexList.get(rType);

        if(!!init){ 
            //流程1、系统启动、初次加载数据
            if(infoMgr.score > 0){
                rankData.push(infoMgr);
            }
            //此处提前返回，结束流程1，注意此时rankList未排序，indexList未填充，有赖于后续调用 Init 完成这些操作
            return;
        }
        
        /*流程2、后续数据变化后的更新,分为如下步骤：
        1、如果是已存在记录
            1、分数有变化但排名无变化：更新分数后返回
            2、排名有变化：删除原记录，准备在后续流程中重新插入
        2、如果是新记录：等待后续流程中插入
        3、后续插入流程：
            1、如果小于最后一名，且队列未满，直接添加到队列末尾后返回，否则直接返回
            2、如果大于第一名，直接添加到队列头部，继续后续流程
            3、如果是其它情况，使用二分法确定插入点，插入记录，继续后续流程
            4、保持队列尺寸，从尾部删除多余记录
            5、刷新插入点以后的所有记录的rank字段
        */
        let $ori = indexData.get(infoMgr.id);

        if(!!$ori){//已经存在记录
            if($ori.score == infoMgr.score){
                return; //已经存在记录，且分数没有发生变化，不需要进一步的处理
            }
            else{
                if($ori.rank==1 || $ori.score < rankData[$ori.rank-2].score){
                    //已经是第一名了，或者虽然分数发生变化，但并没有发生超越，只要记录下新的分数就可以返回了
                    $ori.score = infoMgr.score;
                    return; //提前返回
                }
                
                //否则的话，删除原有元素，准备重新插入
                rankData.splice($ori.rank-1,1);
            }
        }

        if (rankData.length == 0 || rankData[rankData.length - 1].score >= infoMgr.score) {//小于最后一名
            if (rankData.length < this.params.rankNumber) {
                rankData.push(infoMgr);
                indexData.set(infoMgr.id, infoMgr)
                infoMgr.rank = rankData.length;
            }
            return; //提前返回
        }
        
        let $more=0, $little=rankData.length-1; //二分法标记字段
        if(rankData[0].score < infoMgr.score){//大于第一名
            //在头部插入，然后继续后续流程
            rankData.unshift(infoMgr);
            indexData.set(infoMgr.id, infoMgr)
        }
        else{//二分法寻找合适的插值位置，前提条件：数组已按从大到小排序
            while(!($little == $more+1 || $little == $more)){
                let candidate = (($more + $little) / 2)|0; //二分法预期插入点
                if(infoMgr.score > rankData[candidate].score){//对比物小于自身
                    $little = candidate;
                }
                else if(infoMgr.score < rankData[candidate].score){
                    $more = candidate;
                }
                else{
                    $more = $little = candidate;
                }
            }
            rankData.splice($little,0,infoMgr);
            indexData.set(infoMgr.id, infoMgr)
        }

        //将最后一名删除，以保持列表尺寸不变
        while(rankData.length > this.params.rankNumber){
            let rec = rankData.pop();
            indexData.delete(rec.id);
        }

        //在排序过的榜单上，标注每个人的名次
        for(let i = $more; i<rankData.length; i++){
            rankData[i].rank = i+1;
        }
        // endregion
    }

    /**
     * 更新排行榜数据
     * @param {*} entity        //实体类
     */
    Update(entity, init=false) {
        if(!entity){ return; }
        
        for(let rType of Object.values(RankType)){
            if(RankType.friend == rType){
                continue;//好友帮单独添加条目
            }

            let infoMgr = {//用来排名的数据
                id: entity.IndexOf(IndexType.Foreign),
                name: entity.IndexOf(IndexType.Name), 
                score: entity.ScoreOf(rType)
            };

            this.UpdateRecord(infoMgr, rType, init);
        }
    }    

    /**
     * 在系统初始化完成、载入所有条目后调用，初始化起始排名信息
     */
    Init(rType){
        if(typeof rType == 'undefined'){
            this.rankList.forEach((list, rType) => {
                this.$Init(list, rType);
            });
        }
        else{
            let it = this.rankList.get(rType);
            if(!!it){
                this.$Init(it, rType);
            }
        }

        return this;
    }

    $Init(list, rType){
        list.sort((a, b)=>{return b.score - a.score;}); //排序
        if(list.length > this.params.rankNumber){ //保持队列尺寸
            list.splice(this.params.rankNumber, list.length - this.params.rankNumber);
        }

        //在排序过的榜单上，标注每个人的名次
        let idx = 0;
        for(let item of list){
            item.rank = ++idx;
            this.indexList.get(rType).set(item.id, item);
        }
    }

    /**
     * 返回携带排名信息的记录
     * @param {*} id        排名者索引
     * @param {*} rType     排行榜类别
     */
    result(id, rType = RankType.total){
        let l = this.indexList.get(rType);
        if(!!l && l.has(id)){
            return l.get(id);
        }
        return {rank:0};
    }

    /**
     * 返回指定类型的排行榜
     * @param {*} rType  排行榜类别
     * @return {Array}
     */
    list(rType){
        return this.rankList.get(rType);
    }
}

/**
 * 监视器接口：由通用Monitor自动调用，检测跨天事件，复位每日榜单
 * @param {CoreOfBase} fo   核心对象
 * @return {Boolean} false继续监控 true结束监控
 * 
 * @note 
 *      声明原型扩展方法时，不要使用兰姆达表达式，而要采用传统的function语法，否则会导致this指针异常
 */
Ranking.prototype.RunMonitor = function(fo) {
    let day = (new Date()).toDateString();
    if(this.dailyDay != day){ //跨天
        this.dailyDay = day;
        this.rankList.set(RankType.daily, []);
        this.indexList.set(RankType.daily, new Map);
    }
    return false;
}

exports = module.exports = Ranking
