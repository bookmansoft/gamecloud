let baseMgr = require('../baseAssistant');

class txInfo extends baseMgr
{
    constructor(parent){
        super(parent, 'txInfo');
        //	数据
        this.v   = {
            openid: '',

            openkey: '',

            pf:'',
            //	QQ昵称
            nickname: '',

            //	性别
            gender: "",

            //	头像地址
            figureurl: "",

            //	是否蓝钻，true代表是，false代表不是
            is_blue_vip: false,

            //	是否年费蓝钻，true代表是，false代表不是
            is_blue_year_vip: false,

            //蓝钻等级
            blue_vip_level: 0,

            //是否豪华版蓝钻，true代表是，false代表不是
            is_super_blue_vip:false,
        };
    }

    LoadData(val){
        //腾讯大厅
        this.v.openkey = this.parent.openkey;
        this.v.pf = this.parent.pf;
        //腾讯大厅 end
    }

    //	设置openkey
    SetOpenKey(openkey) {
        this.v.openkey = openkey;
        this.dirty = true;
    }
    //	获取openkey
    GetOpenKey() {
        return this.v.openkey;
    }
    //	设置pf
    SetPf(pf) {
        this.v.pf = pf;
        this.dirty = true;
    }
    //	获取openid
    GetPf() {
        return this.v.pf;
    }
    //	设置昵称
    SetNickName(nickname) {
        this.v.nickname = nickname;
    }
    //	获取昵称
    GetNickName() {
        return this.v.nickname;
    }
    //	设置性别
    SetGender(gender) {
        this.v.gender = gender;
    }
    //	获取性别
    SetGender() {
        return this.v.gender;
    }
    //	设置 头像地址
    SetFigureurl(figureurl) {
        this.v.figureurl = figureurl;
        this.dirty = true;
    }
    //	获取 头像地址
    GetFigureurl() {
        return this.v.figureurl;
    }

    //	设置蓝钻
    SetBlueVip(flag) {
        this.v.is_blue_vip = flag;
    }
    //	判断是否蓝钻
    IsBlueVip() {
        return this.v.is_blue_vip;
    }
    //	设置年费蓝钻
    SetBlueYearVip(flag) {
        this.v.is_blue_year_vip = flag;
    }
    //	判断是否年费蓝钻
    IsBlueYearVip() {
        return this.v.is_blue_year_vip;
    }
    //	设置蓝钻等级
    SetBlueVipLevel(level) {
        this.v.blue_vip_level = level;
    }
    //	获取蓝钻等级
    GetBlueVipLevel() {
        return this.v.blue_vip_level;
    }
    //	设置豪华版蓝钻
    SetSuperBlueVip(flag) {
        this.v.is_super_blue_vip = flag;
    }
    //	判断是否豪华版蓝钻
    IsSuperBlueVip() {
        return this.v.is_super_blue_vip;
    }
}

exports = module.exports = txInfo;
