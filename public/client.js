// 文字列をArrayBufferへ変換する
async function string_to_buffer(src) {
    return (new Uint16Array([].map.call(src, function(c) {
        return c.charCodeAt(0)
    }))).buffer;
}
// base64urlエンコードを行う
async function b64encode(instr){
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(instr)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
// base64urlデコードを行う
async function b64decode(instr){
    const base64 = instr.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = window.atob(base64);
    const bin = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bin[i] = binStr.charCodeAt(i);
    }
    return bin.buffer;
}
  
// 登録を開始する
async function registerCredential(userId) {
    // challengeを取得する（後で使うのでサーバサイドで生成する）
    const requestUrl = '/passkey/getChallenge';
    const request = new Request(requestUrl);
    const headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };
    const response = await fetch(request, {
        method: "GET",
        credentials: 'same-origin',
        headers: headers
    });
    // バイナリを扱うためにサーバ・クライアント間ではbase64urlエンコードした値でやり取りする
    const encodedChallenge = await response.text();
    const decodedChallenge = await b64decode(encodedChallenge);

    // ユーザIDを取得する
    // 画面に入力された文字列をArrayBufferへ変換する
    const arrayBufferUserId = await string_to_buffer(userId);

    // パスキー登録のためのパラメータを生成する
    const options = {
        challenge: decodedChallenge,
        rp: {
            name: "test site",
            id: "08df-240d-1e-4ba-a800-ac83-5a06-b97f-e33c.ngrok-free.app"
        },
        user: {
            id: arrayBufferUserId,
            name: userId,
            displayName: userId
        },
        pubKeyCredParams: [
            {alg: -7, type:"public-key"},
            {alg: -257, type:"public-key"},
            {alg: -8, type:"public-key"}
        ],
        excludeCredentials: [],
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            requireResidentKey: true,
            userVerification: "preferred"
        }    
    };

    // ブラウザAPIの呼び出し
    const cred = await navigator.credentials.create({
        publicKey: options,
    });

    // APIレスポンスの準備
    const credential = {};
    credential.id = cred.id;
    credential.rawId = cred.id;
    credential.type = cred.type;
    
    if (cred.authenticatorAttachment) {
        credential.authenticatorAttachment = cred.authenticatorAttachment;
    }
    
    const clientDataJSON = await b64encode(cred.response.clientDataJSON);
    const attestationObject = await b64encode(cred.response.attestationObject);
    
    const transports = cred.response.getTransports ?
    cred.response.getTransports() : [];
    
    credential.response = {
        clientDataJSON,
        attestationObject,
        transports
    };

    // 一旦ここまで。
    // APIレスポンスをバックエンドに登録する処理を今後実装する    
    console.log(credential);
};
      