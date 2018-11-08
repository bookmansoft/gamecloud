// 加载File System读写模块  
var fs 				= require('fs');
var util 			= require('util');
var CommonFunc		= require('./commonFunc');

let iniList = {};
let isLoaded = {};

class $CFileCtl{
    //	写入文件  
    WriteFile(fileName, jsObj){ 
        var objJson = JSON.stringify(jsObj, null, 2);

        fs.writeFile(fileName, objJson, function(err) {
            if (err) {
                console.log("fail " + err);  
            } else {
                //console.log("写入文件ok");  
            }
        });
    }  
  
    //	从文件中读取字符串
    ReadFileStr(userName) {
        return fs.readFileSync(userName, 'utf-8');
    }
    //	从文件中读取数据
    ReadFileObj(userName) {
		let strJson = this.ReadFileStr(userName);
        let ret = {};
        try {
			let ext = userName.split('.')[1];
			switch(ext){
				default:
					ret = JSON.parse(strJson);
					break;
			}
        } catch (e) {
            console.log('read file obj err=[' + userName + '] json=[' + strJson + ']');
        }
        return ret;
    }

    //	写入对象到文件中
    WriteFileObj(userName, jsObj) {
        this.WriteFile(userName, jsObj);
    }

    // 文件是否存在
    IsFileExist(userName) {	
        try{
            fs.accessSync(userName)
            return true;
        } catch(e){
        }
        return false;
    }
}

let CFileCtl = new $CFileCtl();

function CreateFile (iniFileName) {
	var info = {
		//	文件名
		fileName : '',
		
		//	值
		v : {
			
		},
		
		//	初始化
		Init : function(iniFileName) {
			this.fileName = iniFileName;
		},
		//	获取文件名
		GetFileName : function() {
			return this.fileName;
		},
		//	获取文件内容
		GetInfo : function() {
			return this.v;
		},
		//	设置完整信息
		SetInfo : function(vObj) {
			this.v = vObj;
			return this;
		},
		//	保存文件
		Save : function() {
			if (this.v) {
				CFileCtl.WriteFileObj(this.GetFileName(), this.v);
			}
		},
		//	加载文件
		Load : function() {
			var bFileExist = this.IsHave();
			if (bFileExist) {
				this.v = CFileCtl.ReadFileObj(this.GetFileName());
			}
			return this;
		},
		//	是否存在文件
		IsHave : function() {
			return CFileCtl.IsFileExist(this.GetFileName());
		},
		//	清理文件
		Clear : function() {
			CFileCtl.WriteFileObj(this.GetFileName(), null);
		},
	};
	info.Init(iniFileName);
	info.Load();
	return info;
};


/**
 * 获取filename指定的文件
 * @param filename
 * @returns {*}
 */
function getFileByName(filename){
    if(!isLoaded[filename]){
        isLoaded[filename] = true;
        let CIniUserMgr	= CreateFile(filename);
        if (CIniUserMgr.IsHave()) {
            iniList[filename] = CIniUserMgr;
        }
    }
    return iniList[filename];
}
exports.get = getFileByName;
