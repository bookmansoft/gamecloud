/**
 * 定义了一个独立数据校验函数，用于游戏服务端在登录、支付时的独立验证
 */

const crypto = require('crypto')
const elliptic = require('elliptic');
const secp256k1 = elliptic.ec('secp256k1');

/**
 * 序列化对象，和 JSON.stringify 不同之处在于：
 *    1、排除了属性排序变化带来的影响
 *    2、主动去除了 exclude 中的属性
 * @param {Object} data      待序列化的对象
 * @param {Array?} exclude   包含所有待排除的属性名的数组
 */
function stringify(data, exclude) {
    let base = '';
    Object.keys(data).sort().map(key=>{
        if(!exclude || !exclude[key]) {
            base += key + data[key];
        }
    });
    return base;
}
  
function hash(alg, data) {
    return crypto.createHash(alg).update(data).digest();
};

function ripemd160(data) {
  return hash('ripemd160', data);
};

function hash160(data) {
  return ripemd160(sha256(data));
};
 
function sha256(data) {
    return hash('sha256', data);
};

function hash256(data) {
    return sha256(sha256(data));
};

/**
 * 验证持令牌者，拥有对令牌中地址的支配权
 * @param {Object} packet 
 *      {
 *          data:               //等待校验的数据
 *          {
 *              pubkey,         //用于签名校验的公钥
 *              ...             //其他字段
 *          }, 
 *          sig                 //数据的签名
 *      }
 */
function verifyData(packet) {
    try {
        //取出公钥
        let key = Buffer.from(packet.data.pubkey, 'hex'); 
        //验证公钥是否是一个合理构造
        const pub = secp256k1.keyPair({ pub: key }); 
        if(!pub.validate()) {
            return false;
        }
        //至此，证明了公钥是合理的结构

        //取待校验数据，注意序列化时使用了属性名自然排序，因此要求签名时也必须使用属性名自然排序
        let src = Buffer.from(stringify(packet.data));

        //利用公钥校验数据
        if(secp256k1.verify(
            hash256(src),                       //将待校验的数据对象规整为32字节哈希
            Buffer.from(packet.sig, 'hex'),     //取签名信息
            key,                                //公钥
        )) {
            //至此，证明了数据签名确实是使用和公钥匹配的私钥加密而来的
            if(decode(packet.data.addr).hash.toString('hex') == hash160(key).toString('hex')) {
                //至此，证明了数据中的地址和公钥是匹配的，持此令牌的用户对该地址拥有支配权
                return true;  //校验成功
            }
        }
    } catch (e) {

    }

    return false;
}

const POOL65 = Buffer.allocUnsafe(65);
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const TABLE = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  15, -1, 10, 17, 21, 20, 26, 30,  7,  5, -1, -1, -1, -1, -1, -1,
  -1, 29, -1, 24, 13, 25,  9,  8, 23, -1, 18, 22, 31, 27, 19, -1,
   1,  0,  3, 16, 11, 28, 12, 14,  6,  4,  2, -1, -1, -1, -1, -1,
  -1, 29, -1, 24, 13, 25,  9,  8, 23, -1, 18, 22, 31, 27, 19, -1,
   1,  0,  3, 16, 11, 28, 12, 14,  6,  4,  2, -1, -1, -1, -1, -1
];

/**
 * Update checksum.
 * @ignore
 * @param {Number} chk
 * @returns {Number}
 */

function polymod(pre) {
  const b = pre >>> 25;
  return ((pre & 0x1ffffff) << 5)
    ^ (-((b >> 0) & 1) & 0x3b6a57b2)
    ^ (-((b >> 1) & 1) & 0x26508e6d)
    ^ (-((b >> 2) & 1) & 0x1ea119fa)
    ^ (-((b >> 3) & 1) & 0x3d4233dd)
    ^ (-((b >> 4) & 1) & 0x2a1462b3);
}

/**
 * Encode hrp and data as a bech32 string.
 * @ignore
 * @param {String} hrp
 * @param {Buffer} data
 * @returns {String}
 */

function serialize(hrp, data) {
  let chk = 1;
  let i;

  for (i = 0; i < hrp.length; i++) {
    const ch = hrp.charCodeAt(i);

    if ((ch >> 5) === 0)
      throw new Error('Invalid bech32 character.');

    chk = polymod(chk) ^ (ch >> 5);
  }

  if (i + 7 + data.length > 90)
    throw new Error('Invalid bech32 data length.');

  chk = polymod(chk);

  let str = '';

  for (let i = 0; i < hrp.length; i++) {
    const ch = hrp.charCodeAt(i);
    chk = polymod(chk) ^ (ch & 0x1f);
    str += hrp[i];
  }

  str += '1';

  for (let i = 0; i < data.length; i++) {
    const ch = data[i];

    if ((ch >> 5) !== 0)
      throw new Error('Invalid bech32 value.');

    chk = polymod(chk) ^ ch;
    str += CHARSET[ch];
  }

  for (let i = 0; i < 6; i++)
    chk = polymod(chk);

  chk ^= 1;

  for (let i = 0; i < 6; i++)
    str += CHARSET[(chk >>> ((5 - i) * 5)) & 0x1f];

  return str;
}

/**
 * Decode a bech32 string.
 * @param {String} str
 * @returns {Array} [hrp, data]
 */

function deserialize(str) {
  let dlen = 0;

  if (str.length < 8 || str.length > 90)
    throw new Error('Invalid bech32 string length.');

  while (dlen < str.length && str[(str.length - 1) - dlen] !== '1')
    dlen++;

  const hlen = str.length - (1 + dlen);

  if (hlen < 1 || dlen < 6)
    throw new Error('Invalid bech32 data length.');

  dlen -= 6;

  const data = Buffer.allocUnsafe(dlen);

  let chk = 1;
  let lower = false;
  let upper = false;
  let hrp = '';

  for (let i = 0; i < hlen; i++) {
    let ch = str.charCodeAt(i);

    if (ch < 0x21 || ch > 0x7e)
      throw new Error('Invalid bech32 character.');

    if (ch >= 0x61 && ch <= 0x7a) {
      lower = true;
    } else if (ch >= 0x41 && ch <= 0x5a) {
      upper = true;
      ch = (ch - 0x41) + 0x61;
    }

    hrp += String.fromCharCode(ch);
    chk = polymod(chk) ^ (ch >> 5);
  }

  chk = polymod(chk);

  let i;
  for (i = 0; i < hlen; i++)
    chk = polymod(chk) ^ (str.charCodeAt(i) & 0x1f);

  i++;

  while (i < str.length) {
    const ch = str.charCodeAt(i);
    const v = (ch & 0x80) ? -1 : TABLE[ch];

    if (ch >= 0x61 && ch <= 0x7a)
      lower = true;
    else if (ch >= 0x41 && ch <= 0x5a)
      upper = true;

    if (v === -1)
      throw new Error('Invalid bech32 character.');

    chk = polymod(chk) ^ v;

    if (i + 6 < str.length)
      data[i - (1 + hlen)] = v;

    i++;
  }

  if (lower && upper)
    throw new Error('Invalid bech32 casing.');

  if (chk !== 1)
    throw new Error('Invalid bech32 checksum.');

  return [hrp, data.slice(0, dlen)];
}

/**
 * Convert serialized data to bits,
 * suitable to be serialized as bech32.
 * @param {Buffer} data
 * @param {Buffer} output
 * @param {Number} frombits
 * @param {Number} tobits
 * @param {Number} pad
 * @param {Number} off
 * @returns {Buffer}
 */

function convert(data, output, frombits, tobits, pad, off) {
  const maxv = (1 << tobits) - 1;
  let acc = 0;
  let bits = 0;
  let j = 0;

  if (pad !== -1)
    output[j++] = pad;

  for (let i = off; i < data.length; i++) {
    const value = data[i];

    if ((value >> frombits) !== 0)
      throw new Error('Invalid bech32 bits.');

    acc = (acc << frombits) | value;
    bits += frombits;

    while (bits >= tobits) {
      bits -= tobits;
      output[j++] = (acc >>> bits) & maxv;
    }
  }

  if (pad !== -1) {
    if (bits > 0)
      output[j++] = (acc << (tobits - bits)) & maxv;
  } else {
    if (bits >= frombits || ((acc << (tobits - bits)) & maxv))
      throw new Error('Invalid bech32 bits.');
  }

  return output.slice(0, j);
}

/**
 * Serialize data to bech32 address.
 * @param {String} hrp
 * @param {Number} version
 * @param {Buffer} hash
 * @returns {String}
 */

function encode(hrp, version, hash) {
  const output = POOL65;

  if (version < 0 || version > 16)
    throw new Error('Invalid bech32 version.');

  if (hash.length < 2 || hash.length > 40)
    throw new Error('Invalid bech32 data length.');

  const data = convert(hash, output, 8, 5, version, 0);

  return serialize(hrp, data);
}

/**
 * Deserialize data from bech32 address.
 * @param {String} str
 * @returns {Object}
 */

function decode(str) {
  const [hrp, data] = deserialize(str);

  if (data.length === 0 || data.length > 65)
    throw new Error('Invalid bech32 data length.');

  if (data[0] > 16)
    throw new Error('Invalid bech32 version.');

  const version = data[0];
  const output = data;
  const hash = convert(data, output, 5, 8, -1, 1);

  if (hash.length < 2 || hash.length > 40)
    throw new Error('Invalid bech32 data length.');

  return new AddrResult(hrp, version, hash);
}

/**
 * AddrResult
 * @constructor
 * @private
 * @param {String} hrp
 * @param {Number} version
 * @param {Buffer} hash
 * @property {String} hrp
 * @property {Number} version
 * @property {Buffer} hash
 */

function AddrResult(hrp, version, hash) {
  this.hrp = hrp;
  this.version = version;
  this.hash = hash;
}

/*
 * Expose
 */

module.exports = verifyData;