require('dotenv').config();

exports.registerPasskey = async function(passkey) {
    const passkeyJSON = JSON.parse(passkey);

    const headers = new Headers({
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        "X-Collection-Id": process.env.JSONBIN_PASSKEYCOLLECTION_ID,
        "X-Bin-Name": passkeyJSON.credentialId,
        "Content-Type": "application/json"
    });
    const binUrl = new URL(`${process.env.JSONBIN_BASEURL}/b`);
    const binResponse = await fetch(binUrl, {
        method: 'POST',
        headers: headers,
        body: passkey
    });
    return await binResponse.json();
}
// credentialIdをキーにPublicKeyとCounterを取得する
// userHandleが一致していることを検証する
exports.getPublicKey = async function(credentialId, userHandle) {
    // JSONBin用のヘッダ
    const headers = new Headers({
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        "Content-Type": "application/json"
    });
    // JSONBinのユーザCollectionからユーザbinのidを取得する
    const collectionUrl = new URL(`${process.env.JSONBIN_BASEURL}/c/${process.env.JSONBIN_PASSKEYCOLLECTION_ID}/bins`);
    const collectionResponse = await fetch(collectionUrl, {
        headers: headers
    });
    const passKeyCollection = await collectionResponse.json();
    const passKeyBin = passKeyCollection.find(i => i.snippetMeta.name === credentialId);
    if(typeof passKeyBin === "undefined"){
        console.log("passKey not found");
        return {
            result: false,
            error: "passKey not found"
        }
    }else{
        //　当該パスキーのBin idからBinの中身を読み出す
        const passKeyBinUrl = new URL(`${process.env.JSONBIN_BASEURL}/b/${passKeyBin.record}`);
        const passKeyBinResponse = await fetch(passKeyBinUrl, {
            headers: headers
        });
        const passKeyJson = await passKeyBinResponse.json();
        console.log(passKeyJson);
        // ユーザIDが正しいか検証
        console.log("userhandle to be compared: " + userHandle);
        console.log("expected userhandle : " + passKeyJson.record.userId);
        if(userHandle !== passKeyJson.record.userId) {
            // ユーザ名が異なる
            return {
                result: false,
                error: "different user handle"
            }
        } else {
            // ユーザ名一致
            return {
                result: true,
                username: passKeyJson.record.username,
                publicKey: passKeyJson.record.publicKey,
                signCount: passKeyJson.record.signCount
            }
        }
    }
}