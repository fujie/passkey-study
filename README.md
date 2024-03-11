# 実装してPasskeyを学ぶ

## 前提事項
- jsonbinにアカウントを持っていること
- passkeyを登録するためのcollectionをあらかじめ作成すること
- 必要な情報を.envに記載する
    - JSONBIN_MASTER_KEY={your master key}
    - JSONBIN_PASSKEYCOLLECTION_ID={your collection id}
- ngrokを利用してhttpsで公開すること

## 起動方法
- npm install
- node index.js
- ngrok http 3000

## パスキー登録
- https://{ngrokのurl}/passkey/register

## ログイン
- https://{ngrokのurl}/passkey/login

## 注意書き
- csrf対策などやるべきことはやっていません
- ユーザや登録済み認証器の管理などの機能はありません
- あくまで勉強用です
