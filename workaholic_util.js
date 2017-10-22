const MESSAGE_TYPES = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];

const AUTO_SAVE_KEY = 'saveonchange';
const AUTO_LOAD_KEY = 'autoload';

const UNDO_HTML_TEMPLATE = '<span class="undo" onclick="undo()">[UNDO]</span>';

//worktimelib.js、 workaholic.jsより前に読み込まれる。

// ゼロ埋めをして整数を文字列化する。digは桁数。
function parseString(num, dig) {
    if (dig == undefined) dig = 2;
    var zero = Array(dig).join('0');
    return (zero+num).slice(-dig);
}

// min以上max未満であればtrue
function isin(num, min, max){
    return num >= min && num < max;
}

/*
  <div>
    <button type="button" class="close" onclick="">
    	<span>&times;</span>
    </button>
    <span></span>
  </div>*/
//htmlのALERTに呼応
function message(mes, type) {
	if (type == undefined || MESSAGE_TYPES.indexOf(type) == -1) type = 'warning';

	var div = $('<div>', {
		'class': 'alert alert-'+type
	}).css('display', 'none');
	$('<button>', {
		html: '<span>&times;</span>',
		'type':'button',
		'class':'close',
		click: function(){
			$(this).parent().parent().children().fadeOut('slow', function(){
				refreshStyle();
			});
		}
	}).appendTo(div);
	$('<span>', {
		html: mes
	}).appendTo(div);

	$('#alert').append(div);
	div.fadeIn();
}

//Javascriptで要素ツリーに変更があったときに、リスポンシブに対応
function refreshStyle() {
	//コンテナの高さを調節してfooterが下に来るように
	if ($(window).outerHeight() > $('#container').outerHeight() + $('footer').outerHeight(true)) {
		$('footer').css({
			'position': 'fixed',
			'bottom': 0
		});
	} else {
		$('footer').css('position', 'relative');
	}
}

function setLS(key, val) {
	window.localStorage.setItem(key, val);
}

function getLS(key) {
	return window.localStorage.getItem(key);
}

function removeLS(key){
	window.localStorage.removeItem(key);
}

//load時
function initCheckbox() {
	$('input[type=checkbox]').each(function(i){
		var attr = $(this).attr(AUTO_LOAD_KEY);
		//autoload属性が存在
		if (typeof attr != 'undefined'){
			loadCheckboxData($(this));
		}
	});
}

//load時
function initTextbox() {
	$('input[type=text],input[type=number],textarea').each(function(i){
		var attr = $(this).attr(AUTO_LOAD_KEY);
		//autoload属性が存在
		if (typeof attr != 'undefined'){
			loadTextboxData($(this));
		}
	});
}

//load時
function initRadioButton() {
	$('input[type=radio]').each(function(i){
		var attr = $(this).attr(AUTO_LOAD_KEY);
		//autoload属性が存在
		if (typeof attr != 'undefined'){
			loadRadioButtonData($(this));
		}
	});
}

//load時
function initSelect() {
	$('select').each(function(index) {
		var attr = $(this).attr(AUTO_LOAD_KEY);
		//autoload属性が存在
		if (typeof attr != 'undefined'){
			loadSelectData($(this));
		}
	});
}

function initFormData(){
	//selectの初期化
	//localStorageから前回のoptionの選択を復元
	//autoload属性があるもののみに適用される。
	initSelect();
	//checkboxも前回から復元
	initCheckbox();
	//textboxも前回から復元
	initTextbox();
	//radioも
	initRadioButton();
}

function loadSelectData(elem){
	loadData(elem, function(e, data){
		e.val(data);
	});
}

//ラジオボタンはオートロード属性をどれか一つのinputにつければok
function loadRadioButtonData(elem) {
	elem.each(function () {
		var id = $(this).attr('name');
		if (typeof id != 'undefined') {
			var data = getLS(id);
			if (data != null){
				$('input[name='+id+'][value='+data+']').prop('checked', true);
			}
		} else {
			has_no_id_error($(this));
		}
	});
}

function loadCheckboxData(elem){
	loadData(elem, function(e, data){
		if (data == 'true') {
			e.prop('checked', true);
		} else {
			e.prop('checked', false);
		}
	});
}

function loadTextboxData(elem){
	loadData(elem, function(e, data){
		e.val(data);
	});
}

function loadData(elem, func){
	elem.each(function () {
		var id = $(this).attr('id');
		//idが存在
		if (typeof id != 'undefined') {
			//idをキーとして
			var data = getLS(id);
			//もしデータが保存されていれば
			if (data != null){
				//データを格納。
				func.call(null, $(this), data);
			}
		} else {
			//idがなければ格納しようがない。これは明確なミスなので、consoleにエラーとしてthrow
			has_no_id_error($(this));
		}
	});
}

function saveData(elem, func){
	elem.each(function () {
		var id = $(this).attr('id');
		if (typeof id != 'undefined') {
			var val = func.call(null, $(this));
			setLS(id, val);
		} else {
			//idがなければ格納しようがない。これは明確なミスなので、consoleにエラーとしてthrow
			has_no_id_error($(this));
		}
	});
}

//変更時に自動的に保存
function registerAutosave() {
	//selectはselectedIndexを格納(整数値)
	$('select').on('change', function(e){
		var attr = $(this).attr(AUTO_SAVE_KEY);
		if (typeof attr != 'undefined'){
			saveSelectData($(this));
		}
	});
	//checkboxは.prop('checked')を格納(true/false)
	$('input[type=checkbox]').on('change', function(e){
		var attr = $(this).attr(AUTO_SAVE_KEY);
		if (typeof attr != 'undefined'){
			saveCheckboxData($(this));
		}
	});
	//radio buttonも.prop('checked')を格納(true/false)
	$('input[type=radio]').on('change', function(e){
		var attr = $(this).attr(AUTO_SAVE_KEY);
		if (typeof attr != 'undefined'){
			saveRadioButtonData($(this));
		}
	});
	$('input[type=text],input[type=number],textarea').on('change', function(e){
		var attr = $(this).attr(AUTO_SAVE_KEY);
		if (typeof attr != 'undefined'){
			saveTextboxData($(this));
		}
	});
}

function saveSelectData(elem){
	saveData(elem, function(e) {
		return e.val();
	});
}

function saveCheckboxData(elem){
	saveData(elem, function(e) {
		return e.prop('checked') ? 'true': '';
	});
}

//必ずcheckedなelemを引数に渡すようにする。
function saveRadioButtonData(elem){
	elem.each(function () {
		var id = $(this).attr('name');
		if (typeof id != 'undefined') {
			//setLS(id, $('input[name='+id+']:checked').val());
			setLS(id, $(this).val());
		} else {
			has_no_id_error($(this));
		}
	});
}

function saveTextboxData(elem){
	saveData(elem, function(e) {
		return e.val();
	});
}

function has_no_id_error(elem){
	console.error('tried to save/get data but the element "'+elem.prop("tagName")+'" has no id.');
}


function insertComma(int){
    return String(int).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
}

//LocalStorageがオフか、非対応である場合、Cookieを使ってLocalStorageを再現する。
//Code From MDN LocalStorage Web docs
// - https://developer.mozilla.org/en-US/docs/Web/API/Storage/LocalStorage
function checkCompatibility(){
	if (!window.localStorage) {
	    Object.defineProperty(window, "localStorage", new (function () {
	    	var aKeys = [], oStorage = {};
	    	Object.defineProperty(oStorage, "getItem", {
	      		value: function (sKey) { return sKey ? this[sKey] : null; },
	      		writable: false,
	      		configurable: false,
	      		enumerable: false
	    	});
	    	Object.defineProperty(oStorage, "key", {
	      		value: function (nKeyId) { return aKeys[nKeyId]; },
	      		writable: false,
	      		configurable: false,
	      		enumerable: false
	    	});
	    	Object.defineProperty(oStorage, "setItem", {
	      		value: function (sKey, sValue) {
	        		if(!sKey) { return; }
	        		document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
	      		},
	      		writable: false,
	      		configurable: false,
	      		enumerable: false
	    	});
	    	Object.defineProperty(oStorage, "length", {
	      		get: function () { return aKeys.length; },
	      		configurable: false,
	      		enumerable: false
	    	});
	    	Object.defineProperty(oStorage, "removeItem", {
	      		value: function (sKey) {
	        		if(!sKey) { return; }
	        		document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	      		},
	     		writable: false,
	      		configurable: false,
	      		enumerable: false
	    	});    
	    	Object.defineProperty(oStorage, "clear", {
	      		value: function () {
	        		if(!aKeys.length) { return; }
	        		for (var sKey in aKeys) {
	          			document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	        		}
	      		},
	      		writable: false,
	      		configurable: false,
	      		enumerable: false
	    	});
	    	this.get = function () {
	      		var iThisIndx;
	      		for (var sKey in oStorage) {
	        		iThisIndx = aKeys.indexOf(sKey);
	        		if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }
	        		else { aKeys.splice(iThisIndx, 1); }
	        		delete oStorage[sKey];
	      		}
	      		for (aKeys; aKeys.length > 0; aKeys.splice(0, 1)) { oStorage.removeItem(aKeys[0]); }
	      		for (var aCouple, iKey, nIdx = 0, aCouples = document.cookie.split(/\s*;\s*/); nIdx < aCouples.length; nIdx++) {
	        		aCouple = aCouples[nIdx].split(/\s*=\s*/);
	        		if (aCouple.length > 1) {
	          			oStorage[iKey = unescape(aCouple[0])] = unescape(aCouple[1]);
	          			aKeys.push(iKey);
	        		}
	      		}
	      		return oStorage;
	    	};
	    	this.configurable = false;
	    	this.enumerable = true;
	  	})());
	}
}