const router = require("express").Router();
const { default: base64url } = require("base64url");
const cbor = require('cbor');
const util = require('util');
const url = require('url');
const crypto = require('crypto');
const { fail } = require("assert");

// 初期画面のレンダリング
router.get("/", (req, res) => {
  res.render("./register.ejs");
});

// base64urlエンコード
function b64encode(buffer){
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// base64urlデコード(to ArrayBuffer)
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
    const challenge = b64encode(generateRandomBytes(16));
    console.log("save challenge into session : " + challenge);
    req.session.challenge = challenge;
    res.send(challenge);
});

// 認証器を登録する
router.post('/registerPasskey', async (req, res) => {
    // console.log(base64url.decode(req.body.response.clientDataJSON));

    // navigator.credentials.create()から返却されるclientDataJSONの取得
    const clientJSON = JSON.parse(base64url.decode(req.body.response.clientDataJSON))

    // レスポンスの検証
    let errorMsg = [];
    let failed = false;
    // challengeがセッション内に保存されているものと同一かどうか
    console.log("expected challenge from session : " + req.session.challenge);
    console.log("challenge to be evaluated : " + clientJSON.challenge);
    if(req.session.challenge !== clientJSON.challenge){
        console.log("challenge mismatch");
        errorMsg.push("challenge");
        failed = true;
    }
    // originがアクセスされているURLと同じかどうか
    // ngrokでテストしているのでhttpではなくhttpsで固定する（localhost以外の場合）
    const scheme = req.hostname !== 'localhost'? "https" : req.protocol;
    const origin = url.format({
        protocol: scheme,
        host: req.get('host')
    });
    console.log("expected origin : " + origin);
    console.log("origin to be evaluated : " + clientJSON.origin);
    if(origin !== clientJSON.origin){
        errorMsg.push("origin");
        failed = true;
    }
    // RPIDが同一かどうか
    const rpId = req.hostname;
    const expectedRpHash = crypto.createHash('sha256').update(rpId).digest('hex');
    console.log("expected rpId hash: " + expectedRpHash);
    const decodedAuthenticatorData = base64url.toBuffer(JSON.stringify(req.body.response.authenticatorData));
    const rpHashBuffer = decodedAuthenticatorData.slice(0, 32);
    const rpHashString = Buffer.from(new Uint8Array(rpHashBuffer)).toString("hex");
    console.log("rpId hash to be evaluated : " + rpHashString);
    if(expectedRpHash !== rpHashString){
        errorMsg.push("rpId");
        failed = true;
    }
    // 情報の保存

    // Response
    if(failed){
        res.status = 400;
        res.json({
            status: "Failed to register",
            message: errorMsg
        })
    }else{
        res.json({
            status: "succeed to register",
            message: "succeed to register"
        })
    }
});

router.get('/decodeCBOR', async (req, res) => {
    const d1 = b64decode(req.query.data);
    const d2 = cbor.decode(d1);
    console.log("decoded: " + util.inspect(d2));
});
module.exports = router;