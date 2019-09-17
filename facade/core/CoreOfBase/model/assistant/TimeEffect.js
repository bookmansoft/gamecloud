let facade = require('../../../../Facade')
let EffectManager = facade.Util.EffectManager
let baseMgr = facade.Assistant;

/**
 * 持续性魔法效果管理器
 */
class EffectTimerManager extends baseMgr
{
    constructor(parent) {
        super(parent);

        //Mixin EffectManager 的准备工作，以便在mixin时合并两者的构造函数
        EffectManager.prototype.mixin.apply(this);
    }
}

facade.tools.mixin(EffectTimerManager, EffectManager);

exports = module.exports = EffectTimerManager;