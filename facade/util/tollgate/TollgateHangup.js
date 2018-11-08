/**
 * 挂机相关参数
 * Class TollgateHangup
 * @package App\Config
 */
const TollgateHangup = {
    /**
     * 小怪的总数量
     * 每一关所需要的挂机时间（秒），受科技影响
     * @var int
     */
    seconds: 1,
    hangUpStartPoint: null,
    hangUpEndPoint: null,

    /**
     * 传入挂机累计次数，获取挂机起始关卡数 - 必须通过该关卡才能挂机
     * @return \Closure|null
     */
    getHangUpStartPoint: function(){
        if (TollgateHangup.hangUpStartPoint == null) {
            TollgateHangup.hangUpStartPoint = function ($recy) {
                return $recy * 0;
            };
        }
        return TollgateHangup.hangUpStartPoint;
    },

    /**
     * 传入历史最高关卡，获取挂机结束关卡数 - 挂机结束时，能够达到的最高关卡数
     * @return \Closure|null
     */
    getHangUpEndPoint: function(){
        if (TollgateHangup.hangUpEndPoint == null) {
            TollgateHangup.hangUpEndPoint = function ($gateNo) {
                return Math.max(1, $gateNo - 10);
            };
        }
        return TollgateHangup.hangUpEndPoint;
    },
}

exports = module.exports = TollgateHangup;
