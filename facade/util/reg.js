/**
 * 判断是否手机号码
 * @param {*} s 
 */
function checkMobile(s){
    var regu =/^[1][3][0-9]{9}$/;
    var re = new RegExp(regu);
    if (re.test(s)) {
        return true;
    }else{
        return false;
    }
}

/**
 * 判断字符串是否整数
 * @param {*} s 
 */
function isNumber( s ){
    var regu = "^[0-9]+$";
    var re = new RegExp(regu);
    if (re.test(s) != -1) {
        return true;
    } else {
        return false;
    }
}

function isEmail( str ){
    var myReg = /^[-_A-Za-z0-9]+@([_A-Za-z0-9]+.)+[A-Za-z0-9]{2,3}$/;
    if(myReg.test(str)) 
        return true;

    return false;
}

exports.isEmail = isEmail;
exports.isNumber = isNumber;
exports.checkMobile = checkMobile;