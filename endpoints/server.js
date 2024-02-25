const router = require("express").Router();
const base64url = require("base64url");
const cbor = require('cbor');
const util = require('util');
const url = require('url');
const crypto = require('crypto');
const jsonbin = require('../lib/jsonbin');
const simpleWebAuthn = require("@simplewebauthn/server");

// 登録画面のレンダリング
router.get("/register", (req, res) => {
    res.render("./register.ejs");
});

// ログイン画面のレンダリング
router.get("/login", (req, res) => {
    res.render("./login.ejs");
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

// ログインする
router.post('/loginWithCredential', async (req, res) => {
    // originの生成
    const scheme = req.hostname !== 'localhost'? "https" : req.protocol;
    const origin = url.format({
        protocol: scheme,
        host: req.get('host')
    });
    // userHandleとcredentialIdでJSONBinを検索しPublicKeyとcounterを取得する
    const credentailId = req.body.id;
    const userHandle = req.body.response.userHandle;
    // JSONBinの検索
    const JSONBinResponse = await jsonbin.getPublicKey(credentailId, userHandle);
    console.log("res: " + JSON.stringify(JSONBinResponse));


    // authenticator
    const authenticator = {
        credentialPublicKey: base64url.toBuffer(JSONBinResponse.publicKey),
        credentialID: base64url.toBuffer(credentailId),
        counter: JSONBinResponse.signCount
    };
    
    // 検証
    const result = await simpleWebAuthn.verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge: req.session.challenge,
        expectedOrigin: origin,
        expectedRPID: req.hostname,
        authenticator: authenticator
    });
    console.log(result);
    if(result.verified) {
        // 検証成功
        // 検証回数が増えているかどうか（0の場合以外）
        if(result.authenticationInfo.newCounter !== 0) {
            if(result.authenticationInfo.newCounter <= JSONBinResponse.signCount){
                console.log("error signCount is not increased");
            }
        }
        // UVが行われているかどうか
        if(!result.authenticationInfo.userVerified) {
            console.log("user was not verified");
        }
    } else {
        // 検証失敗
    }
    //
    res.json({
        verified: result.verified,
        username: JSONBinResponse.username
    });
});

// 認証器を登録する
router.post('/registerPasskey', async (req, res) => {
    // originの生成
    const scheme = req.hostname !== 'localhost'? "https" : req.protocol;
    const origin = url.format({
        protocol: scheme,
        host: req.get('host')
    });

    const result = await simpleWebAuthn.verifyRegistrationResponse({
        response: req.body,
        expectedChallenge: req.session.challenge,
        expectedOrigin: origin,
        expectedRPID: req.hostname
    });
    console.log(result);

    if(result.verified) {
        // 検証成功
        // sessionからユーザ情報を取り出す
        const user = JSON.parse(req.session.user);
        console.log("username: " + user.username);
        console.log("userid: " + user.id);
        // JSONBinに登録する情報を生成する
        const passkey = {
            username: user.username,
            userId: user.id,
            credentialId: base64url.encode(result.registrationInfo.credentialID),
            publicKey: base64url.encode(result.registrationInfo.credentialPublicKey),
            signCount: result.registrationInfo.counter
        }
        // JSONBinへ登録
        const JSONBinResponse = await jsonbin.registerPasskey(JSON.stringify(passkey));
        console.log("res: " + JSON.stringify(JSONBinResponse));
    }
    res.json(result);
});

router.get('/decodeCBOR', async (req, res) => {
    const d1 = base64url.decode(req.query.data);
    const d2 = cbor.decode(d1);
    console.log("decoded: " + util.inspect(d2));
});
module.exports = router;