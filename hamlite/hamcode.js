if (document.domain.indexOf('liveothello') > -1) {
	document.domain = 'liveothello.com';
}

var startBoard = "\
--------\
--------\
--------\
---OX---\
---XO---\
--------\
--------\
--------";

var bgColor = "transparent";
var ah18Color = "black";
var textColor = "black";
var movesColor = "yellow";
var scoreColor = "#bdb76b";
var boardColor = "#5CB356";
var trialColor = "#268E7C";
var dotColor = "#";
var defDotCol = "#196619";
var dotReplay = "#";
var defDotRep = "#1e5938";
var dotTrial = "#";
var defDotTry = "#195555";
var putColor = "reverse";
var zebColor = "blue";
var frame1Color = "#993f1f #33150a #33150a #993f1f";
var frame2Color = "#662A15";
var frame3Color = "#33150a #993f1f #993f1f #33150a";
var strSize = "XL";
var putMark = "ON";
var putEnable = "OFF";
var putTrial = "OFF";
var language = "en";

var BLACK = -1;
var WHITE = 1;
var EMPTY = 0;
var WALL = 9;
var PASS = -9;
var pos_A1 = 10;
var pos_H8 = 80;
var PUTMARK = "・";
var PUTMARKSIZE = "100%";
var STYLEPATH = "./style/";
var SCRIPTPATH = "./script/";
var IMAGEPATH = "./";

var vectAry = [10,9,8,1,-1,-8,-9,-10];
var vtBoard = new Array(91);
var dfBoard = new Array(64);
var kifuTable = new Array(64);
var trialTable = new Array(64);
var flipStack = new Array(1200);

var startMoveNo = 1;
var startMoveSv = 1;
var beginMoveNo = 0;
var nextMoveNo = 1;
var nextMoveSv = 1;
var lastMoveNo = 60;
var lastMoveSv = 60;
var blackCount = 0;
var whiteCount = 0;
var dfBlackCount = 0;
var dfWhiteCount = 0;
var fStackP = 0;
var fStackPSv = 0;
var fStartP = 0;

var supposedNextColor = EMPTY;
var startColor = EMPTY;
var startMode = "replay";
var currentMode = "replay";
var previousMode = "replay";
var replayKif = "";
var backupKif = "";
var lastmoveMark = "num";

var currentListOfMoves = "";
var mostRecentListOfMoves = "";

/* Mode can be:
 *   replay: normal mode while (re)playing a game and waiting for moves to be received
 *   trial: user tries variants from the current position (board gets a dark blue color)
 *   kifu: board shows diagram and list of moves can be entered
 */

var disableFirst = false;
var disablePrev = false;
var disableNext = false;
var disableLast = false;
var disableKifu = false;
var disableSolve = false;


var nextBpNo = 0;

var intervalID = null;
var intervalTime = 2000;

var dot_offset_top  = 0;
var dot_offset_left = 0;
var dot_step_width  = 0;

var discImg = new Array(3);
var discSrc = [
	["./b32.png","./e32.png","./w32.png"],
	["./b32.png","./e32.png","./w32.png"],
	["./b32.png","./e32.png","./w32.png"],
	["./b32.png","./e32.png","./w32.png"],
	["./b32.png","./e32.png","./w32.png"],
	["./b32.png","./e32.png","./w32.png"]
];
var useImage = 1;

var solveEnabled = false;
var solveNow = false;
var solveStart = 61;
var solveBestVal = -64;
var solveCounter = 0;
var solveTimerID = null;
var solveTimeOut = 30000;
var solveBoard = "";
var solvePoint = "-";
var solvePos = new Array(32);
var solveVal = new Array(32);
var DEBUG = "http://localhost:8888/hamlite?";
var ONLINE = "https://reversi-ai.appspot.com/endgame?";
var PROXY = "https://www.liveothello.com/server/proxy_AI.php?";
var solveURL = PROXY;


/************************************************************************/

var blinkingPutTimer = false;
/* These two variables are used to store the real number of Black and White discs
 * each time a new list of moves is received. This way, the count is independant of any
 * replay of variant lines tried by the viewer. */
var realNumberBlackDiscs = 2;
var realNumberWhiteDiscs = 2;

function getNumberOfBlackDiscs() {
//	return blackCount;
	return realNumberBlackDiscs;
}

function getNumberOfWhiteDiscs() {
//	return whiteCount;
	return realNumberWhiteDiscs;
}

function colour2String(color) {
	switch (color) {
	case BLACK:
		return "black";
	case WHITE:
		return "white";
	case PASS:
		return "pass";
	default:
		return "empty";
	}
}

function whoseTurn() {
	// First check end of game:
	if (supposedNextColor === EMPTY) {
		return EMPTY;
	}

	// supposedNextColor is the "supposed" color that should play, but it
	// hasn't been check if it passes.
	var realNextColor = supposedNextColor;
	var canNextColorPlay = checkNextColor(-supposedNextColor); // pretend the opponent just played, can we?
	if (canNextColorPlay === PASS) {
		var canOpponent = checkNextColor(supposedNextColor); // Ok, so we pass, can the opponent play?
		if (canOpponent === PASS) {
			return EMPTY;
		}
		realNextColor = -supposedNextColor;
	}
	if (realNextColor === BLACK) {
		return BLACK;
	}
	return WHITE;
}

function whoseTurn2String() {
	return colour2String(whoseTurn());
}

function countStone(nCol, nTurn, nOwn) {
	blackCount = whiteCount = 0;
	for (var i = 0; i < 64; i++) {
		switch (vtBoard[idx_to_pos(i)]) {
		case BLACK:
		  blackCount++;
		  break;
		case WHITE:
		  whiteCount++;
		  break;
		}
	}
}

function setLanguage() {
	var obj;
	if (language === "fr") {
		obj = document.getElementById("solve");
		if (obj != null)
			obj.value = "I A";
		obj = document.getElementById("SetKifu");
		if (obj != null)
			obj.value = "valid.";
		obj = document.getElementById("PutCheck");
		if (obj != null)
			obj.innerHTML = "Var.";
	}
}

function updatePositionWithListOfMoves(list, forceChange) {
	var oldList = backupKif;
	var oldPos = nextMoveNo;
	backupKif = list;

	if (currentMode === "replay") {
		kifuAndReturn(false);
		kifuSet(list, false);
		kifuAndReturn(false); // Set new position

		// If the old list is a proper prefix of the new one and if we were not at the last move
		// or if the list is the same (coming back from trial mode) -> then we come back to
		// old position, otherwise we play the new list to the end.
		if (!forceChange && (list.indexOf(oldList, 0) == 0) &&
			(((list.length != oldList.length) && (oldPos <= (list.length/2-1))) ||
			 (list.length == oldList.length))) {
//			alert( "oldPos="+oldPos+" - length:"+list.length/2);
			setTimeout(function() {
				for(var i=1; i<oldPos; i++) {
					moveNext();
				}
			}, 100);
		} else {
			setTimeout(function () {
				moveLast();
			}, 100);
		}
	}
	if ((currentMode === "kifu") && (previousMode === "replay")) {
		kifuSet(list, false); // update list of moves
		kifuAndReturn(false); // go back to board to go to last move
		moveLast();
		if (!forceChange) {
			kifuAndReturn(true); // back to diagram if not forced
		}
	}
	if (!forceChange) {
		if ((currentMode === "trial") || (previousMode === "trial")) {
			if (!blinkingPutTimer) {
				blinkingPutTimer = setInterval(function () {
					var text = document.getElementById("PutCheck");
					if (text) {
						text.style.fontWeight = "bold";
						setTimeout(function(item) {item.style.fontWeight = "normal";}, 500, text);
					}
				}, 2000);
			}
		}
	} else { // forceChange
		if ((currentMode == "kifu") && (previousMode === "trial")) {
			kifuAndReturn(false);
		}
		if (currentMode === "trial") {
			var obj = document.getElementById("PutTrial");
			obj.checked = false;
			onPutTrial(true);
//			alert('**');
//			updatePositionWithListOfMoves(list, false);
		}

	}
}

/************************************************************************/


UnescapeAutoDetect=function(str) {
  return window["Unescape"+GetEscapeCodeType(str)](str)
};

String.prototype.trim = function() {
	return this.replace(/^[ \s\n\r\t]+|[ \s\n\r\t]+$/g, '');
}

String.prototype.trimAll = function() {
	return this.replace(/[ \s\n\r\t]+/g, '');
}

function onLoadInit() {
	if (solveEnabled && startMode != "auto") {
		solver(solveURL);
	}
	/* Move in game with arrow keys (added by S. Nicolet) */
	document.onkeydown = function(e) {
		switch (e.keyCode) {
			case 37: if (HamliteHasFocus() && !document.getElementById("prev").disabled)
				movePrev();
				break;
			case 39: if (HamliteHasFocus() && !document.getElementById("next").disabled)
				moveNext();
				break;
		}
	};
}

function HamliteHasFocus() {
	return true;
}

function getInitParam() {
	var strParameter;
	var strParamAry;
	var strParam;
	var paraSep = "=";
	var lineSep = "&";
	var i;

	if (!(strParameter = location.search.substr(1))) {
		return false;
	}

	strParameter = UnescapeAutoDetect(strParameter);

	if (strParameter.indexOf("=") == -1) {
		return false;
	}

	strParamAry = strParameter.split(lineSep);

	for (i = 0; i < strParamAry.length; i++) {
		if (!strParamAry[i].length) {
			continue;
		}
		strParam = strParamAry[i].split(paraSep);
		if (!(strParam[1])) {
			continue;
		}

		switch (strParam[0].toLowerCase().trim()) {
		case "start_mode":
			switch (strParam[1].toLowerCase().trimAll()) {
			case "replay":
				startMode = "replay";
				break;
			case "trial":
				startMode = "trial";
				break;
			case "kifu":
				startMode = "kifu";
				break;
			case "auto":
				startMode = "auto";
				break;
			default:
				startMode = "replay";
		 	}
			break;
		case "start_board":
			if (strParam[1].trimAll().length == 64) {
				startBoard = strParam[1].trimAll();
			}
			else if (strParam[1].trimAll().length == 65) {
				startBoard = strParam[1].trimAll().substr(0,64);
				switch (strParam[1].trimAll().substr(64,1)) {
				case "*":
				case "x":
				case "X":
					startColor = BLACK;
			 		break;
				case "o":
				case "O":
					startColor = WHITE;
					break;
				}
			}
			else {
				alert("board parameter Error.");
			}
			break;
		case "start_move":
			beginMoveNo = parseInt(strParam[1].toLowerCase().trimAll());
			if (beginMoveNo < 1 || beginMoveNo > 61) {
				alert("Error：start_move");
				beginMoveNo = 0;
			}
			break;
		case "start_color":
			switch (strParam[1].toLowerCase().trimAll()) {
			case "black":
			startColor = BLACK;
				break;
			case "white":
			startColor = WHITE;
				break;
			}
			break;
		case "board_color":
			var strColor = strParam[1].trim();
			if (!(strColor.length == 6 && strColor.search(/[^0-9a-fA-F]/i) < 0)) {
				try {
					document.getElementById("dummy").style.color = strColor;
				}
				catch(e) {
					alert("Error: board_color");
					continue;
				}
				boardColor = strColor;
			}
			else {
				boardColor = "#" + strColor;
				dotReplay = (dotReplay == "#" ? ("#" + calcColorDark(strColor)) : dotReplay);
			}
		 	break;
		case "trial_color":
			var strColor = strParam[1].trim();
			if (!(strColor.length == 6 && strColor.search(/[^0-9a-fA-F]/i) < 0)) {
				try {
					document.getElementById("dummy").style.color = strColor;
				}
				catch(e) {
					alert("Error: trial_color");
					continue;
				}
				trialColor = strColor;
			}
			else {
				trialColor = "#" + strColor;
				dotTrial = (dotTrial == "#" ? ("#" + calcColorDark(strColor)) : dotTrial);
			}
			break;
		case "lastmove_color":
			if (strParam[1].toLowerCase().trim() == "reverse") {
				putColor =  "reverse";
				continue;
			}
			var strColor = checkColorString(strParam[1].trim());
			if (strColor != null) {
				putColor = strColor;
			}
			else {
				alert("Error: lastmove_color");
				continue;
			}
			break;
		case "replay_dot_color":
			var strColor = checkColorString(strParam[1].trim());
			if (strColor != null) {
				dotReplay = strColor;
			}
			else {
				alert("Error: replay_dot_color");
				continue;
			}
			break;
		case "trial_dot_color":
			var strColor = checkColorString(strParam[1].trim());
			if (strColor != null) {
				dotTrial = strColor;
			}
			else {
				alert("Error: trial_dot_color");
				continue;
			}
			break;
		case "ah18_color":
			var strColor = checkColorString(strParam[1].trim());
			if (strColor != null) {
				ah18Color = strColor;
			}
			else {
				alert("Error: ah18_color");
				continue;
			}
			break;
		case "bgcolor":
			var strColor = checkColorString(strParam[1].trim());
			if (strColor != null) {
				bgColor = strColor;
			}
			else {
				alert("Error: bgcolor");
				continue;
			}
			break;
		case "frame_color":
			var strColor = strParam[1].trim();
			if (!(strColor.length == 6 && strColor.search(/[^0-9a-fA-F]/i) < 0)) {
				try {
					document.getElementById("dummy").style.borderColor = strColor;
				}
				catch(e) {
					alert("Error: frame_color");
					continue;
				}
				frame1Color = strColor;
				frame2Color = strColor;
				frame3Color = strColor;
			}
			else {
				var normalCol = "#" + strColor;
				var lightCol	= "#" + calcColorLight(strColor);
				var darkCol 	= "#" + calcColorDark(strColor);
				frame1Color = lightCol + " " + darkCol + " " + darkCol + " " + lightCol;
				frame2Color = normalCol;
				frame3Color = darkCol + " " + lightCol + " " + lightCol + " " + darkCol;
			}
			break;
		case "kifu":
			replayKif = checkKifFormat(strParam[1].trimAll());
			break;
		case "matrix":
			replayKif = convMatrixToKif(strParam[1].trimAll());
			break;
		case "size":
			strSize = strParam[1].trim();
			break;
		case "lastmove_mark":
			switch (strParam[1].toLowerCase().trim()) {
				case "dot" :
					lastmoveMark = "dot";
					break;
				case "num" :
					lastmoveMark = "num";
					break;
				case "zebra" :
				case "wzebra" :
					lastmoveMark = "zebra";
					break;
				default:
					lastmoveMark = "dot";
			}
			break;
		case "lastmove_check":
			switch (strParam[1].toLowerCase().trim()) {
				case "on" :
					putMark = "ON";
					break;
				case "off" :
					putMark = "OFF";
					break;
				default:
					putMark = "OFF";
			}
			break;
		case "move_interval":
			intervalTime = strParam[1].toLowerCase().trim();
			break;
		case "ai":
			if (strParam[1].toLowerCase().trim() == "off")
				solveEnabled = false;
			break;
		case "debug":
			if (strParam[1].toLowerCase().trim() == "on")
				solveURL = DEBUG;
			else
				solveURL = ONLINE;
			break;
		case "lang":
			if (strParam[1].toLowerCase().trim() == "fr") {
				language = "fr";
			}
		}
	}
}

function ascending(a,b) {return a-b};

function setNextBpNo() {
	if (currentMode == "trial") {
		document.getElementById("last").value = ">|";
		return;
	}
}

function checkColorString(strColor) {
	if (!(strColor.length == 6 && strColor.search(/[^0-9a-fA-F]/i) < 0)) {
		try {
			document.getElementById("dummy").style.color = strColor;
		}
		catch(e) {
			return null;
		}
		return strColor
	}
	return "#" + strColor;
}

function calcColorLight(strColor) {
	var rCol,gCol,bCol;
	rCol = parseInt(strColor.substr(0,2),16);
	gCol = parseInt(strColor.substr(2,2),16);
	bCol = parseInt(strColor.substr(4,2),16);
	var rStr,gStr,bStr;
	rStr = (parseInt(rCol/2*3) > 255 ? 255 : parseInt(rCol/2*3)).toString(16);
	gStr = (parseInt(gCol/2*3) > 255 ? 255 : parseInt(gCol/2*3)).toString(16);
	bStr = (parseInt(bCol/2*3) > 255 ? 255 : parseInt(bCol/2*3)).toString(16);
	var lightCol = ((rStr.length < 2) ? "0" + rStr : rStr)
							 + ((gStr.length < 2) ? "0" + gStr : gStr)
							 + ((bStr.length < 2) ? "0" + bStr : bStr);

	return String(lightCol);
}

function calcColorDark(strColor) {
	var rCol,gCol,bCol;
	rCol = parseInt(strColor.substr(0,2),16);
	gCol = parseInt(strColor.substr(2,2),16);
	bCol = parseInt(strColor.substr(4,2),16);
	var rStr,gStr,bStr;
	rStr = (parseInt(rCol/2)).toString(16);
	gStr = (parseInt(gCol/2)).toString(16);
	bStr = (parseInt(bCol/2)).toString(16);
	var darkCol = ((rStr.length < 2) ? "0" + rStr : rStr)
							+ ((gStr.length < 2) ? "0" + gStr : gStr)
							+ ((bStr.length < 2) ? "0" + bStr : bStr);

	return String(darkCol);
}

function initBoardPrint() {
	var i = 0, ahStr = "abcdefgh", doc = document;
	var strID = "", strChar = "", strLine = "";
	var strText = "", strEval = "";
	var discColor = 0, textColor = "";
	var evalColor = "yellow";
	var strHD = '<img class="ham_disc" id="disc_';
	var strHE = '<div class="ham_eval" id="eval_';
	var strHC = '<div class="ham_cell" id="cell_';

	dotColor = (dotColor == "#" ? defDotCol : dotColor);
	dotReplay = (dotReplay == "#" ? defDotRep : dotReplay);
	dotTrial = (dotTrial == "#" ? defDotTry : dotTrial);

	doc.getElementById("hamlite").style.backgroundColor = bgColor;
	doc.getElementById("frame_2").style.backgroundColor = boardColor;
	doc.getElementById("frame_1").style.borderColor = frame1Color;
	doc.getElementById("frame_2").style.borderColor = frame2Color;
	doc.getElementById("frame_3").style.borderColor = frame3Color;

	dfBlackCount = 0;
	dfWhiteCount = 0;

	for (var y = 0; y < 8; y++) {
		var charXID = doc.getElementById("char_" + ahStr.charAt(y));
		var charYID = doc.getElementById("char_" + String(y+1));
		charXID.style.color = ah18Color;
		charYID.style.color = ah18Color;

		for (var x = 0; x < 8; x++) {
			strID = ahStr.charAt(x) + String(y+1);
			strChar = startBoard.charAt(i++);
			switch (strChar) {
			case "X":
				strText = "";
				strEval = "";
				discColor = BLACK + 1;
				textColor = 'black';
				evalColor = 'white';
				dfBoard[y*8+x] = BLACK;
				dfBlackCount++;
				break;
			case "x":
				strText = "・";
				strEval = "";
				discColor = BLACK + 1;
				textColor = 'magenta';
				evalColor = 'white';
				dfBoard[y*8+x] = BLACK;
				dfBlackCount++;
				break;
			case "*":
				strText = "＋";
				strEval = "";
				discColor = BLACK + 1;
				textColor = 'magenta';
				evalColor = 'white';
				dfBoard[y*8+x] = BLACK;
				dfBlackCount++;
				break;
			case "O":
				strText = "";
				strEval = "";
				discColor = WHITE + 1;
				textColor = 'white';
				evalColor = 'black';
				dfBoard[y*8+x] = WHITE;
				dfWhiteCount++;
				break;
			case "o":
				strText = "・";
				strEval = "";
				discColor = WHITE + 1;
				textColor = 'magenta';
				evalColor = 'black';
				dfBoard[y*8+x] = WHITE;
				dfWhiteCount++;
				break;
			case "@":
				strText = "＋";
				strEval = "";
				discColor = WHITE + 1;
				textColor = 'magenta';
				evalColor = 'black';
				dfBoard[y*8+x] = WHITE;
				dfWhiteCount++;
				break;
			case "-":
				strText = "";
				strEval = "";
				discColor = EMPTY + 1;
				textColor = boardColor;
				evalColor = 'yellow';
				dfBoard[y*8+x] = EMPTY;
				break;
			case "+":
				strText = "・";
				strEval = "";
				discColor = EMPTY + 1;
				textColor = '#196619';
				evalColor = 'yellow';
				dfBoard[y*8+x] = EMPTY;
				break;
			default:
				strText = strChar;
				strEval = "";
				discColor = EMPTY + 1;
				textColor = '#ffff00';
				evalColor = 'yellow';
				dfBoard[y*8+x] = EMPTY;
				break;
			}

			strLine = strHD + strID + '" src="' + discImg[discColor]
							+ '" width="100%" height="100%"'
							+ ' onclick="cellClick(this)"'
							+ ' onmouseover="aimPrint(this)"'
							+ ' onmouseout="aimClear(this)" />'
							+ strHE + strID + '"'
							+ ' onclick="cellClick(this)"'
							+ ' onmouseover="aimPrint(this)"'
							+ ' onmouseout="aimClear(this)">'
							+ strEval + '</div>'
							+ strHC + strID + '"'
							+ ' onclick="cellClick(this)"'
							+ ' onmouseover="aimPrint(this)"'
							+ ' onmouseout="aimClear(this)">'
							+ strText + '</div>';

			doc.write(strLine);
			doc.getElementById("cell_" + strID).style.color = textColor;
			var evalId = doc.getElementById("eval_" + strID);
			evalId.style.color = evalColor;
		}
	}

	doc.write('<div class="x_corner" id="dot_lu"></div>');
	doc.write('<div class="x_corner" id="dot_ru"></div>');
	doc.write('<div class="x_corner" id="dot_ld"></div>');
	doc.write('<div class="x_corner" id="dot_rd"></div>');
	doc.write('<div class="last_move" id="dot_mark"></div>');
}

function aimPrint(obj) {
	var ah18 = obj.id.slice(-2);
	var nPos = ah18_to_pos(ah18);
	var nCol = supposedNextColor;
	var cell = document.getElementById("cell_" + ah18);

	if (currentMode == "trial" && vtBoard[nPos] == EMPTY) {
		cell.style.zIndex = 999;
		cell.style.borderColor = "#FFFFFF";
		if (isColourCanPlaySquare(nPos,nCol)) {
			obj.style.cursor = "pointer";
		}
		else {
			obj.style.cursor = "default";
		}
	}
}

function aimClear(obj) {
	var ah18 = obj.id.slice(-2);
	var cell = document.getElementById("cell_" + ah18);

	if (currentMode == "trial") {
		cell.style.zIndex = 99;
		cell.style.borderColor = "#000000";
		obj.style.cursor = "auto";
	}
}

function togglePutMark() {
		var putMark = document.getElementById("PutMark");

		putMark.checked = (putMark.checked ? false : true); /* invert putMark */
		onPutMark();

}

function cellClick(obj) {
	if (currentMode == "kifu") {
		return false;
	}

	clearEval();

	if (currentMode != "trial") {
		togglePutMark();
		onPutEnable();
		return false;
	}

	var ah18 = obj.id.slice(-2);
	var nPos = ah18_to_pos(ah18);
	var nMove = nextMoveNo - startMoveNo;
	var trialKif = "";
	var nTurn = 0;

	if (!isColourCanPlaySquare(nPos, supposedNextColor)) {
		onPutMark();
		return false;
	}

	if (nMove < replayKif.length / 2) {
		if (ah18 != replayKif.substr(nMove * 2, 2)) {
				trialKif = replayKif.substr(nMove * 2);
				var len = trialKif.length / 2;
				for (var i = 0; i < len; i++) {
					trialTable[ah18_to_idx(trialKif.substr(i*2,2))] = EMPTY;
				}
				replayKif = replayKif.substr(0, nMove * 2);
				replayKif = replayKif.concat(ah18);
				lastMoveNo = nextMoveNo;
		}
	}
	else {
		replayKif = replayKif.concat(ah18);
		lastMoveNo = nextMoveNo;
	}

	nTurn = putStonePrint(nPos, supposedNextColor);
	countStone(supposedNextColor, nTurn, 1);
	printScore(blackCount, whiteCount);
	trialTable[pos_to_idx(nPos)] = (nextMoveNo + 10) * supposedNextColor;

	var putMark = document.getElementById("PutMark").checked;
	putMarkErase();
	if (putMark) {
		if (lastmoveMark == "dot")
			putMarkPrint(ah18,PUTMARK,putColor,PUTMARKSIZE);
		else if (lastmoveMark == "num")
			putNumPrint(ah18,String(nextMoveNo));
		else
			putMarkZebra(ah18,putColor);
	}

	nextMoveNo++;

	var nCol = checkNextColor(supposedNextColor);
	if (nCol == PASS) {
		nCol = checkNextColor(-supposedNextColor);
		if (nCol == PASS) {
			supposedNextColor = -supposedNextColor;
			printNextColor(EMPTY);
			printNextMove(nextMoveNo, lastMoveNo);
		}
		else {
			pos_Push(PASS);
			supposedNextColor = nCol;
			printNextColor(supposedNextColor);
			printNextMove(nextMoveNo, nextMoveNo);
		}
	}
	else {
			supposedNextColor = nCol;
			printNextColor(supposedNextColor);
			printNextMove(nextMoveNo, nextMoveNo);
	}

	var putEnable = document.getElementById("PutEnable").checked;
	if (putEnable) {
		putEnablePrint(PUTMARK, supposedNextColor);
	}

	setTimeout("setGrayOutButton()",1);
}

function changeToTrialMode() {
	currentMode = "trial";
	dotColor = dotTrial;
	document.getElementById("frame_2").style.backgroundColor = trialColor;
	nextMoveSv = nextMoveNo;
	startMoveSv = startMoveNo;
	startMoveNo = nextMoveNo;
	lastMoveSv = lastMoveNo;
	lastMoveNo = nextMoveNo - 1;
	fStartP = fStackP;
	backupKif = replayKif;
	replayKif = replayKif.substr(0, (nextMoveNo - startMoveNo) * 2);

	setNextBpNo();

	 for (var i = 0; i < 64; i++) {
		trialTable[i] = vtBoard[idx_to_pos(i)];
	}

	clearEval();
	onPutEnable();
	onPutMark();
}

function returnReplayMode(forceChange) {
	var nTurn = 0;

	for ( var i = nextMoveNo; i > startMoveNo; i--) {
		supposedNextColor = -supposedNextColor;
		if ((nTurn = pos_Pop()) == PASS) {
			nTurn = pos_Pop();
			supposedNextColor = -supposedNextColor;
		}
		undoFlips(nTurn, -supposedNextColor, true);
		countStone(supposedNextColor, -nTurn, -1);
		nextMoveNo--;
	}

	currentMode = "replay";
	dotColor = dotReplay;
	document.getElementById("frame_2").style.backgroundColor = boardColor;
	document.getElementById("kifu").value = "diag.";
	nextMoveNo = nextMoveSv;
	startMoveNo = startMoveSv;
	lastMoveNo= lastMoveSv;
	fStackP = fStartP;
	fStartP = 0;
	replayKif = backupKif;

	updatePositionWithListOfMoves(backupKif, forceChange);
	setNextBpNo();
//	currentBoardPrint();
	printScore(blackCount, whiteCount);
	printNextColor(supposedNextColor);
	printNextMove(nextMoveNo, lastMoveNo);

	onPutEnable();
	clearInterval(blinkingPutTimer);
	blinkingPutTimer = false;
}

function currentBoardPrint() {
	var nPos = 0;
	for (var y = 0; y < 8; y++) {
		for (var x = 0; x < 8; x++) {
			nPos = (y + 1) * 9 + x + 1;
			printStone(nPos, vtBoard[nPos], 0);
		}
	}
}

function printScore(bCount,wCount) {
	document.getElementById("BlackCount").innerHTML = ((bCount < 10) ? String(bCount)+" " : String(bCount));
	document.getElementById("WhiteCount").innerHTML = ((wCount < 10) ? String(wCount)+" " : String(wCount));
}

function printNextMove(nextMove, lastMove) {
	if (nextMove > lastMove) {
		document.getElementById("MoveNo").innerHTML = "--";
	}
	else {
		document.getElementById("MoveNo").innerHTML = ((nextMove < 10) ? String(nextMove)+" " : String(nextMove));
	}
}

function printNextColor(nextCol) {
	switch (nextCol) {
	case BLACK:
		document.getElementById("BlackFrame").style.borderColor = movesColor;
		document.getElementById("WhiteFrame").style.borderColor = scoreColor;
		break;
	case WHITE:
		document.getElementById("BlackFrame").style.borderColor = scoreColor;
		document.getElementById("WhiteFrame").style.borderColor = movesColor;
		break;
	default:
		document.getElementById("BlackFrame").style.borderColor = scoreColor;
		document.getElementById("WhiteFrame").style.borderColor = scoreColor;
	}
}

function checkKifFormat(inputKif) {
	var inKif = inputKif.toLowerCase();
	var x_AtoH;
	var y_1to8;
	var strKif = "";

	for (var i = 0 ; i < inKif.length; i += 2) {
		x_AtoH = inKif.charAt(i);
		if (x_AtoH >= 'a' && x_AtoH <= 'h') {
			strKif = strKif.concat(x_AtoH);
		}
		else {
			break;
		}
		y_1to8 = inKif.charAt(i+1);
		if (y_1to8 >= '1' && y_1to8 <= '8') {
			strKif = strKif.concat(y_1to8);
		}
		else {
			break;
		}
	}

	return strKif;
}

function convMatrixToKif(inputMatrix) {
	var inMatrix = inputMatrix.toLowerCase();
	var matrixAry = inMatrix.split("|");
	var sortAry = new Array(64);
	var strMoveNo = "";
	var strKif = "";
	var idx = 0;

	for (var i = 0; i <= 60; i++) {
		sortAry[i] = NaN;
	}

	for (var i = 0; i < matrixAry.length; i++) {
		strMoveNo = matrixAry[i];
		if (!strMoveNo.length) {
			continue;
		}
		if (idx < 64 && strMoveNo.search(/[0-9]/i) != -1) {
			sortAry[parseInt(strMoveNo)] = idx_to_ah18(idx);
		}
		idx++;
	}

	for (var i = 1; i <= 60; i++) {
		if (sortAry[i] != NaN) {
			strKif = strKif.concat(sortAry[i]);
		}
	}

	return strKif;
}

function pos_to_ah18(nPos) {
	var strAtoH = "abcdefgh";
	var str1to8 = "12345678";
	var strX = strAtoH.charAt(nPos%9-1);
	var strY = str1to8.charAt(Math.floor(nPos/9)-1);
	return strX + strY;
}

function ah18_to_pos(ah18) {
	var strAH18 = ah18.toLowerCase();
	var strAtoH = "abcdefgh";
	var x = strAtoH.search(strAH18.charAt(0));
	var y = parseInt(strAH18.charAt(1)) - 1;
	return (x+1)+(y+1)*9;
}

function pos_to_idx(nPos) {
	return (nPos%9-1) + (Math.floor(nPos/9)-1) * 8;
}

function idx_to_pos(nIdx) {
	return (nIdx%8+1) + (Math.floor(nIdx/8)+1) * 9;
}

function idx_to_ah18(nIdx) {
	var strAtoH = "abcdefgh";
	var str1to8 = "12345678";
	var strX = strAtoH.charAt(nIdx%8);
	var strY = str1to8.charAt(Math.floor(nIdx)/8);
	return strX + strY;
}

function ah18_to_idx(ah18) {
	var strAH18 = ah18.toLowerCase();
	var strAtoH = "abcdefgh";
	var x = strAtoH.search(strAH18.charAt(0));
	var y = parseInt(strAH18.charAt(1)) - 1;
	return x+y*8;
}

function printStone(nPos, nCol, nMove) {
	var strAH18 = pos_to_ah18(nPos);

	idx = document.getElementsByTagName("img");
	idx[pos_to_idx(nPos)+useImage].src = discImg[nCol+1]

	switch (nCol) {
	case BLACK:
		document.getElementById("eval_"+strAH18).style.color = "white";
		document.getElementById("cell_"+strAH18).style.color = "yellow";
		document.getElementById("eval_"+strAH18).innerHTML = ((nMove == 0) ? "" : String(nMove));
		document.getElementById("cell_"+strAH18).innerHTML = "";
		break;
	case WHITE:
		document.getElementById("eval_"+strAH18).style.color = "black";
		document.getElementById("cell_"+strAH18).style.color = "yellow";
		document.getElementById("eval_"+strAH18).innerHTML = ((nMove == 0) ? "" : String(nMove));
		document.getElementById("cell_"+strAH18).innerHTML = "";
		break;
	default:
		document.getElementById("eval_"+strAH18).innerHTML = "";
		document.getElementById("cell_"+strAH18).innerHTML = "";
	}
}

function checkKifPutEnable(currentKif, startCol) {
	var nPos, nPos2;
	var nCol = startCol;
	var tempKif = currentKif;
	var lastMove = currentKif.length / 2;
	var i, j;

	for (i = 0; i < 64; i++)
		kifuTable[i] = dfBoard[i];

	for (i = 0; i < lastMove; i++) {
		nPos = ah18_to_pos(currentKif.substr(i * 2, 2));
		if (!putStoneBoard(nPos, nCol)) {
			nCol = -nCol;
			if	(!putStoneBoard(nPos, nCol)) {
				tempKif = currentKif.substr(0,(i + 1) * 2);
				alert("list of moves error?");
				break;
			}
		}
		kifuTable[pos_to_idx(nPos)] = (i + 1 + 10) * nCol;
		nCol = -nCol;
	}

	return tempKif;
}

function initStartMove() {
	if ( (beginMoveNo < startMoveNo) || (beginMoveNo > lastMoveNo + 1) ) {
		alert("start_move err! ");
		return;
	}

	var ah18, nPos = 0, nTurn = 0, nUndo = 0;

	for (var i = startMoveNo; i < beginMoveNo; i++) {
		ah18 = replayKif.substr((i-startMoveNo) * 2, 2)
		if (ah18.length == 2) {
			nPos = ah18_to_pos(ah18);
			nTurn = putStoneBoard(nPos, supposedNextColor);
			countStone(supposedNextColor, nTurn, 1);
		}
		else {
			break;
		}
		ah18 = replayKif.substr((i+1-startMoveNo) * 2, 2);
		if (ah18.length == 2) {
			nPos = ah18_to_pos(ah18);
			supposedNextColor = checkNextMove(nPos, supposedNextColor);
		}
		else {
			supposedNextColor = -supposedNextColor;
			break;
		}
	}

	startColor = supposedNextColor;
	nextMoveNo = beginMoveNo;
	if (beginMoveNo > startMoveNo) {
		currentBoardPrint();
	}
}

/* Checks if colour nCol can play square nPos */
function isColourCanPlaySquare(nPos, nCol) {
	var nCount = 0, nPosInc = 0, nVect = 0;

	if (vtBoard[nPos] != EMPTY)
		return false;

	for (var i = 0; i < 8; i++) {
		nVect = vectAry[i];
		nPosInc = nPos + nVect;
		nCount = 0;
		while (vtBoard[nPosInc] == -nCol) {
			nPosInc += nVect;
			nCount++;
		}
		if (nCount > 0 && vtBoard[nPosInc] == nCol) {
			return true;
		}
	}

	return false;
}

function isPutEnableAny(nCol) {
	for (var nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if(vtBoard[nPos] != EMPTY) continue;
		if (isColourCanPlaySquare(nPos, supposedNextColor)) {
			return true;
		}
	}
	return false;
}

function putStoneBoard(nPos, nCol) {
	var nCount = 0, nVect = 0, nPosInc = 0, nTurn = 0;

	if (vtBoard[nPos] != EMPTY)
		return 0;

	for (var i = 0; i < 8; i++) {
		nVect = vectAry[i];
		nPosInc = nPos + nVect;
		nCount = 0;
		while (vtBoard[nPosInc] == -nCol) {
			nPosInc += nVect;
			nCount++;
		}
		if (nCount > 0 && vtBoard[nPosInc] == nCol) {
			nTurn += nCount;
			while (nCount > 0) {
				nPosInc -= nVect;
				vtBoard[nPosInc] = nCol;
				pos_Push(nPosInc);
				nCount--;
			}
		}
	}

	if (nTurn > 0) {
		vtBoard[nPos] = nCol;
		pos_Push(nPos);
		pos_Push(nTurn);
	}

	return nTurn;
}

function putStonePrint(nPos, nCol) {
	var nTurn;

	if ((nTurn = putStoneBoard(nPos, nCol)) == 0) {
		return 0;
	}

	printStone(nPos, nCol, 0);
	var nPeek = fStackP - 3;
	for (var i = 0; i < nTurn; i++) {
		printStone(flipStack[nPeek--], nCol, 0);
	}

	return nTurn;
}

function pos_Push(nPos) {
	flipStack[fStackP++] = nPos;
}

function pos_Pop() {
	return flipStack[--fStackP];
}

/*function countStone(nCol, nTurn, nOwn) {
	if (nCol == BLACK) {
		blackCount = blackCount + nTurn + nOwn;
		whiteCount = whiteCount - nTurn;
	}
	else {
		blackCount = blackCount - nTurn;
		whiteCount = whiteCount + nTurn + nOwn;
	}
}*/

function undoFlips(nTurn, nCol, flag) {
	var nPos = pos_Pop();
	var nPos2 = nPos;

	vtBoard[nPos] = EMPTY;
	if (flag) {
		printStone(nPos, EMPTY, 0);
	}

	while(nTurn-- > 0) {
		nPos = pos_Pop();
		vtBoard[nPos] = nCol;
		if (flag) {
			printStone(nPos, nCol, 0);
		}
	}
	return nPos2;
}

function checkNextMove(nPos, nCol) {
	var nextCol = -nCol;

	if (!isColourCanPlaySquare(nPos, nextCol)) {
		nextCol = -nextCol;
		if	(!isColourCanPlaySquare(nPos, nextCol)) {
			nextCol = EMPTY;
			alert("list of moves error!! " + pos_to_ah18(nPos));
		}
		else {
			pos_Push(PASS);
		}
	}

	return nextCol;
}

function initVirtualBoard() {
	for (var i = 0; i < 9; i++) {
		vtBoard[i] = WALL;
		vtBoard[(i+1)*9] = WALL;
		vtBoard[i+82] = WALL;
	}

	for (var i = 0; i < 64; i++) {
		vtBoard[idx_to_pos(i)] = dfBoard[i];
	}
}

function initBoardStatus() {
	fStackP = 0;
	startMoveNo = dfBlackCount + dfWhiteCount - 4 + 1;
	nextMoveNo = startMoveNo;
	lastMoveNo = startMoveNo + replayKif.length / 2 - 1;
	nextBpNo = lastMoveNo + 1;

	if (beginMoveNo == 0) {
		beginMoveNo = startMoveNo;
	}

	if (startColor == EMPTY) {
		if (nextMoveNo % 2) {
			startColor = BLACK;
		}
		else {
			startColor = WHITE;
		}
	}

	supposedNextColor = startColor;
	blackCount = dfBlackCount;
	whiteCount = dfWhiteCount;
	currentMode = startMode;
	currentBrowserName = checkBrowserName();
	currentBrowserType = checkPlatform();
}

function changeStartMode() {
	switch (startMode) {
	case "trial":
		switchScorePanel("score");
		printScore(blackCount,whiteCount);
		var nCol = checkNextColor(supposedNextColor);
		if (nCol != PASS) {
			printNextMove(nextMoveNo, nextMoveNo);
		}
		else {
			printNextMove(nextMoveNo, lastMoveNo);
		}
		printNextColor(supposedNextColor);
	 	document.getElementById("PutTrial").checked = true;
		changeToTrialMode();
		setGrayOutButton();
		break;
	case "kifu":
		switchScorePanel("kifu");
		changeToKifuMode(true);
		setGrayOutButton();
		break;
	case "auto":
		currentMode = "replay";
		repeat_OnOff();
		break;
	default: //"replay"
		printScore(blackCount,whiteCount);
		printNextMove(nextMoveNo,lastMoveNo);
		printNextColor(startColor);
	 	dotColor = dotReplay;
	 	setGrayOutButton();
		break;
	}
}

function changeToKifuMode(isDisplay) {
	currentMode = "kifu";
	if (previousMode == "trial") {
		kifPrint(trialTable);
	}
	else {
		if (isDisplay)
			kifPrint(kifuTable);
 }
	switchScorePanel("kifu");
	document.getElementById("KifuText").value = replayKif;
	document.getElementById("kifu").value = (language === "fr" ? "partie" : "board");
	document.getElementById("PutEnable").disabled = true;
	document.getElementById("PutMark").disabled = true;
}

function moveFirst() {
	if (disableFirst)	return;

	moveFirstCore();
	setTimeout("setGrayOutButton()",1);
}

function moveFirstCore() {
	var nTurn = 0, nUndo = 0;

	while (nextMoveNo > startMoveNo) {
		supposedNextColor = -supposedNextColor;
		if ((nTurn = pos_Pop()) == PASS) {
			nTurn = pos_Pop();
			supposedNextColor = -supposedNextColor;
		}
		undoFlips(nTurn, -supposedNextColor, true);
		nextMoveNo--;
		countStone(supposedNextColor, -(nTurn - nUndo), -1);
	}

	setNextBpNo();
	currentBoardPrint();
	putMarkZebra("a1","transparent");
	printScore(blackCount, whiteCount);
	printNextColor(supposedNextColor);
	printNextMove(nextMoveNo, lastMoveNo);

	var putEnable = document.getElementById("PutEnable").checked;
	if (putEnable) {
		putEnablePrint(PUTMARK, supposedNextColor);
	}
}

function movePrev() {
	if (disablePrev)
		return;

	var nTurn = 0, nUndo = 0;

	if (fStackP <= fStartP)
		return;

	nextMoveNo--;
	setNextBpNo();
	printNextMove(nextMoveNo, lastMoveNo);

	supposedNextColor = -supposedNextColor;
	if ((nTurn = pos_Pop()) == PASS) {
		nTurn = pos_Pop();
		supposedNextColor = -supposedNextColor;
	}

	undoFlips(nTurn, -supposedNextColor, true);

	countStone(supposedNextColor, -(nTurn - nUndo), -1);
	printScore(blackCount, whiteCount);
	printNextColor(supposedNextColor);

	var putMark = document.getElementById("PutMark").checked;
	putMarkErase();
	clearEval();

	if (putMark) {
		if (nextMoveNo > startMoveNo) {
			var ah18 = replayKif.substr((nextMoveNo - startMoveNo -1)*2, 2);
			if (lastmoveMark == "dot")
				putMarkPrint(ah18,PUTMARK,putColor,PUTMARKSIZE);
			else if (lastmoveMark == "num")
				putNumPrint(ah18,String(nextMoveNo-1));
			else
				putMarkZebra(ah18,putColor);
		}
	}

	var putEnable = document.getElementById("PutEnable").checked;
	if (putEnable) {
		putEnablePrint(PUTMARK, supposedNextColor);
	}

	setTimeout("setGrayOutButton()",1);
}

function moveNext() {
	if (disableNext || nextMoveNo > lastMoveNo)
		return;

	moveNextCore();
	setTimeout("setGrayOutButton()",1);
}

function moveNextCore() {
	var ah18 = replayKif.substr((nextMoveNo - startMoveNo)*2, 2);
	var nTurn = putStonePrint(ah18_to_pos(ah18), supposedNextColor);
	var nUndo = 0;

	putMarkErase();
	clearEval();

	countStone(supposedNextColor, nTurn - nUndo, 1);
	printScore(blackCount, whiteCount);

	var putMark = document.getElementById("PutMark").checked;
	if (putMark) {
		if (lastmoveMark == "dot")
			putMarkPrint(ah18,PUTMARK,putColor,PUTMARKSIZE);
		else if  (lastmoveMark == "num")
			putNumPrint(ah18,String(nextMoveNo));
		else
			putMarkZebra(ah18,putColor);
	}

	if (nextMoveNo < lastMoveNo) {
		ah18 = replayKif.substr((nextMoveNo - startMoveNo + 1)*2, 2);
		supposedNextColor = checkNextMove(ah18_to_pos(ah18), supposedNextColor);
		printNextColor(supposedNextColor);
	}
	else {
		supposedNextColor = -supposedNextColor;
		printNextColor(EMPTY);
	}

	nextMoveNo++;
	setNextBpNo();
	printNextMove(nextMoveNo, lastMoveNo);

	var putEnable = document.getElementById("PutEnable").checked;
	if (putEnable) {
		putEnablePrint(PUTMARK, supposedNextColor);
	}
}

function moveLast() {
//	if (disableLast)
//		return;

	var i, nPos = 0, nTurn = 0, nUndo = 0;

	if (currentMode == "trial") {
		nextBpNo = lastMoveNo + 1;
	}

	if (replayKif.length != 0) {
		for (i = nextMoveNo; i < nextBpNo - 1; i++) {
			nPos = ah18_to_pos(replayKif.substr((i-startMoveNo) * 2, 2));
			nTurn = putStoneBoard(nPos, supposedNextColor);
			nUndo = 0;
			countStone(supposedNextColor, nTurn - nUndo, 1);
			nPos = ah18_to_pos(replayKif.substr((i-startMoveNo+1) * 2, 2));
			supposedNextColor = checkNextMove(nPos, supposedNextColor);
		}

		nPos = ah18_to_pos(replayKif.substr((i-startMoveNo) * 2, 2));
		nTurn = putStoneBoard(nPos, supposedNextColor);

		supposedNextColor = -supposedNextColor;
		nextMoveNo = nextBpNo;
	}


	currentBoardPrint();
	if (replayKif.length != 0) {
		var putMark = document.getElementById("PutMark").checked;
		if (putMark) {
			var ah18 = pos_to_ah18(nPos);
			if (lastmoveMark == "dot")
				putMarkPrint(ah18,PUTMARK,putColor,PUTMARKSIZE);
			else if (lastmoveMark == "num")
				putNumPrint(ah18,String(nextBpNo - 1));
			else
				putMarkZebra(ah18,putColor);
		}
	}

	countStone(supposedNextColor, nTurn - nUndo, 1);

	printScore(blackCount, whiteCount);

	if (nextMoveNo > lastMoveNo) {
		printNextColor(EMPTY);
	}
	else {
		printNextColor(supposedNextColor);
	}

	setNextBpNo();
	printNextMove(nextMoveNo, nextBpNo - 1);

	var putEnable = document.getElementById("PutEnable").checked;
	if (putEnable) {
		putEnablePrint(PUTMARK, supposedNextColor);
	}

	setTimeout("setGrayOutButton()",1);
}

function onPutMark() {
	var obj = document.getElementById("PutMark");
	if (obj.checked && (nextMoveNo - startMoveNo) > 0) {
		var ah18 = replayKif.substr((nextMoveNo-startMoveNo-1)*2, 2);
		if (lastmoveMark == "dot")
			putMarkPrint(ah18,PUTMARK,putColor,PUTMARKSIZE);
		else if (lastmoveMark == "num")
			putNumPrint(ah18,String(nextMoveNo-1));
		else
			putMarkZebra(ah18,putColor);
	}
	else if ((replayKif.length > 0) && (currentMode !== "kifu")) {
		var ah18 = replayKif.substr((nextMoveNo-startMoveNo-1)*2, 2);
		if (lastmoveMark == "dot")
			putMarkPrint(ah18,"",putColor,PUTMARKSIZE);
		else if (lastmoveMark == "num")
			putNumPrint(ah18,"");
		else
			putMarkZebra(ah18,"transparent");
	}
}

function onPutEnable() {
	var obj = document.getElementById("PutEnable");
	if (obj.checked) {
		clearEval();
		putEnablePrint(PUTMARK, supposedNextColor);
	}
	else {
		putEnablePrint("", supposedNextColor);
	}
	onPutMark();
}

function onPutTrial(forceChange) {
	var obj = document.getElementById("PutTrial");
	if (obj.checked) {
		document.getElementById("repeat").src = "./image/repeat_out.gif";
		document.getElementById("repeat").style.cursor = "none";
		changeToTrialMode();
	}
	else {
		document.getElementById("repeat").src = "./image/repeat_off.gif";
		document.getElementById("repeat").style.cursor = "pointer";
		returnReplayMode(forceChange);
	}

	setGrayOutButton();
}

function setGrayOutButton() {
	if (currentMode == "kifu") {
		disabledButton(true,true,false,true,true);
		return;
	}

//	if (!solveEnabled || nextMoveNo < solveStart || !isPutEnableAny(supposedNextColor)) {
	if (!solveEnabled || nextMoveNo < solveStart) {
		document.getElementById("solve").disabled = true;
		disableSolve = true;
	}
	else	{
		document.getElementById("solve").disabled = false;
		disableSolve = false;
	}

	if (fStackP <= fStartP) {
		document.getElementById("first").disabled = true;
		document.getElementById("prev").disabled = true;
		disableFirst = true;
		disablePrev = true;
	}
	else {
		document.getElementById("first").disabled = false;
		document.getElementById("prev").disabled = false;
		disableFirst = false;
		disablePrev = false;
	}

	if (nextMoveNo > lastMoveNo) {
		document.getElementById("next").disabled = true;
		document.getElementById("last").disabled = true;
		disableNext = true;
		disableLast = true;
	}
	else	{
		document.getElementById("next").disabled = false;
		document.getElementById("last").disabled = false;
		disableNext = false;
		disableLast = false;
	}
}

function disabledButton(bFirst,bPrev,bKifu,bNext,bLast,bSolve) {
	if (bFirst) {
		document.getElementById("first").disabled = true;
		disableFirst = true;
	}
	else {
		document.getElementById("first").disabled = false;
		disableFirst = false;
	}

	if (bPrev) {
		document.getElementById("prev").disabled = true;
		disablePrev = true;
	}
	else {
		document.getElementById("prev").disabled = false;
		disablePrev = false;
	}

	if (bKifu) {
		document.getElementById("kifu").disabled = true;
		disableKifu = true;
	}
	else	{
		document.getElementById("kifu").disabled = false;
		disableKifu = false;
	}

	if (bNext) {
		document.getElementById("next").disabled = true;
		disableNext = true;
	}
	else	{
		document.getElementById("next").disabled = false;
		disableNext = false;
	}

	if (bLast) {
		document.getElementById("last").disabled = true;
		disableLast = true;
	}
	else	{
		document.getElementById("last").disabled = false;
		disableLast = false;
	}

	if (currentMode != "kifu" && intervalID != null) {
		if (bSolve) {
			document.getElementById("solve").disabled = true;
			disableSolve = true;
		}
		else {
			document.getElementById("solve").disabled = false;
			disableSolve = false;
		}
	}
}

function kifPrint(kifuTbl) {
	var nCol, nMove;

	for (var i = 0; i < 64; i++) {
		if (kifuTbl[i] < -10) {
			nCol = BLACK;
			nMove = -kifuTbl[i] - 10;
		}
		else if (kifuTbl[i] > 10) {
			nCol = WHITE;
			nMove = kifuTbl[i] - 10;
		}
		else {
			nCol = kifuTbl[i];
			nMove = 0;
		}
		printStone(idx_to_pos(i), nCol, nMove);
	}
}

function putMarkPrint(strAH18,strChar,strCol,strSize) {
	var doc = document.getElementById("cell_"+strAH18);

	if (strCol == "reverse") {
		switch (vtBoard[ah18_to_pos(strAH18)]) {
			case BLACK:
				strCol = "white";
				break;
			case WHITE:
				strCol = "black";
				break;
			default:
				strCol = "transparent";
		}
	}

	if (doc) {
		doc.style.fontSize = strSize;
		doc.style.color = strCol;
		doc.innerHTML = strChar;
	}
}

function putNumPrint(strAH18,strNum) {
	var doc = document.getElementById("eval_"+strAH18);

	switch (vtBoard[ah18_to_pos(strAH18)]) {
		case BLACK:
			strCol = "white";
			break;
		case WHITE:
			strCol = "black";
			break;
		default:
			strCol = "transparent";
	}

	if (doc) {
		doc.style.color = strCol;
		doc.innerHTML = strNum;
	}
}

function putMarkZebra(strAH18,strCol) {
	var dotObj = document.getElementById("dot_mark");
	var strAtoH = "abcdefgh";
	var x = strAtoH.search(strAH18.charAt(0));
	var y = parseInt(strAH18.charAt(1)) - 1;

	if (strCol == "reverse") {
		strCol = zebColor;
	}

	dotObj.style.borderColor = strCol;
	dotObj.style.backgroundColor = strCol;
	dotObj.style.top  = String(dot_step_width * y + dot_offset_top)  + "px";
	dotObj.style.left = String(dot_step_width * x + dot_offset_left) + "px";
}

function putMarkErase() {
	var nPos = 0;
	var strAH18 = "";

	for (nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if (vtBoard[nPos] == WALL) continue;
		strAH18 = pos_to_ah18(nPos);
		if (document.getElementById("cell_"+strAH18).innerHTML != "") {
				putMarkPrint(strAH18,"",dotColor,PUTMARKSIZE);
		}
		if (document.getElementById("eval_"+strAH18).innerHTML != "") {
				putNumPrint(strAH18,"",dotColor);
		}
	}
	putMarkZebra("a1","transparent");
}

function putEnablePrint(strChar, nCol) {
	var nPos = 0, bPass = true;
	var strAH18 = "";
	var doc;

	for (nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if(vtBoard[nPos] != EMPTY) continue;
		strAH18 = pos_to_ah18(nPos);
		doc = document.getElementById("cell_"+strAH18);
		if(isColourCanPlaySquare(nPos,nCol) && (currentMode != "kifu")) {
			bPass = false;
			if (doc.innerHTML != strChar)
				putMarkPrint(strAH18,strChar,dotColor,PUTMARKSIZE);
		}
		else if (doc.innerHTML != "") {
				putMarkPrint(strAH18,"",dotColor,PUTMARKSIZE);
		}
	}

	if (bPass) {
		for (nPos = pos_A1; nPos <= pos_H8; nPos++) {
			if(vtBoard[nPos] != EMPTY) continue;
			strAH18 = pos_to_ah18(nPos);
			if(isColourCanPlaySquare(nPos,-nCol) && (currentMode != "kifu")) {
				putMarkPrint(strAH18,strChar,dotColor,PUTMARKSIZE);
			}
		}
	}
}

function checkNextColor(nCol) {
	var nPos = 0;

	for (nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if(vtBoard[nPos] != EMPTY)
			continue;
		if(isColourCanPlaySquare(nPos,-nCol)) {
			return -nCol;
		}
	}

	return PASS;
}

function inputKifString() {
	if (currentMode == "kifu") {
		var inputKif = document.getElementById("KifuText").value;
		inputKif = inputKif.toLowerCase().trimAll();
		if (!(inputKif==null)) {
			switch(checkFormat(inputKif)) {
				case "kifu":
					kifuSet(inputKif, true);
					break;
				case "board":
					boardSet(inputKif)
					break;
			}
		}
	}
}

function checkFormat(inputKif) {
	var format;

	if (inputKif.search(/[^a-hA-H1-8]/i) < 0)
		format = "kifu";
	else if (inputKif.search(/[^*xXoO-]/i) < 0)
		format = "board";
	else
		format = "";

	return format;
}

function kifuSet(inputKif, isDisplay) {
	for (var i = 0; i < 64; i++) {
		dfBoard[i] = EMPTY;
	}
	dfBoard[ah18_to_idx("d4")] = WHITE;
	dfBoard[ah18_to_idx("e4")] = BLACK;
	dfBoard[ah18_to_idx("d5")] = BLACK;
	dfBoard[ah18_to_idx("e5")] = WHITE;
	dfBlackCount = 2;
	dfWhiteCount = 2;
	startColor = BLACK;
	initVirtualBoard();
	initBoardStatus();
	replayKif = checkKifPutEnable(inputKif, supposedNextColor);
	countStone(0,0,0);
	realNumberBlackDiscs = blackCount;
	realNumberWhiteDiscs = whiteCount;
	//alert(inputKif+"\n"+blackCount+"-"+whiteCount);
	document.getElementById("KifuText").select();
	if (isDisplay)
		kifPrint(kifuTable);
	initVirtualBoard();
	initBoardStatus();
	currentMode = "kifu";
	nextMoveSv = nextMoveNo;
	startMoveSv = startMoveNo;
	lastMoveSv = lastMoveNo;
	backupKif = replayKif;
}

function boardSet(strBoard) {
	if (strBoard.length != 65)
		return;

	switch (strBoard.charAt(64)) {
		case '*':
		case 'x':
		case 'X':
			startColor = BLACK;
			break;
		case 'o':
		case 'O':
			startColor = WHITE;
			break;
		default:
			return;
	}

	dfBlackCount = 0;
	dfWhiteCount = 0;
	var strCol;
	for (var i = 0; i < 64; i ++) {
		strCol = strBoard.charAt(i);
		switch (strCol) {
			case '*':
			case 'x':
			case 'X':
				dfBoard[i] = BLACK;
				dfBlackCount++;
				break;
			case 'o':
			case 'O':
				dfBoard[i] = WHITE;
				dfWhiteCount++;
				break;
			default:
				dfBoard[i] = EMPTY;
		}
	}

	replayKif = "";
	backupKif = "";
	initVirtualBoard();
	initBoardStatus();
	currentMode = "kifu";
	kifuAndReturn(true);
}

function kifuAndReturn(isDisplay) {
	switch (currentMode) {
	case "replay":
		document.getElementById("repeat").src = "./image/repeat_out.gif";
		document.getElementById("repeat").style.cursor = "none";
		previousMode = "replay";
		changeToKifuMode(isDisplay);
		break;
	case "trial":
		document.getElementById("repeat").src = "./image/repeat_out.gif";
		document.getElementById("repeat").style.cursor = "none";
		previousMode = "trial";
		changeToKifuMode(isDisplay);
		break;
	case "kifu":
		if (isDisplay)
			currentBoardPrint();
		switchScorePanel("score");
		currentMode = previousMode;
		printScore(blackCount, whiteCount);
		printNextColor(supposedNextColor);
		printNextMove(nextMoveNo, lastMoveNo);
		if (currentMode == "replay") {
			document.getElementById("PutTrial").checked = false;
			document.getElementById("repeat").src = "./image/repeat_off.gif";
			document.getElementById("repeat").style.cursor = "pointer";
		}
		else {
		 	document.getElementById("PutTrial").checked = true;
			var nCol = checkNextColor(supposedNextColor);
			if (nCol != PASS) {
				printNextMove(nextMoveNo, nextMoveNo);
			}
		}
		document.getElementById("kifu").value = "diag.";
		document.getElementById("PutEnable").disabled = false;
		document.getElementById("PutMark").disabled = false;
		var putEnable = document.getElementById("PutEnable").checked;
		if (putEnable) {
			putEnablePrint(PUTMARK, supposedNextColor);
		}

		break;
	default:
		break;
	}

	onPutMark(); // To display last move mark/number

	setTimeout("setGrayOutButton()",1);
}

function switchScorePanel(strMode) {
	var strHCML = "";

	switch (strMode) {
	case "score" :
        strHCML = '<div id="BlackFrame"><span id="BlackStone">●</span><span id="BlackCount"></span></div>'
                + '<div id="WhiteFrame"><span id="WhiteStone">●</span><span id="WhiteCount"></span></div>'
                + '<div id="NextMove">&gt;<span id="MoveNo">--</span></div>'
                + '<input type="checkbox" id="PutTrial" onclick="onPutTrial(false);" /><span id="PutCheck">Put</span>';
        if (solveStart == 61) {
        	strHCML = strHCML + '<input type="button" value="---" id="solve" onclick="getResult();" />';
				}
				else {
        	strHCML = strHCML + '<input type="button" value="A I" id="solve" onclick="getResult();" />';
				}
		break;
	case "kifu" :
		strHCML = '<input type="text" id="KifuText" onClick="this.select();" onchange="setButtonOn();" onPaste="setButtonOn();" />'
				+ '<input type="button" value="SET" id="SetKifu" onClick="inputKifString();" disabled="true" />';
		break;
	case "auto" :
        strHCML = '<div id="BlackFrame"><span id="BlackStone">●</span><span id="BlackCount"></span></div>'
                + '<div id="WhiteFrame"><span id="WhiteStone">●</span><span id="WhiteCount"></span></div>'
                + '<div id="NextMove">Next<span id="MoveNo">--</span></div>'
                + '<div id="Loop">Auto</div>';
		break;
	default:
		alert("Error: switchScorePanel()");
	}

	document.getElementById("score_panel").innerHTML = strHCML;
	setLanguage();
}

function setButtonOn() {
	document.getElementById("SetKifu").disabled = false;
}

function initBtnChkOnOff() {
	if (nextBpNo > 0 && nextBpNo <= lastMoveNo) {
		document.getElementById("last").value = ">" + nextBpNo;
	}
	disabledButton(false,false,false,false,false);
 	document.getElementById("PutTrial").checked = (putTrial == "ON" ? true : false);
 	document.getElementById("PutMark").checked = (putMark == "ON" ? true : false);
 	document.getElementById("PutEnable").checked = (putEnable == "ON" ? true : false);
 	if (putMark == "ON") {
 		onPutMark();
 	}
}

function selectCSS() {
 	var tagString = document.createElement('link');
	tagString.rel = 'stylesheet';
	tagString.type = 'text/css';

	switch (strSize.toUpperCase()) {
		case "SS":
			tagString.href = STYLEPATH + "hamsizeSS.css";
			dot_offset_top = 15;
			dot_offset_left = 2;
			dot_step_width = 18;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		case "S":
			tagString.href = STYLEPATH + "hamsize_S.css";
			dot_offset_top = 17;
			dot_offset_left = 2;
			dot_step_width = 20;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		case "M":
			tagString.href = STYLEPATH + "hamsize_M.css";
			dot_offset_top = 18;
			dot_offset_left = 2;
			dot_step_width = 22;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		case "L":
			tagString.href = STYLEPATH + "hamsize_L.css";
			dot_offset_top = 21;
			dot_offset_left = 2;
			dot_step_width = 25;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		case "XL":
			tagString.href = STYLEPATH + "hamsizeXL.css";
			dot_offset_top = 24;
			dot_offset_left = 3;
			dot_step_width = 29;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		case "EL":
			tagString.href = STYLEPATH + "hamsizeEL.css";
			dot_offset_top = 28;
			dot_offset_left = 3;
			dot_step_width = 34;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
			break;
		default  :
			tagString.href = STYLEPATH + "hamsize_S.css";
			dot_offset_top = 17;
			dot_offset_left = 2;
			dot_step_width = 20;
			discImg[0] = discSrc[0][0];
			discImg[1] = discSrc[0][1];
			discImg[2] = discSrc[0][2];
	}

	document.body.appendChild(tagString);
}

function adjustCSS() {
 	var tagString = document.createElement('script');
	tagString.type = "text/javascript";

	switch (checkPlatform()) {
	case "ANDROID":
		Android_browser();
		break;
	case "IPHONE":
		iOS_browser();
		break;
	case "MACOSX":
		macosx_browser();
		break;
	case "LINUX":
		linux_browser();
		break;
	case "WINDOWS":
		switch (checkBrowserName()) {
			case "MSIE6":
				document.write('#op_button { padding-top:1px; }');
				document.write('.x_corner { overflow:hidden; }');
				break;
			case "MSIE7":
				document.write('<style type="text/css">');
				document.write('#op_button { padding-top:1px; }');
				if (strSize.toUpperCase() == "SS") {
					document.write('.ham_eval { padding: 3px 0px 0px 2px; }');
				}
				else	if (strSize.toUpperCase() == "S") {
					document.write('.ham_eval { padding: 3px 0px 0px 2px; }');
					document.write('#NextMove { top: 7px; }');
				}
				else if (strSize.toUpperCase() == "M") {
					document.write('.ham_eval { padding: 3px 0px 0px 2px; }');
				}
				document.write('</style>');
				break;
			case "CHROME":
				chrome_browser();
				break;
			case "FIREFOX":
				firefox_browser();
				break;
			case "SAFARI":
				safari_browser();
				break;
			case "OPERA":
				opera_browser();
				break;
			default:
				;
		}
		break;
	default:
		;
	}
}

function checkPlatform() {
	var webBrowser = navigator.userAgent;
	var platform = "OTHER";

	if (webBrowser.match(/iPhone/i) || webBrowser.match(/iPod/i)) {
		platform = "IPHONE";
	}
	else if (webBrowser.match(/Android/i)) {
		platform = "ANDROID";
	}
	else if (webBrowser.match(/Windows/i)) {
		platform = "WINDOWS";
	}
	else if (webBrowser.match(/Linux/i)) {
		platform = "LINUX";
	}
	 else if (webBrowser.match(/Mac OS X/i)) {
		platform = "MACOSX";
	}

	return platform;
}

function checkBrowserName() {
	var webBrowser = navigator.userAgent;
	var browserName = "OTHER";

	if (webBrowser.match(/iPhone/i) || webBrowser.match(/iPod/i) || webBrowser.match(/iPad/i)) {
		browserName = "IPHONE";
	}
	else if (webBrowser.match(/Mobile Safari/i)) {
		browserName = "ANDROID";
	}
	else if (webBrowser.match(/MSIE [6].[0-9]/i)) {
		browserName = "MSIE6";
	}
	else if (webBrowser.match(/MSIE [7].[0-9]/i)) {
		browserName = "MSIE7";
	}
	 else if (webBrowser.match(/MSIE/i)) {
		browserName = "MSIE8";
	}
	else if (webBrowser.match(/Opera/i)) {
		browserName = "OPERA";
	}
	else if (webBrowser.match(/Firefox/i)) {
		browserName = "FIREFOX";
	}
	else if (webBrowser.match(/Chrome/i)) {
		browserName = "CHROME";
	}
	else if (webBrowser.match(/Safari/i)) {
		browserName = "SAFARI";
	}

	return browserName;
}

function chrome_browser() {
	document.write('<style type="text/css">');
	switch (strSize.toUpperCase()) {
		case "SS":
			document.write('.ham_eval { padding: 4px 0px 0px 2px; }');
			document.write('#PutCheck { top:  4px; left: 108px; }');
			break;
		case 'S':
			document.write('#PutCheck { top:  2px; left: 118px; }');
			break;
		case 'M':
			document.write('#PutCheck { top:  5px; left: 132px; }');
			break;
		case "L":
			document.write('#PutCheck { top:  5px; left: 146px; }');
			document.write('.ham_eval { padding: 6px 0px 0px 2px; }');
			break;
		case "XL":
			document.write('.ham_eval { padding: 6px 0px 0px 1px; }');
			break;
	}
	document.write('</style>');
}

function firefox_browser() {
	document.write('<style type="text/css">');
	switch (strSize.toUpperCase()) {
		case "SS":
			document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
			break;
		case "L":
			document.write('.ham_eval { padding: 5px 0px 0px 2px; }');
			document.write('#PutCheck { top:  5px; }');
			break;
		case "XL":
			document.write('.ham_eval { padding: 7px 0px 0px 1px; }');
			document.write('#PutTrial { top:  7px; }');
			break;
		case "EL":
			document.write('.ham_eval { padding: 7px 0px 0px 2px; }');
			document.write('#PutTrial { top:  8px; }');
			break;
	}
	document.write('</style>');
}

function safari_browser() {
	document.write('<style type="text/css">');
	switch (strSize.toUpperCase()) {
		case "SS":
			document.write('#PutTrial { left: 96px; }');
			document.write('#PutCheck { left: 110px; }');
		break;
		case "L":
			document.write('#PutTrial { top:  8px;  left: 132px; }');
			break;
	}
	document.write('</style>');
}

function opera_browser() {
	document.write('<style type="text/css">');
	switch (strSize.toUpperCase()) {
		case "SS":
			document.write('.ham_eval { padding: 3px 0px 0px 3px; }');
			break;
		case "L":
			document.write('#PutCheck { top:  5px; }');
			break;
		case "XL":
			document.write('.ham_eval { padding: 8px 0px 0px 3px; }');
			document.write('#PutTrial { top:  6px; }');
			document.write('#checkPM  { top:20px; }');
			document.write('#checkPE  { top:38px; }');
			break;
		case "EL":
			document.write('#PutTrial { top:  7px; }');
			document.write('#checkPM  { top:23px; }');
			document.write('#checkPE  { top:43px; }');
			break;
	}
	document.write('</style>');
}

function linux_browser() {
	switch (checkBrowserName()) {
	case "OPERA":
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:8px; line-height:11px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:13px; }');
				document.write('.y_char { font-size:13px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; left: 70px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#repeat   { top:  3px; }');
				document.write('#checkPM  { top: 13px; }');
				document.write('#checkPE  { top: 28px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:10px; line-height:13px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:14px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left: 120px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:12px; line-height:15px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:8px; left: 134px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#BlackFrame { line-height:19px; }');
				document.write('#WhiteFrame { line-height:19px; }');
				break;
			case "XL":
				document.write('.ham_disc { padding: 3x 0px 0px 3px; }');
				document.write('.ham_eval { font-size:15px; line-height:17px; padding: 6px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:7px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top:  3px; }');
				document.write('#checkPM  { top: 20px; }');
				document.write('#checkPE  { top: 38px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:17px; line-height:20px; padding: 7px 0px 0px 1px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:13px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:8px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top:  3px; }');
				document.write('#checkPM  { top: 22px; }');
				document.write('#checkPE  { top: 42px; }');
				break;
			case "S":
			default:
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:10px; line-height:13px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left: 105px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#BlackFrame { line-height:16px; }');
				document.write('#WhiteFrame { line-height:16px; }');
		}
		document.write('</style>');
		break;
	case "CHROME":
		PUTMARK = "+";
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:15px; }');
				document.write('.ham_eval { font-size:9px; line-height:11px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:13px; }');
				document.write('.y_char { font-size:13px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; left:70px; }');
				document.write('#PutTrial { top:6px; left:96px; }');
				document.write('#PutCheck { top:4px; left:108px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:18px; }');
				document.write('.ham_eval { font-size:9px; line-height:12px; padding: 4px 0px 0px 1px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { font-size:13px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:5px; left:106px; }');
				document.write('#PutCheck { top:1px; left:118px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:18px; }');
				document.write('.ham_eval { font-size:11px; line-height:13px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:15px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left:120px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:24px; }');
				document.write('.ham_eval { font-size:12px; line-height:15px; padding: 6px 0px 0px 2px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left:136px; }');
				document.write('#PutCheck { top: 5px; left: 149px;}');
				document.write('#KifuText { font-size:16px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:32px; }');
				document.write('.ham_eval { font-size:16px; line-height:20px; padding: 8px 0px 0px 1px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:13px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:8px; left:180px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:26px; }');
				document.write('.ham_eval { font-size:13px; line-height:17px; padding: 6px 0px 0px 1px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left:157px; }');
				document.write('#PutCheck { top:5px; left:172px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:20px; }');
				document.write('#WhiteFrame { line-height:20px; }');
				break;
		}
		document.write('</style>');
		break;
	case "FIREFOX":
	default:	//Other linux browser
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:8px; line-height:11px; padding: 3px 0px 0px 1px; }');
				document.write('.x_char { font-size:12px; }');
				document.write('.y_char { font-size:12px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#NextMove { top: 5px;left: 69px; }');
				document.write('#PutTrial { top:4px; }');
				document.write('#PutCheck { top:3px; }');
				document.write('#first { width:28px; height:23px; font-size:11px; }');
				document.write('#prev  { width:28px; height:23px; font-size:11px; }');
				document.write('#kifu  { width:47px; height:23px; font-size:11px; }');
				document.write('#next  { width:28px; height:23px; font-size:11px; }');
				document.write('#last  { width:28px; height:23px; font-size:11px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:9px; line-height:12px; padding: 3px 0px 0px 1px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { font-size:13px; }');
//				document.write('#y-coordinate { margin-top:3px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:5px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:11px; line-height:13px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:15px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:6px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:11px; line-height:15px; padding: 6px 0px 0px 1px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:7px; left: 133px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:14px; line-height:20px; padding: 7px 0px 0px 1px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:12px; }');
				document.write('#PutTrial { top:8px; left: 179px;}');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:13px; line-height:19px; padding: 5px 0px 0px 1px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { left: 156px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:20px; }');
				document.write('#WhiteFrame { line-height:20px; }');
				break;
		}
		document.write('</style>');
	}
}

function macosx_browser() {
	switch (checkBrowserName()) {
	case "CHROME":
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:16px; }');
				document.write('.ham_eval { font-size:8px; line-height:12px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:13px; }');
				document.write('.y_char { font-size:13px; }');
				document.write('#score_panel { font-size:12px; margin-top: 1px;}');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:6px; left:71px; }');
				document.write('#PutTrial { top:6px; left:  96px; }');
				document.write('#PutCheck { top:4px; left: 109px; }');
				document.write('#solve { margin-top: 2px; font-size:11px;}');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { top:3px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:12px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top: 7px; }');
				document.write('#checkPE  { top:22px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:18px; }');
				document.write('.ham_eval { font-size:9px; line-height:14px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { margin-top: 1px; font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; left:77px; }');
				document.write('#PutTrial { top:7px; left: 105px; }');
				document.write('#PutCheck { top:4px; left: 118px; }');
				document.write('#solve { margin-top: 3px; font-size:14px;}');
				document.write('#Loop { top:2px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#SetKifu { top:3px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:12px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top: 9px; }');
				document.write('#checkPE  { top:24px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:20px; }');
				document.write('.ham_eval { font-size:10px; line-height:14px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:14px;  margin-top: 2px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top: 5px; left:85px; }');
				document.write('#PutTrial { top:7px; }');
				document.write('#PutCheck { top:5px; left: 132px; }');
				document.write('#solve { margin-top: 3px; font-size:15px;}');
				document.write('#Loop { top:2px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#SetKifu { top:4px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:14px; padding-top: 1px; }');
				document.write('#checkPM  { top:10px; }');
				document.write('#checkPE  { top:25px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:23px; }');
				document.write('.ham_eval { font-size:12px; line-height:15px; padding: 6px 0px 0px 2px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top: 8px; left:133px; }');
				document.write('#PutCheck { top:5px; left: 147px; }');
				document.write('#solve { margin-top: 2px; font-size:16px;}');
				document.write('#Loop { top:2px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#SetKifu { top:4px; }');
				document.write('#BlackFrame { line-height:19px; }');
				document.write('#WhiteFrame { line-height:19px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:15px; padding-top: 0px; }');
				document.write('#checkPM  { top:10px; }');
				document.write('#checkPE  { top:25px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:32px; }');
				document.write('.ham_eval { font-size:15px; line-height:21px; padding: 7px 0px 0px 1px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:13px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:8px; left: 180px; }');
				document.write('#PutCheck { top:4px; left: 196px; }');
				document.write('#solve { margin-top: 3px; font-size:22px;}');
				document.write('#Loop { top:0px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#SetKifu { top: 4px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:17px; padding-top: 0px; }');
				document.write('#checkPM  { top:14px; }');
				document.write('#checkPE  { top:31px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:26px; }');
				document.write('.ham_eval { font-size:14px; line-height:18px; padding: 6px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:7px; left: 157px; }');
				document.write('#PutCheck { top:5px; left: 173px; }');
				document.write('#solve { margin-top: 3px; font-size:18px;}');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#SetKifu { top:5px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 0px; }');
				document.write('#checkPM  { top:10px; }');
				document.write('#checkPE  { top:26px; }');
				break;
		}
		document.write('</style>');
		break;
	case "FIREFOX":
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:8px; line-height:11px; padding: 3px 0px 0px 2px; }');
				document.write('.x_char { font-size:12px; }');
				document.write('.y_char { font-size:12px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 5px; }');
				document.write('#PutCheck { top: 3px; left: 108px; }');
				document.write('#solve { margin-top: 1px; font-size:10px;}');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { font-size:9px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:12px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top: 8px; }');
				document.write('#checkPE  { top:23px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:9px; line-height:12px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { font-size:13px; }');
//				document.write('#y-coordinate { margin-top:3px; }');
				document.write('#NextMove { top: 5px; left: 77px; }');
				document.write('#PutTrial { top: 5px; left: 105px; }');
				document.write('#PutCheck { top: 2px; left: 118px; }');
				document.write('#Loop { top:0px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:12px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:10px; }');
				document.write('#checkPE  { top:25px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:10px; line-height:15px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:14px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 6px; left: 119px; }');
				document.write('#PutCheck { top: 5px; left: 132px; }');
				document.write('#solve { margin-top: 1px; font-size:12px;}');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:14px; height:15px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:14px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:11px; }');
				document.write('#checkPE  { top:26px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:11px; line-height:15px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 7px; left: 133px; }');
				document.write('#PutCheck { top: 5px; left: 148px; }');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:15px; padding-top: 0px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:11px; }');
				document.write('#checkPE  { top:26px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:15px; line-height:20px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:12px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 6px; left: 179px; }');
				document.write('#PutCheck { top: 4px; left: 195px; }');
				document.write('#Loop { top:0px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:17px; padding-top: 0px; }');
				document.write('#checkPM  { top:15px; }');
				document.write('#checkPE  { top:35px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:13px; line-height:19px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 6px; left: 156px; }');
				document.write('#PutCheck { top: 5px; left: 172px; }');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:20px; }');
				document.write('#WhiteFrame { line-height:20px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 1px; }');
				document.write('#checkPM  { top:12px; }');
				document.write('#checkPE  { top:29px; }');
				break;
		}
		document.write('</style>');
		break;
	case "OPERA":
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:17px; }');
				document.write('.ham_eval { font-size:8px; line-height:13px; padding: 3px 0px 0px 2px; }');
				document.write('.x_char { font-size:13px; }');
				document.write('.y_char { font-size:13px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:6px; left: 69px; }');
				document.write('#PutTrial { top: 5px; left: 94px; }');
				document.write('#PutCheck { top: 4px; left: 108px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#repeat   { top: 3px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:11px; padding-top: 3px; }');
				document.write('#checkPM  { top:13px; }');
				document.write('#checkPE  { top:28px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:20px; }');
				document.write('.ham_eval { font-size:9px; line-height:13px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#score_panel { font-size:13px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top: 6px; left: 74px; }');
				document.write('#PutTrial { top: 5px; left: 103px;}');
				document.write('#PutCheck { top: 2px; left: 117px;}');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#BlackFrame { line-height:16px; }');
				document.write('#WhiteFrame { line-height:16px; }');
				document.write('#repeat   { top: 3px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:11px; padding-top: 2px; }');
				document.write('#checkPM  { top:17px; }');
				document.write('#checkPE  { top:32px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:22px; }');
				document.write('.ham_eval { font-size:10px; line-height:13px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#score_panel { font-size:15px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top: 6px; }');
				document.write('#PutCheck { top: 5px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				document.write('#repeat   { top: 3px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:13px; padding-top: 1px; }');
				document.write('#checkPM  { top:19px; }');
				document.write('#checkPE  { top:35px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:27px; }');
				document.write('.ham_eval { font-size:12px; line-height:16px; padding: 5px 0px 0px 3px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:6px; }');
				document.write('#NextMove { top: 5px; left: 93px; }');
				document.write('#PutTrial { top: 6px; }');
				document.write('#PutCheck { top: 5px; left: 146px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#repeat   { top: 3px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:14px; padding-top: 1px; }');
				document.write('#checkPM  { top:18px; }');
				document.write('#checkPE  { top:35px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:37px; }');
				document.write('.ham_eval { font-size:15px; line-height:20px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:13px; }');
				document.write('#NextMove { top: 6px; }');
				document.write('#PutTrial { top: 8px; }');
				document.write('#PutCheck { top: 5px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:22px; }');
				document.write('#WhiteFrame { line-height:22px; }');
				document.write('#repeat   { top: 2px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 1px; }');
				document.write('#checkPM  { top:22px; }');
				document.write('#checkPE  { top:42px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; line-height:31px; }');
				document.write('.ham_eval { font-size:13px; line-height:18px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top: 5px; }');
				document.write('#PutTrial { top: 6px; }');
				document.write('#PutCheck { top: 5px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#repeat   { top: 3px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:15px; padding-top: 1px; }');
				document.write('#checkPM  { top:20px; }');
				document.write('#checkPE  { top:38px; }');
				break;
		}
		document.write('</style>');
		break;
	case "SAFARI":
	default: //Other Mac browser
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:16px; }');
				document.write('.ham_eval { font-size:8px; line-height:12px; padding: 4px 0px 0px 1px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#BlackFrame { line-height:16px; }');
				document.write('#WhiteFrame { line-height:16px; }');
				document.write('#score_panel { font-size:11px; margin-top: 3px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:5px; left: 96px;}');
				document.write('#PutCheck { top:3px; }');
				document.write('#solve { margin-top: 2px; font-size:11px;}');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { font-size:8px; top:5px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:13px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top: 9px; }');
				document.write('#checkPE  { top:24px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; line-height:18px; }');
				document.write('.ham_eval { font-size:9px; line-height:13px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:3px; }');
				document.write('#NextMove { top:6px; }');
				document.write('#PutTrial { margin-top: 1px; }');
				document.write('#PutCheck { margin-top: 2px; left: 117px; }');
				document.write('#solve { margin-top: 3px; }');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { font-size:9px; top:5px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:13px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:10px; }');
				document.write('#checkPE  { top:26px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:10px; line-height:14px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#BlackFrame { line-height:19px; }');
				document.write('#WhiteFrame { line-height:19px; }');
				document.write('#score_panel { font-size:14px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#PutTrial { top:7px; left: 119px; }');
				document.write('#solve { margin-top: 3px; font-size:15px;}');
				document.write('#Loop { top:3px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#SetKifu { font-size:10px; top:5px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:14px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:11px; }');
				document.write('#checkPE  { top:27px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 3px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:12px; line-height:15px; padding: 6px 0px 0px 1px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#BlackFrame { line-height:20px; }');
				document.write('#WhiteFrame { line-height:20px; }');
				document.write('#score_panel { font-size:15px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:6px; }');
				document.write('#PutTrial { top:8px; left: 133px; }');
				document.write('#PutCheck { top:5px; left: 147px; }');
				document.write('#solve { margin-top: 2px; font-size:16px;}');
				document.write('#Loop { top:2px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#SetKifu { font-size:11px; top:4px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:15px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:11px; }');
				document.write('#checkPE  { top:26px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 3px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:15px; line-height:22px; padding: 7px 0px 0px 1px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#score_panel { font-size:19px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#PutTrial { top:7px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#solve { margin-top: 3px; font-size:18px;}');
				document.write('#Loop { top:1px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#SetKifu { font-size:13px; top:5px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:18px; padding-top: 0px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:16px; }');
				document.write('#checkPE  { top:33px; }');
				break;
			case "XL":
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:14px; line-height:19px; padding: 6px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#score_panel { font-size:17px; }');
//				document.write('#y-coordinate { margin-top:9px; }');
				document.write('#NextMove { top:5px; }');
				document.write('#PutTrial { top:7px; left: 156px; }');
				document.write('#solve { margin-top: 3px; font-size:17px;}');
				document.write('#Loop { top:2px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#SetKifu { font-size:12px; top:5px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 1px; }');
				document.write('#repeat   { top: 0px; }');
				document.write('#checkPM  { top:12px; }');
				document.write('#checkPE  { top:28px; }');
				break;
		}
		document.write('</style>');
	}
}

function iOS_browser() {
	switch (checkBrowserName()) {
	case "IPHONE":
	default:
		document.write('<style type="text/css">');
		switch (strSize.toUpperCase()) {
			case "SS":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:8px; line-height:11px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:12px; }');
				document.write('.y_char { font-size:12px; }');
				document.write('#BlackFrame { line-height:15px; }');
				document.write('#WhiteFrame { line-height:15px; }');
				document.write('#score_panel { font-size:11px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:5px; line-height:13px; }');
				document.write('#PutTrial { top:6px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#solve { font-size:8px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { font-size:8px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:13px; padding-top: 1px; }');
				break;
			case "S":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:9px; line-height:12px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:14px; }');
				document.write('.y_char { font-size:14px; }');
				document.write('#BlackFrame { line-height:17px; }');
				document.write('#WhiteFrame { line-height:17px; }');
				document.write('#score_panel { font-size:12px; }');
//				document.write('#y-coordinate { margin-top:3px; }');
				document.write('#NextMove { top:6px; line-height:14px; }');
				document.write('#PutTrial { top:6px; }');
				document.write('#PutCheck { top:1px; }');
				document.write('#solve { font-size:9px; }');
				document.write('#KifuText { font-size:13px; }');
				document.write('#SetKifu { font-size:9px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:13px; padding-top: 1px; }');
				break;
			case "M":
				document.write('.ham_disc { padding: 2px 0px 0px 2px; }');
				document.write('.ham_eval { font-size:9px; line-height:14px; padding: 4px 0px 0px 2px; }');
				document.write('.x_char { font-size:15px; }');
				document.write('.y_char { font-size:15px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#score_panel { font-size:13px; }');
//				document.write('#y-coordinate { margin-top:4px; }');
				document.write('#NextMove { top:4px; line-height:17px; }');
				document.write('#PutTrial { top:7px; left: 120px; }');
				document.write('#PutCheck { top:5px; }');
				document.write('#solve { font-size:10px; }');
				document.write('#KifuText { font-size:14px; }');
				document.write('#SetKifu { font-size:10px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:14px; padding-top: 1px; }');
				break;
			case "L":
				document.write('.ham_disc { padding: 2px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:11px; line-height:15px; padding: 5px 0px 0px 2px; }');
				document.write('.x_char { font-size:16px; }');
				document.write('.y_char { font-size:16px; }');
				document.write('#BlackFrame { line-height:18px; }');
				document.write('#WhiteFrame { line-height:18px; }');
				document.write('#score_panel { font-size:16px; }');
//				document.write('#y-coordinate { margin-top:5px; }');
				document.write('#NextMove { top:5px; line-height:15px; }');
				document.write('#PutTrial { top:7px; left: 133px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#solve { font-size:12px; }');
				document.write('#KifuText { font-size:15px; }');
				document.write('#SetKifu { font-size:11px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:15px; padding-top: 1px; }');
				break;
			case "XL":
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:13px; line-height:16px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:9px; }');
				document.write('#NextMove { top:5px; line-height:17px; }');
				document.write('#PutTrial { top:7px; left: 157px;}');
				document.write('#PutCheck { top:5px; }');
				document.write('#solve { font-size:14px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#SetKifu { font-size:12px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 1px; }');
				break;
			case "EL":
				document.write('.ham_disc { padding: 2px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:15px; line-height:19px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:18px; }');
				document.write('.y_char { font-size:18px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#score_panel { font-size:20px; }');
//				document.write('#y-coordinate { margin-top:11px; }');
				document.write('#NextMove { top:5px; line-height:16px; }');
				document.write('#KifuText { font-size:17px; }');
				document.write('#PutTrial { top:7px; }');
				document.write('#PutCheck { top:4px; }');
				document.write('#SetKifu { font-size:13px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:18px; padding-top: 0px; }');
				break;
			default:
				document.write('.ham_disc { padding: 3px 0px 0px 3px; }');
				document.write('.ham_eval { font-size:13px; line-height:16px; padding: 7px 0px 0px 2px; }');
				document.write('.x_char { font-size:17px; }');
				document.write('.y_char { font-size:17px; }');
				document.write('#BlackFrame { line-height:21px; }');
				document.write('#WhiteFrame { line-height:21px; }');
				document.write('#score_panel { font-size:18px; }');
//				document.write('#y-coordinate { margin-top:9px; }');
				document.write('#NextMove { top:5px; line-height:17px; }');
				document.write('#PutTrial { top:7px; left: 157px;}');
				document.write('#PutCheck { top:5px; }');
				document.write('#solve { font-size:14px; }');
				document.write('#KifuText { font-size:16px; }');
				document.write('#SetKifu { font-size:12px; }');
				document.write('#first, #prev, #kifu, #next, #last { font-size:16px; padding-top: 1px; }');
				break;
		}
		document.write('</style>');
	}
}

function Android_browser() {
	document.write('<style type="text/css">');
	switch (strSize.toUpperCase()) {
		case "SS":
			document.write('#NextMove { left: 69px; }');
			document.write('#solve { font-size:8px; margin-top: 0px; }');
			document.write('#KifuText { font-size:13px; }');
			document.write('#SetKifu { font-size:8px; }');
			document.write('#first { font-size:10px; }');
			document.write('#prev  { font-size:10px; }');
			document.write('#kifu  { font-size:10px; }');
			document.write('#next  { font-size:10px; }');
			document.write('#last  { font-size:10px; }');
			document.write('#checkPM  { top:13px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:8px; padding-left: 1px; }');
					document.write('#score_panel { font-size:12px; }');
					document.write('#checkPM  { top:14px; }');
					document.write('#checkPE  { top:27px; }');
					document.write('#NextMove { left: 68px; }');
					document.write('#PutTrial { top:5px; left:97px; }');
					document.write('#PutCheck { top:4px; left:109px; }');
					break;
				case "OPERA":
					document.write('.ham_eval { font-size:9px; padding: 3px 0px 0px 2px; }');
					document.write('#PutTrial { top:5px; }');
					document.write('#PutCheck { top:4px; left: 109px; }');
					document.write('#BlackFrame { top:1px; }');
					document.write('#WhiteFrame { top:1px; }');
					document.write('#NextMove   { top:5px; }');
					break;
				default:
					document.write('#PutTrial { top:0px; left:94px; }');
					document.write('#PutCheck { top:4px; left:110px; }');
					document.write('.ham_eval { font-size:10px; line-height:14px; }');
			}
			break;
		case "M":
			document.write('#PutCheck { top:6px; left:135px }');
			document.write('#solve { margin-top: 0px; }');
			document.write('#Loop { top:4px; }');
			document.write('#KifuText { font-size:14px; }');
			document.write('#SetKifu { font-size:10px; }');
			document.write('#first { font-size:12px; }');
			document.write('#prev  { font-size:12px; }');
			document.write('#kifu  { font-size:12px; }');
			document.write('#next  { font-size:12px; }');
			document.write('#last  { font-size:12px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:10px; }');
					document.write('#score_panel { font-size:15px; }');
					document.write('#NextMove { left: 81px; }');
					document.write('#PutTrial { top:6px; left:118px; }');
					document.write('#PutCheck { top:6px; left:131px; }');
					break;
				case "OPERA":
					document.write('#PutTrial { top:8px; }');
					break;
				default:
					document.write('#PutTrial { top:3px; }');
					document.write('.ham_eval { line-height:15px; }');
			}
			break;
		case "L":
			document.write('.ham_eval { padding: 7px 0px 0px 3px; }');
			document.write('#PutCheck { top:6px; left:149px; }');
			document.write('#solve { margin-top: 0px; }');
			document.write('#KifuText { font-size:15px; }');
			document.write('#Loop { top:4px; }');
			document.write('#SetKifu { font-size:11px; }');
			document.write('#first { font-size:13px; }');
			document.write('#prev  { font-size:13px; }');
			document.write('#kifu  { font-size:13px; }');
			document.write('#next  { font-size:13px; }');
			document.write('#last  { font-size:13px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:12px; padding-left: 2px; }');
					document.write('#NextMove { left: 90px; }');
					document.write('#PutTrial { top:8px; left:134px; }');
					document.write('#PutCheck { top:5px; left:148px; }');
					document.write('#Loop { top:3px; }');
					break;
				case "OPERA":
					document.write('.ham_eval { padding: 5px 0px 0px 3px; }');
					document.write('#PutTrial { top:8px; left: 132px; }');
					break;
				default:
					document.write('#PutTrial { top:3px; }');
					document.write('.ham_eval { font-size:14px; line-height:14px; }');
			}
			break;
		case "XL":
			document.write('.ham_eval { padding: 8px 0px 0px 3px; }');
			document.write('#PutCheck { top:5px; left:173px; }');
			document.write('#solve { margin-top: 0px; }');
			document.write('#Loop { top:4px; }');
			document.write('#KifuText { font-size:16px; }');
			document.write('#SetKifu { font-size:12px; }');
			document.write('#first { font-size:15px; }');
			document.write('#prev  { font-size:15px; }');
			document.write('#kifu  { font-size:15px; }');
			document.write('#next  { font-size:15px; }');
			document.write('#last  { font-size:15px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:13px; padding-left: 2px; }');
					document.write('#checkPM  { top:21px; }');
					document.write('#checkPE  { top:39px; }');
					document.write('#NextMove { top:5px; left: 93px; }');
					document.write('#PutTrial { top:5px; left:155px; }');
					document.write('#PutCheck { top:4px; left:172px; }');
					document.write('#Loop { top:2px; }');
					break;
				case "OPERA":
					document.write('#NextMove   { top:6px; left: 130}');
					document.write('#PutTrial { top:9px; }');
					document.write('#Loop { top:3px; }');
					document.write('.ham_eval { font-size:15px; padding: 6px 0px 0px 2px; }');
					break;
				default:
					document.write('#PutTrial { top:3px; }');
					document.write('.ham_eval { font-size:14px; line-height:16px; }');
			}
			break;
		case "EL":
			document.write('#Loop { top:2px; }');
			document.write('#KifuText { font-size:17px; }');
			document.write('#PutCheck { top:5px; left:196px; }');
			document.write('#solve { margin-top: 0px; }');
			document.write('#SetKifu { font-size:13px; }');
			document.write('#first { font-size:17px; }');
			document.write('#prev  { font-size:17px; }');
			document.write('#kifu  { font-size:17px; }');
			document.write('#next  { font-size:17px; }');
			document.write('#last  { font-size:17px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:14px; }');
					document.write('#checkPM  { top:24px; }');
					document.write('#checkPE  { top:44px; }');
					document.write('NextMove { left: 89px; }');
					document.write('#PutTrial { top:7px; left:180px; }');
					document.write('#PutCheck { top:5px; left:195px; }');
					document.write('#Loop { top:2px; }');
					break;
				case "OPERA":
					document.write('.ham_eval { padding: 7px 0px 0px 2px; }');
					document.write('#PutTrial { top:8px; }');
					break;
				default:
					document.write('#PutTrial { top:3px; }');
					document.write('.ham_eval { line-height:19px; }');
			}
			break;
		case "S":
		default:
			document.write('.ham_eval { padding: 5px 0px 0px 2px; }');
			document.write('#PutCheck { top:3px; left:121px }');
			document.write('#solve { font-size:10px; margin-top: 0px; }');
			document.write('#KifuText { font-size:13px; }');
			document.write('#SetKifu { font-size:9px; }');
			document.write('#first { font-size:11px; }');
			document.write('#prev  { font-size:11px; }');
			document.write('#kifu  { font-size:11px; }');
			document.write('#next  { font-size:11px; }');
			document.write('#last  { font-size:11px; }');
			switch (checkBrowserName()) {
				case "FIREFOX":
					document.write('.ham_eval { font-size:9px; padding: 4px 0px 0px 1px;}');
					document.write('#NextMove { left: 71px; }');
					document.write('#PutTrial { top:6px; left:104px; }');
					document.write('#PutCheck { top:0px; left:117px; }');
					break;
				case "OPERA":
					document.write('.ham_eval { font-size:10px; padding: 4px 0px 0px 2px;}');
					document.write('#PutTrial { top:6px; }');
					document.write('#PutCheck { top:3px; left: 118px; }');
					break;
				default:
					document.write('.ham_eval { font-size:10px; line-height:13px; }');
					document.write('#PutTrial { top:1px; }');
			}
	}
	document.write('</style>');
}

function repeat_OnOff() {
	if (currentMode != "replay" || solveNow) {
		document.getElementById("repeat").src = "./image/repeat_out.gif";
		return;
	}

	if (intervalID != null) {
		clearInterval(intervalID);
		intervalID = null;
		document.getElementById("repeat").src = "./image/repeat_off.gif";
		switchScorePanel("score");
		printScore(blackCount, whiteCount);
		printNextColor(supposedNextColor);
		printNextMove(nextMoveNo, lastMoveNo);
		disabledButton(false,false,false,false,false);
		setGrayOutButton();
		if (solveEnabled) {
			solver(solveURL);
		}
	}
	else {
		switchScorePanel("auto");
		printScore(blackCount, whiteCount);
		printNextColor(supposedNextColor);
		printNextMove(nextMoveNo, lastMoveNo);
		document.getElementById("repeat").src = "./image/repeat_on.gif";
		disabledButton(true,true,true,true,true);
		intervalID = setInterval("auto_play()",intervalTime);
	}
}

function auto_play() {
	if (nextMoveNo > lastMoveNo) {
		moveFirstCore();
	}
	else {
		moveNextCore();
	}
}

function getResult() {
	var realNextColour = whoseTurn();
	if (disableSolve || realNextColour == EMPTY)
		return;


//	var textBoard = convTextBoard(supposedNextColor);
	var textBoard = convTextBoard(realNextColour);
	if(nextMoveNo >= solveStart) {
		disabledButton(true,true,true,true,true,true);
		solveNow = true;
		document.getElementById("think").style.visibility = "visible";
		clearEval();
		onPutMark(); /* Still print last move number on eval. */
		putEnablePrint(solvePoint, supposedNextColor);
		solveTimerID = setTimeout("solveEnd()", solveTimeOut);
		if (nextMoveNo > 45)
			solver(solveURL + "solve=all&board=" + textBoard);
		else
			solveMulti(textBoard);
	}
}

function solveEnd() {
	solveTimerID = null;
	solveNow = false;
	document.getElementById("think").style.visibility = "hidden";
	disabledButton(false,false,false,false,false,false);
	setGrayOutButton();
}

function callBackResult(empties, result) {
	try {
		if (solveTimerID != null) {
			var empty = 64 - blackCount - whiteCount;
			if (empty == empties && result.substr(0,5) != "Error") {
				var res, resLine = result.split(',');
				for (var i = 0; i < resLine.length; i++) {
					res = resLine[i].split(':');
					if (res[1] == "BEST") {
						printBestEval(res[0]);
					}
					else {
						printEval(res[0], res[1]);
					}
				}
			}
			clearTimeout(solveTimerID);
			solveEnd();
		}
	}
	catch(e) {
		;
	}
}

function callBackParallel(empties, result) {
	try {
		if (solveTimerID != null) {
			var empty = 64 - blackCount - whiteCount;
			if (empty == empties && result.substr(0,5) != "Error") {
				var res = result.split(':');
				printEval(res[0], res[1]);
				var score = parseInt(res[1]);
				if (score > solveBestVal) {
					solveBestVal = score;
					solveResult = res[0] + ":BEST";
				}
				else if (score == solveBestVal) {
					solveResult = solveResult + "," + res[0] + ":BEST";
				}
				solveCounter--;
				if (solveCounter == 0) {
					callBackResult(empties, solveResult);
				}
			}
		}
	}
	catch(e) {
		;
	}
}

function callBackEmpties(empties) {
	try {
		solveStart = 60 - empties + 1 ;
		document.getElementById("solve").value = (language == "fr" ? "I A" : "A I");
	}
	catch(e) {
		solveStart = 61;
		document.getElementById("solve").value = "---";
	}
	setGrayOutButton();
}

function convTextBoard(nCol) {
  var textBoard="";
  var nPos = 0;

  for (nPos = pos_A1; nPos <= pos_H8; nPos++) {
  	switch (vtBoard[nPos]) {
  		case BLACK:
  			textBoard+="X";
  			break;
  		case WHITE:
  			textBoard+="O";
  			break;
  		case EMPTY:
  			textBoard+="-";
  			break;
  		default:
  			;
  	}
  }

  if (nCol == BLACK) {
  	  textBoard+=" X";
  }
  else {
  	  textBoard+=" O";
  }

  return textBoard;
}

function clearEval() {
  var strAH18 = "";
  for (var i = 0; i < 64; i++) {
  	strAH18 = idx_to_ah18(i);
		if (document.getElementById("eval_"+strAH18).innerHTML != "") {
				putNumPrint(strAH18,"",dotColor);
		}
  }
}

function printEval(pos, score) {
	var ah18 = pos.toLowerCase();
	var docCell = document.getElementById("cell_"+ah18);
	docCell.innerHTML = "";
	var docEval = document.getElementById("eval_"+ah18);
	docEval.style.color = "white";
	docEval.innerHTML = score.replace(/[+]/g, '');
}

function printBestEval(pos) {
	var ah18 = pos.toLowerCase();
	var docEval = document.getElementById("eval_"+ah18);
	docEval.style.color = "gold";

}

function solver(src) {
  var script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
}

function solveMulti(textBoard) {
	solveResult = "";
	solveCounter = 0;
	solveBestVal = -64;

	for (var nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if(vtBoard[nPos] != EMPTY) continue;
		if (isColourCanPlaySquare(nPos, supposedNextColor)) {
			solveCounter++;
		}
	}

	for (var nPos = pos_A1; nPos <= pos_H8; nPos++) {
		if(vtBoard[nPos] != EMPTY) continue;
		if (isColourCanPlaySquare(nPos, supposedNextColor)) {
			solver(solveURL + "solve=" + pos_to_ah18(nPos) + "&board=" + textBoard);
		}
	}
}
