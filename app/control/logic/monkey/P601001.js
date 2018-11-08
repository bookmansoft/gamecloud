let facade = require('../../../../facade/Facade')
let {RankType, EntityType, UserStatus, ActivityType, NotifyType, ActionExecuteType, em_Condition_Type, OperEnum, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')

/**
 * 排行榜相关的操作
 */
const em_Rank_OperType = {
    queryTotal:1,           //查询总榜
    queryBattle:2,          //查询竞技榜
    queryFriend:3,          //查询好友榜
    queryDaily:4,           //查询每日榜
}

/**
 * 排行榜功能接口
 * 排行榜分为总榜、好友榜、竞技榜，所有榜单都为大世界榜
 * 1、总榜：根据玩家通关关数，结合当前战力指数进行排序，通关关数越高、战力指数越高，排名越高。
 * 2、好友榜：类似总榜，但只在社交好友内进行排名
 * 3、竞技榜：根据玩家PVP胜率，结合其默认卡组战力进行排序，胜率越高、卡组战力越高，排名越高。
 */
class P601001 extends facade.Control
{
    /**
     * @brief  报文编号 P601001
     *
     * @date   2018.1.27
     *
     * @param {UserEntity} user 
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型
     * page        | int      | 请求的数据集页面编码
     * pageSize    | int      | 请求的数据集页面大小
     * idx         | int      | 请求的数据项编号
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     *
     * @note
     */
    async Execute(user, input) {
        input.oper = parseInt(input.oper || 0);
        input.idx = parseInt(input.idx || 0);
        input.page = parseInt(input.page || 1);
        input.pageSize = parseInt(input.pageSize || 5);

        let $code = ReturnCode.Success;
        let $rankType = RankType.total;
        switch(input.oper){
            case em_Rank_OperType.queryFriend:
            {
                $rankType = RankType.friend;
                await user.getTxFriendMgr().refreshSocialNetwork();
            }

            case em_Rank_OperType.queryTotal:
                $rankType = RankType.total;
                break;
            
            case em_Rank_OperType.queryBattle:
                $rankType = RankType.battle;    
                break;

            case em_Rank_OperType.queryDaily:
                $rankType = RankType.daily;
                break;
        }
        let dt = {
            rank: facade.GetRanking(UserEntity).result(user.openid, $rankType).rank,
            list: facade.GetRanking(UserEntity).list($rankType).slice(input.pageSize*(input.page-1), input.pageSize),
        }
        return {code:ReturnCode.Success, data:dt};
}
}

exports = module.exports = P601001;

