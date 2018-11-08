let facade = require('../../../../facade/Facade')
let {UserStatus, ActivityType, NotifyType, ActionExecuteType, em_Condition_Type, ResType, OperEnum, ReturnCode} = facade.const

/**
 * 社交类交互接口
 * Updated by liub on 2017-07-24.
 */
class social extends facade.Control
{
    /**
     * 社交类交互操作：送体力、放狗、送护盾、抓奴隶
     * 
     * @note 基本流程：
     * 1、事前判定：操作前置条件是否满足，是否消耗道具。一般情况下会在此处下行应答给客户端
     * 2、封装为统一的 Message 进行路由传递，之所以这样做，是为了可以跨服透传
     * 3、User.handleSocialMsg函数统一处理收到的 Message，必要时抛出社交类事件，在事件处理句柄中进行业务处理
     * 4、向对应的客户端下行Notify，必要时写邮件存档，邮件可携带奖励，打开阅读时自动领取
     *
     * @param user
     * @param objData
     * @returns {{code: number}}
     */
    async action(user, objData){
        let $msg = {type:parseInt(objData.actionType), info:{code:ReturnCode.Success, src:user.openid, dst: objData.openid}};
        switch($msg.type){
            case NotifyType.socialSendHello: //点赞
                let $social = user.getTxFriendMgr().sendHello($msg);
				if($social > 0){//可以点赞
                    user.socialNotify($msg, objData.openid);
                    return {code: ReturnCode.Success, data:{src:user.openid, dst:objData.openid, social: $social}};
                }
                else{
                    return {code: ReturnCode.socialHelloCd};
                }
                break;

            case NotifyType.socialBonusHello:
                //收获好友点的赞，得到随机奖励
                let bonus = user.getTxFriendMgr().bonusHello(objData.openid); //检测、发放奖励
                if(!!bonus){
                    //下行奖励信息, 客户端应该实时显示收到的奖励
                    return {code: ReturnCode.Success, data: bonus};
                }
                else{
                    return {code: ReturnCode.Error};
                }
                break;

            case NotifyType.slaveCatch:
                $msg.info.src = user.openid;
                $msg.info.dst = objData.openid;
                try{
                    //判断是否能抓捕，之前是否已经抓捕，是否达到奴隶上限, 等等
                    $msg.info.code = user.baseMgr.slave.canCatch(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        //下发战斗细节, 通过objData.openid获取合适的关卡号，并缓存在战斗对象中
                        let fri = user.getTxFriendMgr().getFriend(objData.openid);
                        if(!fri){ //没有发现指定好友
                            $msg.info.code = ReturnCode.socialNoEnemyToAttack;
                        }
                        else{
                            if(user.getActionMgr().Execute(ActionExecuteType.AE_SlaveCatch, 1, false)) {//可以继续抓捕
                                user.baseMgr.vip.registerSlaveBattle(fri);
                                $msg.info.gid = fri.hisGateNo;
                            }
                            else {//不能抓捕
                                $msg.info.code = ReturnCode.socialHelloCd;
                            }
                        }
                    }
                }
                catch(e){
                    console.error(e);

                    $msg.info.code = ReturnCode.Error;
                }

                user.notify($msg);

                break;

            case NotifyType.slaveEscape:
                $msg.info.src = objData.openid;
                $msg.info.dst = user.openid;
                try{
                    $msg.info.code = user.baseMgr.slave.canEscape(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        //下发战斗细节, 通过objData.openid获取合适的关卡号，并缓存在战斗对象中
                        let fri = user.getTxFriendMgr().getFriend(objData.openid);
                        if(!fri){ //没有发现指定好友
                            $msg.info.code = ReturnCode.socialNoEnemyToAttack;
                        }
                        else{
                            if(user.getActionMgr().Execute(ActionExecuteType.AE_SlaveEscape, 1, false)) {//可以起义
                                user.baseMgr.vip.registerSlaveBattle(fri);
                                $msg.info.gid = fri.hisGateNo;
                            }
                            else {
                                $msg.info.code = ReturnCode.socialHelloCd;
                            }

                        }
                    }
                }
                catch(e){
                    console.error(e);

                    $msg.info.code = ReturnCode.Error;
                }


                user.notify($msg);

                break;

            case NotifyType.slaveFlattery: //奴隶：谄媚
            {
                $msg.info.src = objData.openid;
                $msg.info.dst = user.openid;
                [$msg.info.code, $msg.info.time] = user.baseMgr.slave.flattery(objData.openid);
                if($msg.info.code == ReturnCode.Success){
                    if(user.getActionMgr().Execute(ActionExecuteType.slaveFlattery, 1, true)) {
                        //向好友发送消息
                        user.socialNotify($msg, objData.openid);
                    }
                    else {
                        $msg.info.code = ReturnCode.socialHelloCd;
                    }
                }
                user.socialNotify($msg);

                break;
            }

            case NotifyType.slaveCommend: //奴隶：表扬
            {
                $msg.info.src = user.openid;
                $msg.info.dst = objData.openid;
                if(user.getActionMgr().Execute(ActionExecuteType.slaveCommend, 1, true)) {
                    //向好友发送消息
                    user.socialNotify($msg, objData.openid);
                    let fri = user.getTxFriendMgr().getFriend($msg.info.dst);
                    if(!!fri) {
                        user.router.service.txApi.send_gamebar_msg(user,$msg.info.dst,3,"对你说最近表现的不错继续加油再有365个月我会考虑让你转正","V1_AND_QZ_4.9.3_148_RDM_T");
                    }
                    //成功后给奴隶主发放奖励
                    let bonus = [{type:ResType.Gold, num:500}];
                    user.getBonus(bonus);
                    $msg.info.bonus = bonus;
                }
                else {
                    $msg.info.code = ReturnCode.socialHelloCd;
                }
                user.socialNotify($msg);

                break;
            }

            case NotifyType.slaveRelease:
            { 
                $msg.info.src = user.openid;
                $msg.info.dst = objData.openid;
                //向好友发送消息
                user.socialNotify($msg);
                user.socialNotify($msg, objData.openid);

                break;
            }

            case NotifyType.socialSendAction: //赠送体力
                if(user.getActionMgr().Execute(ActionExecuteType.AE_SocialOfAction, 1, true)){//可以赠送体力
                    user.socialNotify($msg, objData.openid);
                    return {code: ReturnCode.Success, data: $msg.info};
                }
                else{
                    return {code: ReturnCode.socialHelloCd};
                }
                break;

            case NotifyType.purchase: //购买额外的次数
                let $num = user.getActionMgr().GetExtraNum(objData.act);

                let $cost = 100;
                if($num < 5 && $num >= 0){
                    $cost = [10, 20, 50, 80, 100][$num];
                }

                if(user.baseMgr.item.GetRes(ResType.Diamond) >= $cost){
                    user.getBonus({type:ResType.Diamond, num:-$cost});
                    user.getActionMgr().AddExtraNum(objData.act, 1);
                }
                else{
                    $msg.info.code = ReturnCode.DiamondNotEnough;
                }

                user.notify($msg);
                
                break;

            case NotifyType.slaveAvenge:
                {
                    $msg.info.src = objData.openid;
                    $msg.info.dst = user.openid;
                    $msg.info.code = user.baseMgr.slave.avenge(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        if(user.getActionMgr().Execute(ActionExecuteType.slaveAvenge, 1, true)) {
                            //向好友发送消息
                            user.socialNotify($msg, objData.openid);

                            //产生并发放300gold
                            let bonus = [{type:ResType.Gold, num:300}];
                            user.getBonus(bonus);
                            $msg.info.bonus = bonus;
                        }
                        else {
                            $msg.info.code = ReturnCode.socialHelloCd;
                        }
                    }
                    user.socialNotify($msg);
                }
                break;

            case NotifyType.slaveFood:{
                    $msg.info.src = user.openid;
                    $msg.info.dst = objData.openid;
                    //检测是否能够实施此动作，目标用户是否是自己的奴隶
                    $msg.info.code = user.baseMgr.slave.food(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        if(user.getActionMgr().Execute(ActionExecuteType.slaveFood, 1, true)) {
                            //向好友发送消息
                            user.socialNotify($msg, objData.openid);

                            //产生并发放随机奖励
                            let bonus = user.getTxFriendMgr().getRandomBonus(false);
                            user.getBonus(bonus);
                            $msg.info.bonus = bonus;
                        }
                        else {
                            $msg.info.code = ReturnCode.socialHelloCd;
                        }
                    }
                    user.socialNotify($msg);
                }
                break;

            case NotifyType.slaveLash:{
                    //检测是否能够实施此动作，目标用户是否是自己的奴隶
                    //奴隶主鞭打奴隶，奴隶主将获得互动奖励（即时获得，奴隶无奖励但会接收到鞭打消息的邮件
                    $msg.info.src = user.openid;
                    $msg.info.dst = objData.openid;
                    [$msg.info.code, $msg.info.time] = user.baseMgr.slave.lash(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        if(user.getActionMgr().Execute(ActionExecuteType.slaveLash, 1, true)) {
                            //todo：代币数量为5~20随机,每次几率增加10%,最高30%
                            let randomNum = Math.random();
                            let num = 0;
                            if(randomNum <= 0.8){
                                num = 1;
                            }
                            else if(randomNum > 0.8 && randomNum <= 0.99){
                                num = 2;
                            }
                            else num = 3;
                            let bonus = [{type:ResType.Diamond, num:num}];
                            user.getBonus(bonus);
                            $msg.info.bonus = bonus;
                            user.socialNotify($msg, objData.openid);
                        }
                        else {
                            $msg.info.code = ReturnCode.socialHelloCd;
                        }
                    }
                    user.socialNotify($msg);
                }

                break;

            case NotifyType.slaveRansom: 
                { //检测并消耗赎身道具
                    $msg.info.src = objData.openid;
                    $msg.info.dst = user.openid;
                    $msg.info.code = user.baseMgr.slave.ransom(objData.openid);
                    if($msg.info.code == ReturnCode.Success){
                        //向好友发送消息
                        user.socialNotify($msg, objData.openid);
                    }
                    user.socialNotify($msg);
                }
                break;

            default:
                break;
        }
    }

    /**
     * 下发奴隶系统列表信息
     * @param {*} user 
     * @param {*} objData 
     */
    async getSlaveList(user, objData){
        user.notify({type: NotifyType.slaveList, info: user.baseMgr.slave.getList()});
    }

    /**
     * 分享获得复活道具
     * @param user
     * @param objData
     * @returns {Promise.<{code: number}>}
     */
    async share(user, objData){
        let ret = {code:ReturnCode.illegalData, data:{}};

        //判断是否可进行首次分享操作
        if(!user.baseMgr.info.CheckStatus(UserStatus.isFirstShare)){
            //标识用户已经进行过首次分享的操作了，该状态会被持久化到数据库，客户端可根据data.info.status进行判断
            user.baseMgr.info.SetStatus(UserStatus.isFirstShare);

            //todo:向用户发放首次分享奖励，并notify给客户端
            user.getBonus({type:ResType.Gold, num:1000});
            user.getBonus({type:ResType.Item, id: 20, num: 1});
            ret.code = ReturnCode.Success;
            ret.data.bonus = [{type:ResType.Gold, num:1000},{type:ResType.Item, id:20, num:1}];
            user.notify({type: NotifyType.firstShareBonus, info: ret.data});
            return;
        }

        switch(parseInt(objData.type)){
            case ActionExecuteType.AE_SocialOfFail:
                if(user.getActionMgr().Execute(ActionExecuteType.AE_SocialOfFail, 1, true)){
                    facade.current.notifyEvent('user.task', {user:user, data:[
                        {type:facade.const.em_Condition_Type.shareOfFail, value:1},
                        {type:facade.const.em_Condition_Type.totalShare, value:1}
                    ]})

                    ret.code = ReturnCode.Success;
                    ret.data.bonus = user.baseMgr.task.getBonus("3001");
                    ret.data.items = user.baseMgr.item.getList();
                }
                else{
                    ret.code = ReturnCode.socialActionLimited;
                }
                break;

            case ActionExecuteType.AE_SocialOfAction:
                if(user.getActionMgr().Execute(ActionExecuteType.AE_SocialOfAction, 1, true)){
                    facade.current.notifyEvent('user.task', {user:user, data:[
                        {type:facade.const.em_Condition_Type.shareOfLackAction, value:1},
                        {type:facade.const.em_Condition_Type.totalShare, value:1}
                    ]});

                    ret.code = ReturnCode.Success;
                    ret.data.bonus = user.baseMgr.task.getBonus("3002");
                    ret.data.items = user.baseMgr.item.getList();
                }
                else{
                    ret.code = ReturnCode.socialActionLimited;
                }
                break;

            case ActionExecuteType.AE_SocialOfSuper:
                if(user.getActionMgr().Execute(ActionExecuteType.AE_SocialOfSuper, 1, true)){
                    facade.current.notifyEvent('user.task', {user:user, data:{type:facade.const.em_Condition_Type.totalShare, value:1}});

                    ret.code = ReturnCode.Success;
                    if(!!user.baseMgr.vip.superBonus){
                        ret.data.bonus = user.baseMgr.vip.superBonus;
                        user.getBonus(user.baseMgr.vip.superBonus);
                        user.baseMgr.vip.superBonus = null;
                    }
                    else{
                        ret.data.bonus = [];
                    }
                    ret.data.items = user.baseMgr.item.getList();
                }
                else{
                    ret.code = ReturnCode.socialActionLimited;
                }
                break;
            }
        return ret;
    }    
}

exports = module.exports = social;