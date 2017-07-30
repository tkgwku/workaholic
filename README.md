# シフトから実労働時間を計算するHTML

## instruction
1. 好きなところにclone.
2. ウェブブラウザでindex.htmlを開く.
3. 開きやすいようにブックマークする.

or

1. visit [demo page](https://tkgwku.github.io/workaholic/)

### 使える形式
(例)
```
8/7(金)[確定]
10:30-18:45
------
8/8(土)
8:45-16:15
どこどこ

8/13(金)
12:00-18:00
どこどこー
19:00-22:30
どこどこー
```
日付や時間が同じ行に2つ入っていなくて、基本的な表式が同じなら使用可。(とある勤務先のために作ったので汎用性は視野外)

### 特徴
 - ローカルストレージにデータを保持。 iCloud等と併用してjsonによる物理的データ管理も可能。
 - モバイル使用可。 (Google Chrome for Windows, Google Chrome for iPhone, firefox for MacOSで動作確認、他は未確認。)
 - SafariやIEでは動作が変わっていたり、著しく古いブラウザでは使えない可能性もある。