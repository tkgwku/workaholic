//workaholic_util.jsの後に読み込まれる。

Worktime = function(start, finish){
    if(!(this instanceof Worktime)) {
        return new Worktime(start, finish);
    }
    this.start = start;
    this.finish = finish;
}

var p = Worktime.prototype;

p.toString = function(){
    return (this.start.getTime()/100000) + '-' + (this.finish.getTime()/100000);
}

//worktimeを読みやすい文字列にして返す。
//timeFormatが'{h}:{m}'、joinFormatが'{s} - {f}'だと
//'13:05 - 16:55'のようになる。
//hourは0詰めしないか選べる。hはしない。Hはする。
p.toHumanFriendlyString = function(timeFormat, joinFormat){
    if (timeFormat == undefined || timeFormat == null) timeFormat = '{h}:{m}';
    if (joinFormat == undefined || joinFormat == null) joinFormat = '{s} - {f}';
    var s = timeFormat
            .replace(/\{h\}/g, this.start.getHours())
            .replace(/\{H\}/g, parseString(this.start.getHours()))
            .replace(/\{m\}/gi, parseString(this.start.getMinutes()));
    var f = timeFormat
            .replace(/\{h\}/g, this.finish.getHours())
            .replace(/\{H\}/g, parseString(this.finish.getHours()))
            .replace(/\{m\}/g, parseString(this.finish.getMinutes()));
    return joinFormat
            .replace(/\{s\}/g, s)
            .replace(/\{f\}/g, f);
}

//略称
p.thfs = function(timeFormat, joinFormat){return this.toHumanFriendlyString(timeFormat, joinFormat)}

//もう一つのWorktimeオブジェと全く同じ時間設定
p.equals = function(other){
    var t = this.toString();
    var o = other.toString();
    return t == o;
}

//もう一つのWorktimeオブジェと同じ日
p.equalDay = function(other){
    var t = this.getDayKey();
    var o = other.getDayKey();
    return t == o;
}

p.getDayKey = function(){
    return this.getDateString()
}

p.equalMonth = function(other){
    var t = this.getMonthKey();
    var o = other.getMonthKey();
    return t == o;
}

p.getMonthKey = function(){
    return this.getDateString('{Y}/{mo}');
}

p.compatibleWith = function(other){
    var os = other.start.getTime();
    var ofi = other.finish.getTime();
    var ts = this.start.getTime();
    var tf = this.finish.getTime();
    if (os == tf){
        return new Worktime(this.start, other.finish);
    } else if (ofi == ts){
        return new Worktime(other.start, this.finish);
    } else if (os < ts){
        return ofi < ts;
    } else if (ts < os){
        return tf < os;
    } else if (os == ts || ofi == tf){
        return false;
    }
 }

//{dy}は曜日に変換される
//英語にしたい場合{dye}を使う
//その他は下の2017/8/1の例で確認
//Y:  2017
//y:  17
//MO: 08
//mo: 8
//D:  01
//d:  1
//half: 前半
p.getDateString = function(format, extended){
    var days = ["日","月","火","水","木","金","土"];
    var endays = ["sun","mon","tue","wed","thu","fri","sat"];
    if (format == undefined) format = '{Y}/{mo}/{d}';
    if (extended){
        return format
            .replace(/\{y\}/g, this.start.getFullYear()-2000)
            .replace(/\{Y\}/g, this.start.getFullYear())
            .replace(/\{mo\}/g, this.start.getMonth() + 1)
            .replace(/\{MO\}/g, parseString(this.start.getMonth() + 1))
            .replace(/\{d\}/g, this.start.getDate())
            .replace(/\{D\}/g, parseString(this.start.getDate()))
            .replace(/\{dy\}/g, days[this.start.getDay()])
            .replace(/\{dye\}/g, endays[this.start.getDay()])
            .replace(/\{half\}/g, this.start.getDate() <= 15 ? "前半": "後半");
    } else {
        return format
            .replace(/\{Y\}/gi, this.start.getFullYear())
            .replace(/\{mo\}/g, this.start.getMonth() + 1)
            .replace(/\{d\}/g, this.start.getDate())
            .replace(/\{dy\}/g, days[this.start.getDay()]);
    }
}

p.getRestMin = function() {
    var bondedMin = this.getBondedMin();
    var restMin = 0;
    if (isin(bondedMin, 270, 360)){ //4.5h - 6h
        restMin = 30;
    } else if (isin(bondedMin, 360, 420)){ //6h - 7h
        restMin = 45;
    } else if (isin(bondedMin, 420, 720)){ //7h - 12h
        restMin = 60;
    } else if (bondedMin >= 720){ //12h -
        restMin = 120;
    }
    return restMin;
}

p.getBondedMin = function(){
    return (this.finish.getTime() - this.start.getTime())/(1000*60);
}

p.getActualMin = function(){
    return this.getBondedMin()-this.getRestMin();
}

p.getHalfMonthKey = function(){
    var halfIdentifier = this.start.getDate() <= 15 ? '0' : '1';
    return this.getMonthKey() + '/' + halfIdentifier;
}

//22時から翌6時まで
p.getMidnightMin = function(){
    var copy6 = new Date(this.start.getTime());
    copy6.setHours(6);
    var copy22 = new Date(this.start.getTime());
    copy22.setHours(22);
    if (copy22.getTime() <= this.start.getTime()){
        //22 <= start
        copy6.setHours(30);
        if (this.finish.getTime() <= copy6.getTime()){
            //22 <= start < finish <= 6
            return this.getBondedMin()
        } else {
            //22 <= start < 6 < finish
            return (copy6.getTime() - this.start.getTime())/(1000*60);
        }
    } else if (copy6.getTime() < this.start.getTime()){
        //6 < start < 22
        if (copy22.getTime() < this.finish.getTime()){
            //6 < start < 22 < finish
            return (this.finish.getTime() - copy22.getTime())/(1000*60);
        } else {
            //6 < start < finish <= 22
            return 0;
        }
    } else {
        //start <= 6
        if (copy6.getTime() < this.finish.getTime()){
            //start <= 6 < finish
            return (copy6.getTime() - this.start.getTime())/(1000*60);
        } else {
            //start < finish <= 6
            return this.getBondedMin();
        }
    }
}

Worktime.compare = function(a, b){
    if (a.start.getTime() < b.start.getTime())
        return -1;
    if (a.start.getTime() > b.start.getTime())
        return 1;
    return 0;
}

Worktime.fromString = function(str){
    var _am = str.match(/(\d+)-(\d+)/);
    if (_am == null){console.error('invalid argument of fromString()')};
    return new Worktime(new Date(100000*parseInt(_am[1])), new Date(100000*parseInt(_am[2])));
}

Worktime.fromDate = function(s_date, f_date){
    return new Worktime(s_date, f_date);
}
