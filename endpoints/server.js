const router = require("express").Router();
const cbor = require('cbor');
const util = require('util');

// 初期画面のレンダリング
router.get("/", (req, res) => {
  res.render("./register.ejs");
});

// base64urlエンコード
function b64encode(buffer){
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// base64urlデコード
function b64decode(instr){
    const base64 = instr.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const bin = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bin[i] = binStr.charCodeAt(i);
    }
    return bin.buffer;
}

// challengeを生成する
function generateRandomBytes(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}

// challengeをエンコードして返却する
router.get('/getChallenge', async (req, res) => {
    res.send(b64encode(generateRandomBytes(16)));
});

router.get('/decodeCBOR', async (req, res) => {
    const d1 = b64decode(req.query.data);
    const d2 = cbor.decode(d1);
    console.log("decoded: " + util.inspect(d2));
});
module.exports = router;