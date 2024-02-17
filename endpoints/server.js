const router = require("express").Router();

// 初期画面のレンダリング
router.get("/", (req, res) => {
  res.render("./register.ejs");
});

// base64urlエンコード
function b64encode(buffer){
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

module.exports = router;