var fuse; 
var chat = {
    messageToSend: '',
	suggestedKeyword: '',
    messageResponses: [],
	keywordList: [],
	iMatch: 0,
    init: function() {
      this.cacheDOM();
      this.bindEvents();
      this.render();
    },
    cacheDOM: function() {
      this.$chatHistory = $('.chat-history');
      this.$button = $('button');
      this.$textarea = $('#message-to-send');
      this.$chatHistoryList =  this.$chatHistory.find('ul');
	  this.$chatlog = $('#chat-log');
    },
    bindEvents: function() {
      this.$button.on('click', this.addMessage.bind(this));
      this.$textarea.on('keyup', this.addMessageEnter.bind(this));
    },
    render: function() {
      this.scrollToBottom();
      if (this.messageToSend.trim() !== '') {
        var template = Handlebars.compile( $("#message-template").html());
        var context = { 
          messageOutput: this.messageToSend,
          time: this.getCurrentTime()
        };

        this.$chatHistoryList.append(template(context));
        this.scrollToBottom();
        this.$textarea.val('');
        
        // responses
		this.sendResponse(this.getResponseItem(this.messageResponses, this.messageToSend.trim()));
      }
    },
    sendResponse: function(sText) {
		this.scrollToBottom();
        
        var templateResponse = Handlebars.compile( $("#message-response-template").html());
        var contextResponse = { 
          response: sText,
          time: this.getCurrentTime()
        };
        
		this.$chatHistoryList.append(templateResponse(contextResponse));
        this.scrollToBottom();
    },
    addMessage: function() {
      this.messageToSend = this.$textarea.val()
      this.render();         
    },
    addMessageEnter: function(event) {
        // enter was pressed
        if (event.keyCode === 13) {
          this.addMessage();
        }
    },
    scrollToBottom: function() {
       this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
    },
    getCurrentTime: function() {
		return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
    },
    getResponseItem: function(arr, query) {
		var sKeywords, sMatch, sCurrMatch;
		var iGeneralResponses = [];
		var iContentResponses = [];
		var sMatchPhrases = [];
		var bFound = false;
		var sResponse;
		
		iMatch = 0;
		if(this.suggestedKeyword !== ""){
			if(query.search(new RegExp("\\byes\\b","i"))>-1){
				query = this.suggestedKeyword;
				this.suggestedKeyword = "";
			}else if(query.search(new RegExp("\\bno\\b","i"))>-1){
				this.suggestedKeyword = "";
				sResponse = "Sorry, you might want to re-phrase your query or try different keywords. Alternatively, send us feedback with the link below to include your query into my database.";
				return sResponse;
			}
			this.suggestedKeyword = "";
		}
		
		sMatch = ""; //just to init to blank
		for(i=0;i<arr.length;i++){
			bFound = false;
			sCurrMatch = "";
			sKeywords = arr[i][1].trim().toLowerCase().split(",");
			for(j=0;j<sKeywords.length;j++){
				if(sKeywords[j] == "") continue; //skip if blank
				if(query.search(new RegExp("\\b"+sKeywords[j],"i"))>-1){ //checking for words/phrases that begins with the keyword
					bFound = true;
					if(sCurrMatch.search(new RegExp("\\b"+sKeywords[j],"i"))==-1){//check if the keyword is already in the matched list
						sCurrMatch += sKeywords[j] + " ";
					}
				}
			}
			
			if(bFound){ //use peripherals to augment only if there is a keyword hit
				sPeripherals = arr[i][2].trim().toLowerCase().split(",");
				for(j=0;j<sPeripherals.length;j++){
					if(sPeripherals[j] == "") continue; //skip if blank
					if(query.search(new RegExp("\\b"+sPeripherals[j],"i"))>-1){
						bFound = true;
						if(sCurrMatch.search(new RegExp("\\b"+sPeripherals[j],"i"))==-1){//only add if it's not already there
							//hmmm what if sCurrMatch is a subset of peripherals...it happens with bad input data in the csv
							if(sPeripherals[j].search(new RegExp("\\b"+sCurrMatch.trim(),"i"))>-1){
								sCurrMatch = sPeripherals[j] + " "; //don't append just replace
							}else{
								sCurrMatch += sPeripherals[j] + " ";
							}
						}
					}
				}
			}

			if(bFound){
				sCurrMatch = sCurrMatch.trim();
				//if the newly matched keyword is longer than the previous one, then we clear the existing array of less specific keywords
				//this assumes that longer keywords are more specific...which is usually the case
				//console.log(i + "|sCurrMatch:" + sCurrMatch +"|sMatch:" + sMatch);
				if(sCurrMatch.length > sMatch.length){
					//can clear both because either ways it doesn't matter
					iGeneralResponses = [];
					iContentResponses = [];
					sMatch = sCurrMatch; //update sMatch to the longest...or on the first iteration, the first matched keyword
				}
				if(sCurrMatch.length == sMatch.length){ //which would be the case considering any longer keywords would have replaced sMatch
					if(arr[i][5].toLowerCase()=="general"){
						iGeneralResponses.push(i);
					}else{
						iContentResponses.push(i); //assume anything not labelled as "general" is content
					}
				}
				//console.log(iContentResponses);
			}
		}
		
		if(iContentResponses.length > 0 || iGeneralResponses.length > 0){ //is the correct check, rathern than bfound = true
			if(iContentResponses.length > 0){
				if(iContentResponses.length == 1){
					i = iContentResponses[0];
					sResponse = arr[i][4];
				}else{
					bFound = false;
					sResponse = "";
					//let's see if there are peripheral matches
					for(j=0;j<iContentResponses.length;j++){
						i = iContentResponses[j];
						sKeywords = arr[i][2].toLowerCase().split(",");
						for(k=0;k<sKeywords.length;k++){
							if(query.toLowerCase().indexOf(sKeywords[k])>-1){
								bFound = true;
								sResponse = arr[i][4];
								break;
							}
						}
						if(bFound){
							break;
						}
					}
					//no specific answer? show options
					if(!bFound){
						sResponse = "Please specify whether your query on <b><i>" + sMatch + "</b></i> is related to ";
						i = iContentResponses[0];
						sPeri = arr[i][2].split(",")[0];
						sResponse += "<b><a href=\"javascript:quickQuery('" + sMatch + " for " + sPeri + "')\">" + sPeri + "</a></b>";
						for(j=1;j<iContentResponses.length;j++){
							i = iContentResponses[j];
							sPeri = arr[i][2].split(",")[0];
							if(j<iContentResponses.length-1){
								sResponse += ", <b><a href=\"javascript:quickQuery('" + sMatch + " for " + sPeri + "')\">" + sPeri + "</a></b>";
							}else{
								sResponse += " or <b><a href=\"javascript:quickQuery('" + sMatch + " for " + sPeri + "')\">" + sPeri + "</a></b>.<br/>E.g. Please type below '<b>" + sMatch + " for " + sPeri + "</b>'.";
							}
						}
						i=-99; // iContentResponses; //just to log that a clarification was provided
					}
				}
			}else{
				//most likely a chat response, just pick the last one
				i = iGeneralResponses[iGeneralResponses.length-1];
				sResponse = arr[i][4];
			}
			this.$chatlog.append(query + "|" + i + "\n");
			if(i>=0){
				this.iMatch = arr[i][0];
			}else{
				this.iMatch = i;
			}
		}else{
			//at this point then do the subphrase
			//if the standard lookup picks up nothing, let's do a phrase search in for alternatives
			//don't do for less than 2 characters
			if(query.length > 1){
				for(i=0;i<this.keywordList.length;i++){
					if(this.keywordList[i].search(new RegExp("\\b"+query.toLowerCase(),"i"))>-1){
						sMatchPhrases.push(this.keywordList[i]);	
					}
				}
			}
			if(sMatchPhrases.length>0){
				this.$chatlog.append(query + "|-3\n");
				this.iMatch = -3;
				sResponse = "Sorry, I was not able to find an exact match for your query, however, these keywords in my database do contain '" + query + "' in them:";
				for(i=0;i<sMatchPhrases.length;i++){
					sResponse += "<br/>- <a href=\"javascript:quickQuery('"+ sMatchPhrases[i] + "')\">'" + sMatchPhrases[i] + "'</a>";
				}
				sResponse += "<br/>Perhaps one of them may be the one you are looking for.";
			}else{
				var fuzzyResult = fuse.search(query);
				if(fuzzyResult.length>0){
					this.suggestedKeyword = this.keywordList[fuzzyResult[0].item];
					this.$chatlog.append(query + "|-2\n");
					this.iMatch = -100 * fuzzyResult[0].item;
					sResponse = "Sorry, did you mean <a href=\"javascript:quickQuery('" + this.suggestedKeyword + "')\">'" + this.suggestedKeyword + "'</a>";
				}else{
					this.$chatlog.append(query + "|-1\n");
					this.iMatch = -1;
					sResponse = "Sorry, I was not able to locate that query in my database. You might want to try different keywords or send us feedback with the link below to include your query into my database.";
				}
			}
		}
		return sResponse;
    }
};


$(document).ready(function() {
	Papa.parse("chat.csv",{
		delimiter: ",",
		download: true,
		header: false, //to keep things simple just get csv as an array
		skipEmptyLines: true,
		complete: function(results) {
			//do data cleanup and extract keywordlist
			for(var i=1;i<results.data.length;i++){
				var sKeywords = [];
				var sPeripherals = [];
				if(results.data[i].length > 5){ //ignore incomplete rows in the csv we need at least 6 columns to function properly
					tempKeywords = results.data[i][1].split(",");
					for(var j=0;j<tempKeywords.length;j++){
						if(tempKeywords[j].trim() !== ""){
							sKeywords.push(tempKeywords[j].trim()); //cleanup extraneous whitespace
						}
					}
					tempKeywords = results.data[i][2].split(",");
					for(var j=0;j<tempKeywords.length;j++){
						if(tempKeywords[j].trim() !== ""){
							sPeripherals.push(tempKeywords[j].trim()); //cleanup extraneous whitespace
						}
					}
					//prepare keywordlist for fuzzy search
					if(results.data[i][5].toLowerCase()!=="general"){
						for(var j=0;j<sKeywords.length;j++){
							chat.keywordList.push(sKeywords[j]);
							//include peripherals
							for(var k=0;k<sPeripherals.length;k++){
								chat.keywordList.push(sKeywords[j]+" for "+sPeripherals[k]);
							}
						}	
					}
					results.data[i][1] = sKeywords.sort(function(a, b){return b.length - a.length}).toString();
					results.data[i][2] = sPeripherals.sort(function(a, b){return b.length - a.length}).toString();
					chat.messageResponses.push(results.data[i]);
				}
			}
			var tmpset = new Set(chat.keywordList); //set creates unique list
			for(var i=0;i<tmpset.length;i++) { //imagine the potential code speedups if i just stored the length in it's own variable...
				chat.keywordList.push(tmpset[i]);
			}

			fuse = new Fuse(chat.keywordList, {
				  shouldSort: true,
				  includeScore: true,
				  threshold: 0.5
			});
			document.getElementById('loadingModal').style.display = "none";
			document.getElementById('chatWindow').style.display = "block";
			document.getElementById('feedbackDiv').style.display = "block";
			chat.init();
			quickQuery("send_greeting");
		}
	});
});

function quickQuery(sQuery){
	chat.sendResponse(chat.getResponseItem(chat.messageResponses, sQuery));
}

function sendfeedback(){
	//remember mailto URLs have a limit of about 2000 chars
	var bodytext = "\n\n\n--below is a log of the last ~500 characters entered by you.\n" +
		"There is a browser dependent limitation to the length of messages that can be sent via a mailto uri. Feel free to experiment with the length of log, type of log and this message in the js code.\n" +
		"You will notice your response is followed by a '|' and a number.\n" + 
		"= a positive number indicates which response matched your entered keywords\n" +
		"= -99 indicates that a peripheral match occured\n" +
		"= -3 means that a subphrase match occured\n" +
		"= -2 means that a fuzzy search suggestion was provided\n" +
		"= -1 means I gave up\n\n" +
		"--begin log--\n" +
		$('#chat-log').text().slice(-500) +
		"--end log--";
	window.location.href = "mailto:soph@mailinator.com?subject=Feedback%20for%20Soph&body=" + encodeURI(bodytext);
}
