let facade = require('../../Facade')
let {ReturnCode} = facade.const

class CheckValid
{
    CheckValid($func) {
        if(this.errorCode == null){
            this.errorCode = ReturnCode.Success;
        }

        if(this.errorCode == ReturnCode.Success){
            this.errorCode = $func.apply(this);
        }
        return this;
    }

    Success($func){
        if(this.errorCode == ReturnCode.Success){
            $func.apply(this);
        }
        return this;
    }
    
    Catch($func) {
        if(this.errorCode != ReturnCode.Success){
            $func.apply(this);
        }
        return this;
    }
}

module.exports = CheckValid;
