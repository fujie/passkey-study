const router = require("express").Router();
const base64url = require("base64url");
const cbor = require('cbor');
const util = require('util');
const url = require('url');
const crypto = require('crypto');
const jsonbin = require('../lib/jsonbin');

// 初期画面のレンダリング
router.get("/", (req, res) => {
  res.render("./register.ejs");
});

// challengeを生成する
function generateRandomBytes(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}

// ユーザを登録する
router.post('/user', async (req, res) => {
    // 登録状態を調べる
    // 既存なら登録済みパスキーを取得して返却する→Excludeに入れる
    // 新規なら登録
    // 構造
    //  - username
    //  - userId
    // userIdを生成する
    userId = base64url.encode(generateRandomBytes(16));
    const user = {
        username: req.body.username,
        id: userId
    };
    // ユーザ情報をセッションに保存する
    req.session.user = JSON.stringify(user);
    // userId(ArrayBuffer)を返却する
    res.send(userId);
})

// challengeをエンコードして返却する
router.get('/getChallenge', async (req, res) => {
    const challenge = base64url.encode(generateRandomBytes(16));
    console.log("save challenge into session : " + challenge);
    req.session.challenge = challenge;
    res.send(challenge);
});

// 認証器を登録する
router.post('/registerPasskey', async (req, res) => {
    console.log(base64url.decode(req.body));

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
        console.log("origin mismatch");
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
        console.log("rpIdHash mismatch");
        errorMsg.push("rpId");
        failed = true;
    }
    // 情報の保存（ユーザID、ユーザ名、クレデンシャルID、公開鍵、カウンタ）
    // sessionからユーザ情報を取り出す
    const user = JSON.parse(req.session.user);
    console.log("username: " + user.username);
    console.log("userid: " + user.id);

    // credentialIdをPublicKeyCredentialから取得する
    const credentialId = req.body.id;
    console.log("credential id: " + credentialId);

    // publicKey(base64urlエンコード済み)を取得する
    const publicKey = req.body.response.publicKey
    console.log("public key: " + publicKey);

    // signCount
    const signCount = decodedAuthenticatorData.slice(33,37);
    const signCountHex = Buffer.from(new Uint8Array(signCount)).toString('hex');
    console.log("sign Count: " + signCountHex);
    console.log("sign Count Number : " + parseInt(signCountHex, 16));

    // 登録する情報
    const passkey = {
        username: user.username,
        userId: user.id,
        credentialId: credentialId,
        publicKey: publicKey,
        signCount: parseInt(signCountHex, 16)
    }
    // JSONBinへ登録
    const JSONBinResponse = await jsonbin.registerPasskey(JSON.stringify(passkey));
    console.log("res: " + JSON.stringify(JSONBinResponse));

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
    const d1 = base64url.decode(req.query.data);
    const d2 = cbor.decode(d1);
    console.log("decoded: " + util.inspect(d2));
});
module.exports = router;