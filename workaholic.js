// wokrtimelib.js、workaholic_util.jsの後に読み込まれる。

//勤務時間(Worktimeクラスのインスタンス)の配列。
//今までと違いそれぞれのWorktimeオブジェクトに'年月日時分'の情報が記録されるため、構造は至ってシンプルな配列になっている。
var WORKTIME_ARRAY = new Array();
var PREVIOUS_WORKTIME_ARRAY = new Array();

const OLD_STORAGE_KEY = 'data';
const STORAGE_KEY = 'calc_data';

//UNDOできるよう、previousに残しておく
function replaceWtArray(newWtArray, dontPushToPrevious) {
	if (!dontPushToPrevious){
		PREVIOUS_WORKTIME_ARRAY = $.extend(true, [], WORKTIME_ARRAY);//複製
	}
	WORKTIME_ARRAY = $.extend(true, [], newWtArray);
}

//redoも同じ関数。2個前の状態に戻りたい場合もあるかもしれんけど、残念ながら戻れません。
function undo() {
	replaceWtArray(PREVIOUS_WORKTIME_ARRAY);
	message('UNDOしました。 <span class="undo" onclick="undo()">[REDO]</span>', 'success');
	refresh();
}

//ok
//時間(HH:MM-HH:MM)のselectにoptionを追加。この1回のみ実行される。data-opt=hour/minじゃないとなにもしない。
//data-defvalを指定すると初期値を決められる。
function makeTimeOptions() {
	var mins = [0,15,30,45];

	$('select').each(function(index) {
		//optionに来るべきデータの種類。hourかminか、未指定の場合はundefined。undefinedなら何もしない。
		var attr = $(this).attr('data-opt');
		//デフォルト値。未指定なら何も指定されない。autoload属性がある場合も、それに加えて指定できる。
		var defval = parseInt($(this).attr('data-defval'));
		if (attr == 'hour'){
			//hourを追加
			$(this).html('');
			//0時から30時(翌6時)
			for (var i = 0; i < 31; i++) {
				$('<option>', {
					text: i < 24 ? parseString(i) : '翌' + parseString(i-24),
					'value': i,
					'selected': defval == i
				}).appendTo(this);
			}
		} else if (attr == 'min'){
			//minを追加
			$(this).html('');
			for (var i = 0; i < mins.length; i++) {
				var min = mins[i];
				$('<option>', {
					text: parseString(min),
					'value': min,
					'selected': defval == min
				}).appendTo(this);
			}
		} else if (attr == 'month'){
			//monthを追加
			$(this).html('');
			//1から12
			for (var i = 1; i < 13; i++) {
				$('<option>', {
					text: i+'月',
					'value': i
				}).appendTo(this);
			}
		} else if (attr == 'year'){
			//yearを追加
			$(this).html('');
			//先一昨年から来年まで
			for (var i = -3; i <= 1; i++) {
				var y = today.getFullYear()+i;
				$('<option>', {
					text: y+'年のシフトです。',
					'value': y,
					'selected': i==0
				}).appendTo(this);
			}
		}
	});
}

var today = new Date();

function interpreteTA(){
	var val = $('#shiftBox').val();
    var lines = val.split('\n');

	var wtArray = new Array();

    var y = parseInt($('#yearSel').val());
    var mo = null;
    var d = null;

    var halfMonthKey = null;

    var interterm = $('#inter_term_checkbox').prop('checked');

    ///////////lineごとの処理///////////
   	for (var i = 0; i < lines.length; i++) {
   		var line = lines[i];
        var dayMatch = line.match(/\d+\s*\/\s*\d+(?=\s*\([月火水木金土日]\))/g);
        // Array<String> matches
        // ["8/14"] or null

        if (dayMatch != null && dayMatch.length == 1){//2つ以上マッチしたら無視
		    var _as = dayMatch[0].split('/'); //array of string['8', '14']
		    if (interterm && parseInt(_as[0]) < mo || (parseInt(_as[0]) == mo && parseInt(_as[1]) < d)){
		    	//年が明けた。
		    }
		    mo = parseInt(_as[0]);//8
		    d = parseInt(_as[1]);//14
		    //y = today.getFullYear();
		    // 年明け前に正月のシフト考えるような年明けを挟むときは、来年、それ以外は今年を使う
		    // このHTMLを開いている月が12月で、textareaからのデータの月が1月。
		    //if (today.getMonth() == 11 && mo == 1){
		    // 	 y ++;
		    //}
        }

        timeMatch = line.match(/(\d+)\s*:\s*(\d+)\s*[-]\s*(\d+)\s*:\s*(\d+)/);
        // Array<String> matches
        // ["11:30-12:30", "11", "30", "12", "30"]

        if (timeMatch != null){
        	//日付が前に出てなかった
        	if (y == null) continue;
            //この行が11:30-20:15とか書いてある行
            var sh = parseInt(timeMatch[1]);//11
            var sm = parseInt(timeMatch[2]);//30
            var fh = parseInt(timeMatch[3]);//12
            var fm = parseInt(timeMatch[4]);//30
            //日をまたいだら24足しとく
            if (fh < sh || (fh === sh && fm < sm)){
                fh += 24;
            }
            var s_date = new Date(y, mo-1, d, sh, sm);
            var f_date = new Date(y, mo-1, d, fh, fm);

            var wt = new Worktime(s_date, f_date);
            if (!interterm){
            	console.log(interterm)
		        if (halfMonthKey == null) {
		            halfMonthKey = wt.getHalfMonthKey();
		        } else if (wt.getHalfMonthKey() != halfMonthKey){
		            return new Array();
		        }
            }
            wtArray.push(wt);
        }
    }
	$('#shiftBox').val('');
    return wtArray;
}

function translate(){
	var l = getLS(OLD_STORAGE_KEY);
	var n = getLS(STORAGE_KEY);
	if (l != null && n == null){
		var wtsArray = new Array();
		var obj = JSON.parse(l);
		for (var half_key in obj){
			var half_val = obj[half_key];
			for (var day_key in half_val){
				if (day_key === "modified") continue;
				var _as = day_key.split('/');
				if (_as.length != 3) {
					if (window.confirm('古いバージョンからのデータの引き継ぎに失敗しました。\n\n以前のデータを削除しますか?')){
						removeLS(OLD_STORAGE_KEY);
					};
				}
				var y = parseInt(_as[0]);
				var mo = parseInt(_as[1]);
				var d = parseInt(_as[2]);
				var worktime_array = half_val[day_key];
				for (var i = 0; i < worktime_array.length; i++) {
					var wtobj = worktime_array[i];
					var s_date = new Date(y, mo-1, d, wtobj.start.hour, wtobj.start.min);
					var f_date = new Date(y, mo-1, d, wtobj.finish.hour, wtobj.finish.min);
					var wt = new Worktime(s_date, f_date);
					wtsArray.push(wt.toString());
				}
			}
		}
		//removeLS(OLD_STORAGE_KEY);
		setLS(STORAGE_KEY, JSON.stringify(wtsArray, null, '  '));
		message('古いバージョンからデータを引き継ぎました。ご愛用ありがとうございます。', 'success');
	}
}

//ok
function loadWtArrayFromLS(){
	var l = getLS(STORAGE_KEY);
	if (l == null) {
		return new Array();
	} else {
		var wtArray = new Array();
		stringArray = JSON.parse(l);//['214124124-12412124','124241241-1234124']といった形になっている
		for (var i = 0; i < stringArray.length; i++) {
			var wts = stringArray[i];
			var wt = Worktime.fromString(wts);
			wtArray.push(wt);
			//console.log(wt.getDateString('{y}/{mo}/{d} {{dy}}') + ' ::: ' +  wt.thfs());
		}
		replaceWtArray(wtArray);
	}
}

//複数のWorktimeをwtArrayにpush
function addAllWithTA(worktimes) {
	if ($('#inter_term_checkbox').prop('checked')){
		obj = splitByHalfMonth(worktimes);
  for (var hmk in obj){
		addHalfMonthWt(obj[hmk]);
		}
	} else {
		addHalfMonthWt(worktimes);
	}
}

function splitByHalfMonth(worktimes){
	if (typeof worktimes == 'undefined'){
		var worktimes = WORKTIME_ARRAY;
	}
	var obj = {};
	for (var i = 0; i < worktimes.length; i++) {
		var wt = worktimes[i];
		var half_month_key = wt.getHalfMonthKey();
		if (!obj.hasOwnProperty(half_month_key)){
			obj[half_month_key] = [];
		}
		obj[half_month_key].push(wt);
	}
	return obj;
}

function addHalfMonthWt(worktimes){
	if ($('#override_checkbox').prop('checked')){
		worktimes = sort(worktimes);
		var arr = new Array();
		for (var i = 0; i < worktimes.length; i++) {
			//sortしたのでコレ以外ありえない
			if (i < worktimes.length-1 && worktimes[i].finish.getTime() == worktimes[i+1].start.getTime()){
				//マージ
				arr.push(new Worktime(worktimes[i].start, worktimes[i+1].finish));
				i++;
			} else {
				arr.push(worktimes[i]);
			}
		}
		var half_month_key = worktimes[0].getHalfMonthKey();
		for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
			var WORKTIME = WORKTIME_ARRAY[i];
			if (WORKTIME.getHalfMonthKey() != half_month_key){
				arr.push(WORKTIME);
			}
		}
		replaceWtArray(arr);
	} else {
		var copyWtArray = $.extend(true, [], WORKTIME_ARRAY);
		for (var j = 0; j < worktimes.length; j++) {
			var worktime = worktimes[j];
			//追加するworktimeごとに、追加してもいいか調べるfor
			var arr = new Array();
			var shouldPush = true;
			for (var i = 0; i < copyWtArray.length; i++) {
				var wt = copyWtArray[i];
				//全く同じ勤務時間
				if (worktime.equals(wt)){
			    	message(worktime.getDateString()+'の勤務時間'+worktime.thfs(null, '{s}-{f}')+'はすでに存在する項目なので処理をスキップしました。');
			    	//pushしない.
				} else {
					var compat = worktime.compatibleWith(wt);
					if (compat instanceof Worktime){
						shouldPush = false;
						arr.push(compat);
						//連続する時間だったので、マージした勤務時間だけを追加して、２つは追加しない。
					} else if (compat){
						arr.push(wt);
						//競合しなかった
					} else {
						//競合した
						//上書きするか処理をやめるか尋ねる。
			        	if (window.confirm(worktime.getDateString()+'の'+worktime.thfs(null, '{s}-{f}')+'は\n'+wt.getDateString()+'の'+wt.thfs(null, '{s}-{f}')+'と競合しています。\n元のデータを上書きしますか?\n\n「いいえ」の場合はボタンを押す前の状態まで戻ります。')){
			        		//競合している元のデータを削除し、新しいデータを追加。
			        		message(wt.getDateString()+'の'+wt.thfs(null, '{s}-{f}')+'は削除されました。');
			        		//元のデータはいらないのでpushしない。
			        	} else {
			        		//処理をやめて、元の状態のまま。
			        		return;
			        	}
					}
				}
			}
			//新しいデータをpush
			if (shouldPush) arr.push(worktime);
			//新しいデータに書き換え。forで回してる最中に構造を変化されるのはExceptionを吐き出すはずなので、わざわざarrを使っている。
			copyWtArray = arr;
		}
		replaceWtArray(copyWtArray);
	}
}

function addOneWt(worktime, dontPushToPrevious) {
	//追加してもいいか調べるfor
	var arr = new Array();
	var shouldPush = true;
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		//全く同じ勤務時間
		if (worktime.equals(WORKTIME)){
			message(worktime.getDateString()+'の勤務時間'+worktime.thfs(null, '{s}-{f}')+'はすでに存在します。');
			//pushしない.
			return false;
		} else {
			var compat = worktime.compatibleWith(WORKTIME);
			if (compat instanceof Worktime){
				arr.push(compat);
				shouldPush = false;
				//マージ
			} else if (compat){
				arr.push(WORKTIME);
				//競合しなかった
			} else {
				//競合した
				//上書きするか処理をやめるか尋ねる。
			    if (window.confirm(worktime.getDateString()+'の'+worktime.thfs(null, '{s}-{f}')+'は\n'+WORKTIME.getDateString()+'の'+WORKTIME.thfs(null, '{s}-{f}')+'と競合しています。\n元のデータを上書きしますか?\n\n「いいえ」の場合はボタンを押す前の状態まで戻ります。')){
			        //競合している元のデータを削除し、新しいデータを追加。
			        message(WORKTIME.getDateString()+'の'+WORKTIME.thfs(null, '{s}-{f}')+'は削除されました。');
			        //元のデータはいらないのでpushしない。
			        return false;
			    } else {
			    	message('追加をキャンセルしました。');
			    	return false;
			    }
			}
		}
	}
	//新しいデータをpush
	if (shouldPush) arr.push(worktime);
	replaceWtArray(arr, dontPushToPrevious);
	return true;
}

//WORKTIME_ARRAYをLocalStorageに保存
function saveWtArray() {
	var stringArray = new Array();
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		stringArray.push(WORKTIME.toString());
	}
	setLS(STORAGE_KEY, JSON.stringify(stringArray));
}

//ok
//年月からその月の日数を返す。
// 2017,2 -> 28
function monthday(year, month){
    var lastday = new Array('', 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
    if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0){
        lastday[2] = 29;
    }
    return lastday[month];
}

//WORKTIME_ARRAYを
//{
//	'2017/8': [wt1, wt2, ...],
//	'2017/9': [wt1, wt2, ...]
//}
//と言った風に変形
function splitByMonth() {
	var obj = {};
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		var key = WORKTIME.getMonthKey();
		if (!obj.hasOwnProperty(key)){
			obj[key] = [];
		}
		obj[key].push(WORKTIME);
	}
	return obj;
}

//WORKTIME_ARRAYを
//{
//	'2017/8/1': [wt1, wt2, ...],
//	'2017/8/2': [wt1]
//}
//と言った風に変形
function splitByDay() {
	var obj = {};
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		var key = WORKTIME.getDayKey();
		if (!obj.hasOwnProperty(key)){
			obj[key] = [];
		}
		obj[key].push(WORKTIME);
	}
	return obj;
}

//WORKTIME_ARRAY、keyMonth('2017/8'など...)から
//{
//	'2017/8/1': [wt1, wt2],
//	'2017/8/2': [wt1]
//}
//と言ったデータをgetする
function extractMonthData(keyMonth) {
	var obj = {};
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		if (WORKTIME.getMonthKey() == keyMonth){
			var key = WORKTIME.getDayKey();
			if (!obj.hasOwnProperty(key)){
				obj[key] = [];
			}
			obj[key].push(WORKTIME);
		}
	}
	return obj;
}

function extractDayData(daykey) {
	var arr = new Array();
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		if (WORKTIME.getDayKey() == daykey){
			arr.push(WORKTIME);
		}
	}
	return arr;
}


//日付順に並び替え
//引数が未指定ならWORKTIME_ARRAYをsortするだけ
function sort(wtArray) {
	if (typeof wtArray == 'undefined'){
		WORKTIME_ARRAY.sort(Worktime.compare);
	} else {
		wtArray.sort(Worktime.compare);
		return wtArray;
	}
}


//月ごとの処理になるので、まず月に区分けしてからforを回す
//1.テーブルにリストを追加
//2.次の勤務時間を表示
function refreshTable(oninit) {
	if (WORKTIME_ARRAY.length == 0) {
		$('#shiftTable').fadeOut();
		return;
	}
	//<tr><td class="remove">&times;</td><td onclick="$('#listWTModal').modal()" class="listup" data-key="2017/8">2017年8月</td><td>10.00h</td><td>4日 <small>/ 30日</small></td><td>4回</td></tr>
	// objは{"2017/8": [wt1, wt2, ...]}といった構造になる。"2017/8"はgetKeyDay()により生成。
	var obj = splitByMonth();
	$('#shiftList').html('');
	for (var _key in obj){
		var _awt = obj[_key];//array of worktime: その月のworktime全て。おそらくsortされた後なので古い順
		var actual = 0;//単位はmin: 実働時間の合計
		var days = [];//働いた日付の配列。日数を得るのに使う
		var _s = _key.split('/');//["2017", "8"];
		for (var i = 0; i < _awt.length; i++) {
			var _wt = _awt[i];
			actual += _wt.getActualMin();
			//もし新しい日付なら追加 -> 日数がわかる
			var daykey = _wt.getDayKey();
			if (days.indexOf(daykey) == -1){
				days.push(daykey);
			}
		}

		//新しいtable row。ココにデータ(mothKey)を紐付けしておくよ。
		var tr = $('<tr>', {
			'data-key': _key,
		});
		//新しいtd。バツボタンだよ
		$('<td>', {
			html: '&times;',
			'class': 'remove',
			click: function(e){
				var monthkey = $(this).parent().attr('data-key');
				var str = monthkey.split('/').join('年') + '月';
				if ($('#delete_checkbox').prop('checked') || window.confirm(str + 'のデータを削除します。')){
					var _a = new Array();
					for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
						var WORKTIME = WORKTIME_ARRAY[i];
						if (WORKTIME.getMonthKey() != monthkey){
							_a.push(WORKTIME);
						}
					}
					replaceWtArray(_a);
					refresh();
  					message(str+'のデータをクリアしました。'+UNDO_HTML_TEMPLATE, 'success');
				}
			}
		}).appendTo(tr);
		//新しいtd。年と月を表示するよ
		$('<td>', {
			text: _s[0] + '年' + _s[1] + '月',
			'class': 'listup',
			click: function (e) {
				setListModalContent($(this).parent().attr('data-key'));
				$('#listWTModal').modal();
			}
		}).appendTo(tr);
		//新しいtd。計実働時間を表示するよ
		$('<td>', {
			text: (actual/60).toFixed(2)
		}).appendTo(tr);
		//新しいtd。働いた日数を表示するよ
		$('<td>', {
			html: days.length + '日 <small>/ ' +  monthday(parseInt(_s[0]), parseInt(_s[1])) + '日</small>'
		}).appendTo(tr);
		//新しいtd。働いた階数を表示するよ
		$('<td>', {
			text: _awt.length + '回'
		}).appendTo(tr);
		//trをtdもろともtbodyに突っ込むよ
		tr.appendTo('#shiftList');
	}

	if (WORKTIME_ARRAY.length > 0) {
		if (oninit){
			$('#shiftTable').css('display', 'table');
		} else {
			$('#shiftTable').fadeIn();
		}
	}
}

function refresh(onInit) {
	sort();
	saveWtArray();
	refreshTable(onInit);
	refreshNextWork();
	refreshStyle();
}

//月勤務時間一覧(=listWTModal)の初期化をするよ。
//テーブルをクリックすると表示するよ
//data-~~でデータをtd要素と紐付けしてるよ。
function setListModalContent(monthkey){
      	//<p class="text-secondary" id="wtListModalTitle">2017年9月の勤務時間リストです。</p>
      	//<div id="wtlist">
      		//<div class="listcont" onclick="$('#editWTModal').modal()">
      			//<div><strong>2017/08/09 (木)</strong></div>
      			//<div>勤務時間: 10:30-18:00</div>
      			//<div>実働時間: 10.5h</div>
      		//</div>
    //紐付けデータから「月」を取得。
    //直接文字列を引数にすると、引数が変数なら後から変数に変更があった後、引数の値も変わる。
    //
	//	var a = 'aa'
	//	$('<div>',{
	// 		click: function (argument) {
	//      	console.log(a);
	//    	}
	//	}).appendTo('body')
	//	a = 'bb'
	//
	// --> divをクリックすると'bb'と出力される
	var _s = monthkey.split('/');
	var obj = extractMonthData(monthkey);
	$('#wtlist').html('');
	$('#wtListModalTitle').text(_s[0]+'年'+_s[1]+'月の勤務時間リストです。');
	for (var keyday in obj){
		var wta = obj[keyday];
		var actual = 0;//min
		var wtstring = [];
		for (var i = 0; i < wta.length; i++) {
			var wt = wta[i];
			actual += wt.getActualMin();
			wtstring.push(wt.thfs(null, '{s}-{f}'));
		}
		//ラッパー
		var div = $('<div>', {
			'class': 'listcont',
			'data-key': wta[0].getDayKey(),
			click: function(e) {
				$('#listWTModal').modal('hide');
				setEditModalContent($(this).attr('data-key'));
				$('#editWTModal').modal('show');
			}
		});
		//その日の日付
		$('<div>', {
			html: '<strong>'+wta[0].getDateString('{Y}/{mo}/{d} ({dy})', true)+'</strong>'
		}).appendTo(div);
		//その日の勤務時間
		$('<div>', {
			text: '勤務時間: '+(actual/60).toFixed(2)+'h'
		}).appendTo(div);
		//その日の実働時間
		$('<div>', {
			text: '実働時間: '+wtstring.join(', ')
		}).appendTo(div);
		//もろとも突っ込め
		div.appendTo('#wtlist');
	}
}

const FLATPICKR_OPTION = {
	dateFormat: "Y/m/d",
	locale: {
	    "firstDayOfWeek": 1
	}
}
const FLATPICKR_OPTION_FROMTODAY = {
	dateFormat: "Y/m/d",
	minDate: 'today',
	locale: {
	    "firstDayOfWeek": 1
	},
	onChange: function() {
		$(this.element).removeClass('fpickr-invalid');
		$(this.element).addClass('fpickr-valid');
	}
}

//編集modalの内容を初期化
function setEditModalContent(daykey) {
	$('#wt_repetition').html('');
	$('#editModal_date').val(daykey);
	//$('#editModal_date').flatpickr(FLATPICKR_OPTION).setDate(daykey, true, 'Y/m/d');
	var wt_array = extractDayData(daykey);
	/*
        <div id="editModal_repeat">
          <div role="wt">
            <div class="input-group" style="margin-bottom: .5em" role="start">
              <div class="input-group-addon">開始時刻</div>
              <select data-opt="hour" class="form-control" data-defval="12"></select>
              <div class="input-group-addon">時</div>
              <select data-opt="min" class="form-control" data-defval="0"></select>
              <div class="input-group-addon">分</div>
            </div>
            <div class="input-group" role="finish">
              <div class="input-group-addon">開始時刻</div>
              <select data-opt="hour" class="form-control" data-defval="12"></select>
              <div class="input-group-addon">時</div>
              <select data-opt="min" class="form-control" data-defval="0"></select>
              <div class="input-group-addon">分</div>
            </div>
          </div>
        </div>
     */
     //1 or 2 worktimes
	for (var i = 0; i < wt_array.length; i++) {
		var wt = wt_array[i];
		var elem;
		if (i==0){
			elem = $('#editModal_repeat select');
		} else {
			var newdiv = $('#editModal_repeat').children().clone();
			newdiv.css('margin-top', '1.5em');
			newdiv.appendTo('#wt_repetition');
			elem = newdiv.find('select');
		}
		elem.each(function(){
			var dataopt = $(this).attr('data-opt');
			var role = $(this).parent().attr('role');
			if (role == 'start'){
				if (dataopt == 'hour'){
					$(this).prop('selectedIndex', wt.start.getHours());
				} else if (dataopt == 'min'){
					$(this).prop('selectedIndex', wt.start.getMinutes()/15);
				}
			} else if (role == 'finish'){
				if (dataopt == 'hour'){
					$(this).prop('selectedIndex', wt.finish.getHours());
				} else if (dataopt == 'min'){
					$(this).prop('selectedIndex', wt.finish.getMinutes()/15);
				}
			}
		});
	}
}

function checkTransitModalValidity(){
	var ready = checkNumberInput($('#yttime'))
	ready = checkTextInput($("#ytfrom")) && ready;
	ready = checkTextInput($("#ytto")) && ready;
    $('#editModalSubmit').attr('disabled', !ready);
}


function makeYahooTransitURL(worktime){
	//めんどくさいので一旦LSからリセットしてから、データをform本体から直接get
	setRouteModalFromLS();
    var timeinput = parseInt($("#yttime").val());
    if (isNaN(timeinput))　return '';
    var frominput = encodeURI($("#ytfrom").val());
    if (frominput === '') return '';
    var toinput = encodeURI($("#ytto").val());
    if (toinput === '') return '';
    var date = new Date(worktime.start.getTime() - timeinput * 60 * 1000);
    var u = new Array();
    u.push('https://transit.yahoo.co.jp/search/result');
    u.push('?flatlon=');
    u.push('&from=' + encodeURI($("#ytfrom").val()));
    u.push('&tlatlon=');
    u.push('&to=' + encodeURI($("#ytto").val()));
    var viainputs = $("#ytvia").val().split(",")
    if (viainputs.length >= 1) u.push('&via=' + encodeURI(viainputs[0]));
    if (viainputs.length >= 2) u.push('&via=' + encodeURI(viainputs[1]));
    if (viainputs.length == 3) u.push('&via=' + encodeURI(viainputs[2]));
    u.push('&y=' + date.getFullYear());
    u.push('&m=' + parseString(date.getMonth() + 1));
    u.push('&d=' + parseString(date.getDate()));
    u.push('&hh=' + date.getHours());
    var minutes = date.getMinutes() + '';
    u.push('&m2=' + minutes.charAt(1));
    u.push('&m1=' + minutes.charAt(0));
    u.push('&type=4'); // 到着時刻設定
    u.push('&ticket=ic');
    if ($("#al_checkbox")	.prop('checked')) u.push('&al=1');
    if ($("#shin_checkbox")	.prop('checked')) u.push('&shin=1');
    if ($("#ex_checkbox")	.prop('checked')) u.push('&ex=1');
    if ($("#vhb_checkbox")	.prop('checked')) u.push('&hb=1');
    if ($("#lb_checkbox")	.prop('checked')) u.push('&lb=1');
    if ($("#sr_checkbox")	.prop('checked')) u.push('&sr=1');
    u.push('&s=' + $("#display_sel").val());//表示順序
    u.push('&expkind=1');
    u.push('&ws=' + $('#ws_sel').val()); //歩く速さ
    u.push('&kw=');
    return u.join('');
}

function setRouteModalFromLS() {
	loadTextboxData($('#routeModal input[type=number]'));
	loadTextboxData($('#routeModal input[type=text]'));
	loadCheckboxData($('#routeModal input[type=checkbox]'));
	loadSelectData($('#routeModal select'));
}

function checkAddWtModalValidity(){
	var ready = true;
    if ($('#addModal_date').val() == ''){
    	ready = false;
    } else {
		var sh = parseInt($('#addModal_sh').val());
		var sm = parseInt($('#addModal_sm').val());
		var fh = parseInt($('#addModal_fh').val());
		var fm = parseInt($('#addModal_fm').val());
		if (sh > fh){
			ready = false;
		} else if (sh == fh){
			ready = sm < fm;
		}
    }
    $('#addModal_submit').attr('disabled', !ready);
}

function checkTextInput(elem){
	if (elem.prop('disabled')){
		return true;
	} else {
		if (elem.val() == '')　{
	    	elem.addClass('is-invalid');
	    	return false;
	    } else {
	    	if (elem.hasClass('is-invalid')) elem.removeClass('is-invalid');
	    	return true;
	    }
	}
}

//input, select
function checkNumberInput(elem) {
	if (elem.prop('disabled')){
		return true;
	} else {
		if (isNaN(parseInt(elem.val())))　{
	    	elem.addClass('is-invalid');
	    	return false;
	    } else {
	    	if (elem.hasClass('is-invalid')) elem.removeClass('is-invalid');
	    	return true;
	    }
	}
}

function refreshNextWork() {
	var nearest_daykey = '';
	var nearest = new Array();
	var sec_nearest_daykey = '';
	var sec_nearest = new Array();
	//すでに早い順に並んでいることが前提
	//つまり、必ずsortの後に呼ばれる必要がある。
	for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
		var WORKTIME = WORKTIME_ARRAY[i];
		if (today.getTime() < WORKTIME.start.getTime()){
			var daykey = WORKTIME.getDateString('{mo}/{d} ({dy})', true);
			if (nearest_daykey == ''){
				nearest_daykey = daykey;
				nearest.push(WORKTIME);
			} else {
				if (nearest_daykey == daykey){
					nearest.push(WORKTIME);
				} else {
					if (sec_nearest_daykey == ''){
						sec_nearest_daykey = daykey;
						sec_nearest.push(WORKTIME);
					} else {
						if (sec_nearest_daykey == daykey){
							sec_nearest.push(WORKTIME);
						} else {
							break;
						}
					}
				}
			}
		}
	}
	if (nearest_daykey != ''){
		var wts = new Array();
		for (var i = 0; i < nearest.length; i++) {
			var wt = nearest[i];
			var url = makeYahooTransitURL(wt);
			if (url == ''){
				wts.push(wt.thfs('{h}:{m}', '{s}-{f}'));
			} else {
				wts.push('<a href="'+url+'" target="_blank">'+wt.thfs('{h}:{m}', '{s}-{f}')+'</a>');
			}
		}
		$('#nextWork').html(nearest_daykey + ' ' + wts.join(', '));
		$('#nextBox').fadeIn();
	} else {
		$('#nextBox').fadeOut();
	}

	if (sec_nearest_daykey != ''){
		var wts = new Array();
		for (var i = 0; i < sec_nearest.length; i++) {
			var wt = sec_nearest[i];
			var url = makeYahooTransitURL(wt);
			if (url == ''){
				wts.push(wt.thfs('{h}:{m}', '{s}-{f}'));
			} else {
				wts.push('<a href="'+url+'" target="_blank">'+wt.thfs('{h}:{m}', '{s}-{f}')+'</a>');
			}
		}
		$('#nextOfNextWork').html(sec_nearest_daykey + ' ' + wts.join(', '));
		$('#nextOfNextBox').fadeIn();
	} else {
		$('#nextOfNextBox').fadeOut();
	}
}

function removeWorktimes(daykey, dontPushToPrevious) {
	var newWt = new Array();
    for (var i = 0; i < WORKTIME_ARRAY.length; i++) {
     	var WORKTIME = WORKTIME_ARRAY[i];
     	if (WORKTIME.getDayKey() != daykey){
     		newWt.push(WORKTIME);
     	}
    }
    replaceWtArray(newWt, dontPushToPrevious);
}

//wrapperから一つのWorktimeをgetする。
function getWtFromSels(daykey, wrapper) {
	var sh, sm, fh, fm;
	wrapper.find('select').each(function(){
		var dataopt = $(this).attr('data-opt');
		var role = $(this).parent().attr('role');
		if (role == 'start'){
			if (dataopt == 'hour'){
				sh = parseInt($(this).val());
			} else if (dataopt == 'min'){
				sm = parseInt($(this).val());
			}
		} else if (role == 'finish'){
			if (dataopt == 'hour'){
				fh = parseInt($(this).val());
			} else if (dataopt == 'min'){
				fm = parseInt($(this).val());
			}
		}
	});
	if (!isNaN(sh) && !isNaN(sm) && !isNaN(fh) && !isNaN(fm)){
		var s_date = new Date(daykey);
		s_date.setHours(sh, sm);
		var f_date = new Date(daykey);
		f_date.setHours(fh, fm);
		return new Worktime(s_date, f_date);
	} else {
		return null;
	}
}

function checkSalarySettingValidity(){
	var emp = parseInt($("input[name=employmentPattern]:checked").val());
	var ready = checkNumberInput($('#hourWage'));
	if (emp == 0) {
	ready = checkButtonsInput($('#fee_provide_month input')) && ready;
	ready = checkNumberInput($('#six_month_fee')) && ready;
	}else if(emp == 1,2,3){
		ready = checkNumberInput($('#trans')) && ready;
		ready = checkNumberInput($('#one_month_fee')) && ready;
	}
	if (isNaN(emp)){
		$("input[name=employmentPattern]").addClass('is-invalid');
		ready = false;
	} else {
		$("input[name=employmentPattern]").removeClass('is-invalid');
	}
	$('#salary_submit').attr('disabled', !ready);
	$('#salaryLaunchButton').attr('disabled', !ready);
}

function launchSalaryModal(btnElem){
  if ($(btnElem).prop('disabled')) return;
	setCalcSalaryModalContent();
	$('#calcSalaryModal').modal();
}

/////////////////////


//給与概算設定modalを開いたときに呼び出される。
function setSalarySettingModalContent() {
	if (!$('#regular').prop('checked')) {
		$('#forRegular').css('display', 'none');
	}else{
		$('#forNonRegular').css('display', 'none');
	}
}

//給与概算ボタンを押したときに呼ばれる。
function setCalcSalaryModalContent(){
	$('#calcSalaryTbody').html('');
	//modalにtableを追加。
	/*
            <tr>
              <td>{Y}年{mo}月</td>
              <td class="monthData" onclick="toggleSalary(this)">
                <span style="text-decoration: underline;">差引支給額: 112,595円</span><br>
                <small>クリックすると詳細を表示。</small>
                <div style="display: none">ここに1ヶ月の詳細データ</div>
              </td>
            </tr>*/
  var obj = splitByMonth();//{月:[wt1, wt2...], 月2:[wt1, wt2...]...}
  var hourWage = parseInt($('#hourWage').val());//整数
	var fee_month_array = $('.fee_month:checked').map(function() {return parseInt($(this).val());}).get();
	var six_month_fee = parseInt($('#six_month_fee').val());//整数
	var one_month_fee = parseInt($('#one_month_fee').val());//整数
	var isHSStudent = $('#hs_student_checkbox').prop('checked');// true or false
	var trans = parseInt($('#trans').val());
	var emp = parseInt($("input[name=employmentPattern]:checked").val());

    //月ごとの処理
    for (var monthkey in obj){
    	//その月の勤務時間オブジェクトの配列
    	var wt_array = obj[monthkey];
    	//合計などの変数はココ
    	var wholeGivenYen = 0;
    	//var 支給額計[円] = 0
    	var wholeOmittedYen = 0;
    	//var 控除合計[円] = 0
    	var wholeMidnightBonus = 0;
    	//深夜手当合計
			var wholeMidnightHours = 0;
			//深夜時間合計
    	var wholeBaseSalary = 0;
    	//基本給合計
    	var wholeLongBonus = 0;
    	//時間外手当合計
			var wholeLongHours = 0;
			//時間外計
			var transPay = 0;
			//交通費
			var chgCostume = 0;
			//着替手当
    	var days = new Array();
    	//出勤日配列
    	//その月の、それぞれの勤務時間で処理
    	for (var i = 0; i < wt_array.length; i++) {
    		var wt = wt_array[i];
    		var daykey = wt.getDayKey();//'2017/9/10'みたいなString
    		if (days.indexOf(daykey) == -1) days.push(daykey);//違う日なら追加
    		var actualWorkingHour =  wt.getActualMin()/60;
    		//実働時間. (拘束時間-休憩時間)
    		var baseSalary = actualWorkingHour * hourWage;
				if (actualWorkingHour >= 8){
					baseSalary = 8 * hourWage;
				}
    		//基本給 = 実質労働時間(8時間以下の分) * 時給
    		var longBonus = actualWorkingHour > 8 ? (actualWorkingHour - 8) * hourWage * 1.25 : 0;
    		//時間外手当[円] = 実働時間[h] > 8 なら (実働時間[h] - 8) * 時給 * 1.25 、そうじゃないなら 0;
    		var midnightBonus = wt.getMidnightMin()/60 * hourWage * 0.25;
    		//深夜手当[円] = 22時から6時までの労働時間[h] * 時給 * 0.25;
    		wholeGivenYen += baseSalary + longBonus + midnightBonus;
    		//支給額計[円] += ____
    		wholeMidnightBonus += midnightBonus;
				wholeMidnightHours += wt.getMidnightMin()/60;
    		wholeBaseSalary += baseSalary;
    		wholeLongBonus += longBonus;
				wholeLongHours += actualWorkingHour > 8 ? (actualWorkingHour - 8) : 0;
    	}//勤務時間オブジェごとの処理はココまで

		var _s = monthkey.split('/');
		var full_year = parseInt(_s[0]);//2017
		var month = parseInt(_s[1]);//9

		if(isHSStudent == true){
			transPay = 0;
		}else if(emp == 0 && fee_month_array.indexOf(month) == -1){
			transPay = 0;
		}else if(emp == 0){
			transPay = six_month_fee;
		}else if(emp == 1 || 2 || 3){
			if(days.length < 17){
				transPay = trans * days.length;
			}else if(days.length >= 17){
				transPay = one_month_fee
			}
			if(transPay >= 30000){
				transPay = 30000;
			}
		}

		chgCostume = 250 * days.length;

 		//控除されるかされないかのArray。されるなら1,されないなら0。雇用保険、健保基本保険、健保特定保険、厚生年金保険、組合費の順番。
		var deductArray =
		[
			//レギュラー
			[1,1,1,1,1],
			//カジュラー
			[1,1,1,1,0],
			//カジュアル
			[0,0,0,0,0],
			//シーズナル
			[0,0,0,0,0]
			//シーズナルとカジュアル分ける意味なかった////////
		];

		//各控除額。雇用形態によって適用されないなら、0がかかるから0になるはず。。。小数点以下第1位を四捨五入。正確にはwholeGivenYen.50ならば切り捨てだがどう考えても誤差。支給額があまりに少ないと保険の対象となりませんが、それぐらいは稼いでください。
		var empIns = Math.round( wholeGivenYen * 0.003 * deductArray[emp][0] ); // 雇用保険料,料率は0.9%,うち0.3%を自己負担。
		var healthInsB = Math.round( wholeGivenYen * 0.032 * deductArray[emp][1] ); // 健保基本,料率は6.40%で自己負担はその半分。大阪府の協会けんぽ(平成29年4月から適用)を参照。
		var healthInsS = Math.round( wholeGivenYen * 0.01865 * deductArray[emp][2] ); // 健保特定,料率は3.73%で自己負担はその半分。以下同上。
		var pension = Math.round( wholeGivenYen * 0.0915 * deductArray[emp][3] ); // 厚生年金保険料率は18.30%で自己負担はその半分。
		var union = Math.round( 700 * deductArray[emp][4] ); //一律700円だよ

		var deduction = empIns + healthInsS + healthInsB + pension + union;
		var taxable = wholeGivenYen - deduction;

		var taxArray = [0,88000,89000,90000,91000,92000,93000,94000,95000,96000,99000];

		for(i=99000;i<=221000;i+=2000){
			taxArray.push(i);
		}
		for(j=221000;j<=302000;j+=3000){
			taxArray.push(j);
		}

		//所得税を求めましょう。40歳未満の扶養家族がいない人を想定しています。
		//財務省の告示する給与所得の源泉徴収月額表の扶養家族0人を参照。
		//（平成24年3月31日財務省告示第115号別表第一（平成28年３月31日財務省告示第105号改正））
		//実際は3,550,000円まで延々続いていますが、302,000円で止めてます。多分そんなに稼げない。

		//扶養控除申告書を提出済なら0,でなければ1
		if($('#main_work_checkbox').prop('checked')){
			mainwork = 0;
		}else{
			mainwork = 1;
		}

		var taxList =
		[
			[
				0,130,180,230,290,340,390,440,490,540,590,640,720,830,930,
				1030,1130,1240,1340,1440,1540,1640,1750,1850,1950,2050,2150,2260,2360,2460,
				2550,2610,2680,2740,2800,2860,2920,2980,3050,3120,3200,3270,3340,3410,3480,
				3550,3620,3700,3770,3840,3910,3980,4050,4120,4200,4270,4340,4410,4480,4550,
				4630,4700,4770,4840,4910,4980,5050,5130,5200,5270,5340,5410,5480,5560,5680,
				5780,5890,5990,6110,6210,6320,6420,6530,6640,6750,6850,6960,7070,7180,7280,
				7390,7490,7610,7710,7820,7920,8040,8140,8250,8420,8670
			],
			[
				0,3200,3200,3200,3200,3300,3300,3300,3400,3400,3500,3500,3600,3600,3700,
				3800,3800,3900,4000,4100,4100,4200,4300,4500,4800,5100,5400,5700,6000,6300,
				6600,6800,7100,7500,7800,8100,8400,8700,9000,9300,9600,9900,10200,10500,10800,
				11100,11400,11700,12000,12400,12700,13200,13900,14600,15300,16000,16700,17500,18100,18800,
				19500,20200,20900,21500,22200,22700,23300,23900,24400,25000,25500,26100,26800,27400,28400,
				29300,30300,31300,32400,33400,34400,35400,36400,37500,38500,39400,40400,41500,42500,43500,
				44500,45500,46600,47600,48600,49500,50500,51600,52300,52900,53500
			]
		];

		var tax;
		//最後の項よりも大きい額を稼いでいる
		if(taxable >= taxArray[taxArray.length -1]){
			tax = taxList[mainwork][taxArray.length -1];
		}else{
			for(i=taxArray.length-1;i>0;i--){
			    if(taxable >= taxArray[i-1] && taxable < taxArray[i]){
			      	tax = taxList[mainwork][i-1];
			      	break;
			    }
			}
		}
		if(mainwork == 1 && taxable < 88000 && taxable >= 50000){
			tax = taxable * 0.03063;
		}else if(mainwork == 1 && taxable < 50000){
			tax = 0;
		}
		//console.log(taxArray.length) -> 101

		//控除額計
		wholeOmittedYen = deduction + tax;
		wholeGivenYen = wholeGivenYen + transPay + chgCostume;

		var _a = new Array();
    _a.push('<span class="aaa">' + '支給計: ' + insertComma(Math.round(wholeGivenYen)) + '円');
		_a.push('<span class="bbb">' + '基本給: ' + insertComma(Math.round(wholeBaseSalary)) + '円');
		_a.push('<span class="bbb">' + '深夜早朝手当: ' + insertComma(Math.round(wholeMidnightBonus)) + '円');
		_a.push('<span class="bbb">' + '時間外手当: ' + insertComma(Math.round(wholeLongBonus)) + '円');
		_a.push('<span class="bbb">' + '着替手当: ' + insertComma(chgCostume) + '円');
		_a.push('<span class="bbb">' + '交通費: ' + insertComma(transPay) + '円');
		_a.push('<span class="aaa">' + '控除合計: ' + insertComma(Math.round(wholeOmittedYen)) + '円');

		if(emp == 0 || emp == 1){
			_a.push('<span class="bbb">' + '雇用保険: ' + insertComma(empIns) + '円');
			_a.push('<span class="bbb">' + '健保基本保険: ' + insertComma(healthInsB) + '円');
			_a.push('<span class="bbb">' + '健保特定保険: ' + insertComma(healthInsS) + '円');
			_a.push('<span class="bbb">' + '厚生年金保険: ' + insertComma(pension) + '円');
		}
		_a.push('<span class="bbb">' + '課税対象: ' + insertComma(Math.round(taxable)) + '円');
		_a.push('<span class="bbb">' + '所得税: ' + insertComma(Math.round(tax)) + '円');
		if(emp == 0){
			_a.push('<span class="bbb">' + '組合費: ' + insertComma(union) + '円');
		}
		_a.push('<span class="aaa">' + '勤怠関連')
    _a.push('<span class="bbb">' + '出勤日数: ' + days.length + '日');
    _a.push('<span class="bbb">' + '休日日数: ' + (monthday(full_year, month) - days.length) + '日');
		_a.push('<span class="bbb">' + '深夜早朝計: ' + wholeMidnightHours + '時間');
		_a.push('<span class="bbb">' + '時間外計: ' + wholeLongHours + '時間');

    	//以降表示
	    var tr = $('<tr>');
	    //<td>{Y}年{mo}月</td>
	    $('<td>', {
	    	text: full_year + '年' + month + '月'
	    }).appendTo(tr);
	    //<td>その月のデータ...</td>
	    var td = $('<td>', {
	    	'class': 'monthData',
	    	click: function(){
				$(this).find('div').fadeToggle();
				$(this).find('small').toggle();
	    	}
	    });
	    $('<span>', {
	    	text: '差引支給額: ' + insertComma(Math.round(wholeGivenYen - wholeOmittedYen)) + '円'
	    }).appendTo(td);
	    $('<small>', {
	    	'class': 'text-muted',
	    	text: 'クリックすると詳細を表示'
	    }).appendTo(td);
	    $('<div>', {
	    	html : _a.join('</span>')
	    }).css('display', 'none').appendTo(td);
	    td.appendTo(tr);
	    tr.appendTo('#calcSalaryTbody');
    }//月ごとの処理ココまで
}

//checkbox of buttons!
function checkButtonsInput(elems) {
 var flag = false;
 if (elems.parent().prop('disabled')){
  return true;
 } else {
  elems.each(function(){
   if ($(this).prop('checked')){
    flag = true;
    return false;//breakと同義
   }
  });
  if (flag){
      elems.parent().removeClass('btn-outline-danger');
      elems.parent().addClass('btn-outline-secondary');
      return true;
  } else {
      elems.parent().removeClass('btn-outline-secondary');
      elems.parent().addClass('btn-outline-danger');
      return false;
  }
 }
}
