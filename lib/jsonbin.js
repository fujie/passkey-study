require('dotenv').config();

exports.registerPasskey = async function(passkey) {
    const passkeyJSON = JSON.parse(passkey);

    const headers = new Headers({
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        "X-Collection-Id": process.env.JSONBIN_PASSKEYCOLLECTION_ID,
        "X-Bin-Name": passkeyJSON.userId,
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