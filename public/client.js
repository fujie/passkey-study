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
// fetchする
async function _fetch(url, method, headers, body){
    const request = new Request(url);
    return await fetch(request, {
        method: method,
        credentials: 'same-origin',
        headers: headers,
        body: body? body : null
    });
}

// ログインする
async function loginWithPasskey(userId, userVerification) {
    // challengeを取得する（後で使うのでサーバサイドで生成する）
    const challenge = await _fetch(
        '/passkey/getChallenge',
        'GET',
        {
            'X-Requested-With': 'XMLHttpRequest'
        }
    );
    // バイナリを扱うためにサーバ・クライアント間ではbase64urlエンコードした値でやり取りする
    const encodedChallenge = await challenge.text();
    const decodedChallenge = await b64decode(encodedChallenge);

    // パスキーログインのためのパラメータを生成する
    const options = {
        challenge: decodedChallenge,
        allowCredentials: [],
        userVerification: userVerification
    }
      
    const cred = await navigator.credentials.get({
        publicKey: options,
        mediation: 'optional'
    });
    console.log(cred.toJSON());

    return cred.toJSON();
}

// 登録を開始する
async function registerCredential(userId, authenticatorAttachment, requireResidentKey, userVerification) {
    // challengeを取得する（後で使うのでサーバサイドで生成する）
    const challenge = await _fetch(
        '/passkey/getChallenge',
        'GET',
        {
            'X-Requested-With': 'XMLHttpRequest'
        }
    );
    // バイナリを扱うためにサーバ・クライアント間ではbase64urlエンコードした値でやり取りする
    const encodedChallenge = await challenge.text();
    const decodedChallenge = await b64decode(encodedChallenge);

    // ユーザIDを取得する
    // ユーザを登録する
    const user = {
        username: userId
    };
    const userIdresponse = await _fetch(
        '/passkey/user',
        'POST',
        {
            'Content-Type': 'application/json'
        },
        JSON.stringify(user)
    );
    const encodedUserId = await userIdresponse.text();
    const arrayBufferUserId = await b64decode(encodedUserId);

    // パスキー登録のためのパラメータを生成する
    const options = {
        challenge: decodedChallenge,
        rp: {
            name: "test site",
            id: window.location.hostname
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
            authenticatorAttachment: authenticatorAttachment,
            requireResidentKey: JSON.parse(requireResidentKey.toLowerCase()),
            userVerification: userVerification
        }    
    };
    // debug
    console.log(options);
    // ブラウザAPIの呼び出し
    const cred = await navigator.credentials.create({
        publicKey: options,
    });

    // 取得した認証器情報をサーバ側で保存
    const savedCredential = await _fetch(
        '/passkey/registerPasskey',
        'POST',
        {
            'Content-Type': 'application/json'
        },
        JSON.stringify(cred.toJSON())
    );

    console.log(savedCredential);

    return cred;
};
      