/**
 * 领域类型
 */
const DomainType = {
    MF: "mf",               //MoreFun
    TX: "tx",               //空间
    TXX: "txx",             //QQ
    D360: "360",            //360
    OFFICIAL: "offcial",    //官网
    SYSTEM: "system",       //RPC
    ADMIN: "admin",         //系统管理员
    WX: "authwx",           //系统管理员
};

const DomainClass = [
    '', 'IOS', 'Android', 'Test',
];

exports = module.exports = {
    DomainType: DomainType,
    DomainClass: DomainClass,
};
