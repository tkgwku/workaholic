# シフトから実労働時間を計算するHTML

### instruction
1. 好きなところにclone.
2. ウェブブラウザでindex.htmlを開く.
3. 開きやすいようにブックマークする.

or

1. visit (demo page)[http://jar.oiran.org/temp] 

### 使える形式
(例)
```
8/7(金)
10:30-18:45

8/8(土)
8:45-16:15
```
まわりがごっちゃっとしてたり、8/7(金)-8/8(土)みたいな表式があってもちゃんと処理されます。

### 特徴
 - デバイスやブラウザごとに異なるデータ保持. (phpわからんねんな...) 一応iCloud上と併用しやすいようjsonによる管理もできるようにした.
 - モバイル使用可. (Google Chrome for Windows, Google Chrome for iPhone, firefox for MacOSで動作確認、他は未確認.)
 - SafariやIE、古いfirefoxやChromeでは一部機能が使えない可能性がある.