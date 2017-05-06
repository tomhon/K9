var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer(); 
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});


// /*-----------------------------------------------------------------------------
// This Bot  demonstrates how to use an IntentDialog with a LuisRecognizer to add 
// natural language support to a bot. The example also shows how to use 
// UniversalBot.send() to push notifications to a user.

// For a complete walkthrough of creating this bot see the article below.

//     http://docs.botframework.com/builder/node/guides/understanding-natural-language/

// -----------------------------------------------------------------------------*/

//Connect to SQL Server
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES; 
var Connection = require('tedious').Connection;

//initialize mapping data array

//accountArray is sourced from SQL Server
var accountArray = new Array();

//error logging array
var arrayErr = new Array();

// set up SQL server connection using Application Environment Variables

    var config = {
            userName: process.env.SQLuserName ,
            password: process.env.SQLpassword ,
            server: process.env.SQLserver ,
            options: {encrypt: true, database: process.env.SQLdatabase}
        };

//initiate connection to SQL Server
var connection = new Connection(config);
connection.on('connect', function(err) {
    // If no error, then good to proceed.
    
        if (err) {
        //    console.log(err);
            arrayErr.push(err);
        } else {
          console.log("Connected to " + this.config.server + " " + this.config.options.database);
          arrayErr.push("Connected to " + this.config.server);
          loadMappingArray();    
        };
        
        
    });
 
//function to execute SQL query    
function loadMappingArray() {
        request = new Request("SELECT Title, AssignedTE, AssignedBE, AssignedTEAlias, AssignedTELocation, AssignedBEAlias FROM dbo.PartnerIsvs", function(err) {

         if (err) {
            console.log(err);
            arrayErr.push(err);
          }
        else {
            console.log('SQL request succeeded');
            arrayErr.push("SQL request succeeded");
          }
        });

    //unpack data from SQL query
        request.on('row', function(columns) {
            rowObject = new Array();
            columns.forEach(function(column) {
              if (column.value === null) {
                rowObject[column.metadata.colName] = 'unknown';
              } else {
                rowObject[column.metadata.colName] = column.value;
                  }
            });
            accountArray.push(rowObject);
        }); 

        connection.execSql(request);
};

//function to display results Card for TE or BE
function DisplayTEBECard (session, accountInfo, BEorTE){
    if (BEorTE == 'TE'){
        var whichTitle = 'Technical'
        var whichAlias = accountInfo.AssignedTEAlias
        var whichLocation = accountInfo.AssignedTELocation
        var whichOwner = accountInfo.AssignedTE
        var srchStr = 'BE'
    } else if (BEorTE == 'BE'){
        var whichTitle = 'Business'
        var whichAlias = accountInfo.AssignedBEAlias
        var whichLocation = 'unknown'
        var whichOwner = accountInfo.AssignedBE
        var srchStr = 'TE'
    }
    
    var msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title(whichOwner)
                    .subtitle(whichTitle + ' Evangelist for ' + account)
                    .text('Alias: ' + whichAlias +  '\n' + 'Location: ' + whichLocation)
                    .images([
                        builder.CardImage.create(session, 'http://who/photos/' + whichAlias + '.jpg')
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, 'mailto:' + whichAlias + '@microsoft.com', 'Email ' + whichOwner),
                        builder.CardAction.dialogAction(session, 'which accounts does ' + whichOwner + ' own?', 'Other Accounts', 'Other Accounts'),
                        builder.CardAction.dialogAction(session, srchStr + ' for ' + accountInfo.Title, srchStr + '?', srchStr + ' for ' + accountInfo.Title + '?')
                    ])
            ]);
    session.send(msg);
}

// Not using this function yet.  When used, it will display full info for an account in a single card rather than a card for each of the owners
function DisplayAccountCard(session, accountInfo){
    var msg = new builder.Message(session)
        .attachments([
            new builder.ThumbnailCard(session)
                .title(account)
                .subtitle('Click below for more information about the account owners.')
               // .text('Technical Evangelist: ' + teOwner + '\n ' + 'Business Evangelist: ' + beOwner)
                 .buttons([
                     builder.CardAction.dialogAction(session, 'TE for ' + accountInfo.Title, 'TE: ' + accountInfo.AssignedTE, 'TE: ' + accountInfo.AssignedTE),
                     builder.CardAction.dialogAction(session, 'BE for ' + accountInfo.Title, 'BE: ' + accountInfo.AssignedBE, 'BE: ' + accountInfo.AssignedBE)
                 ])
            ]);
    session.send(msg);    
}

// Capitalize First Letter of a String
function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
}

//function to narrow down result set to discreet individual
function DistinctPerson(session, accountArray, resArr, distinctArr, searchEvangelist, evangelist){
            // build an array of matching BEs and TEs from search string
            x=0;
            while ( x < accountArray.length) {
                if (accountArray[x].AssignedTE.match(searchEvangelist)) {
                    resArr.push(accountArray[x].AssignedTE);
                } else if (accountArray[x].AssignedBE.match(searchEvangelist)) {
                    resArr.push(accountArray[x].AssignedBE);
                }
                x++
            }
            // build an array of UNIQUE values from resArr
            for(var i=0;i<resArr.length;i++){
                var str=resArr[i];
                if(distinctArr.indexOf(str)==-1)
                    {
                    distinctArr.push(str);
                    }
            }
            // If there is more than one Evangelist returned from the search, prompt for which one you want to know more about
            if (distinctArr.length>1) {
                session.send('There is more than one person named ' + capitalizeFirstLetter(evangelist.entity) + '. Please be more specific.');
                return true;
                // NEED TO GET THE RESULTS FROM THE PROMPT AND SEND TO BOT

                //builder.Prompts.choice(session, 'Which ' + capitalizeFirstLetter(evangelist.entity) + ' are you looking for?', distinctArr);
                //session.send(result.response);
            }
}


// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);

// Create bot and bind to chat
var connector = new builder.ChatConnector({
    appId: process.env.AppID,
    appPassword: process.env.AppSecret
    });
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUISServiceURL;
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);
var account = "";


// Add intent handlers

//===============================Beginning of Find TE==========================  
dialog.matches('Find_TE', [
    function (session, args, next) {
        console.log('Find_TE called');
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account');
        if (accountEntity) {
            var account = accountEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'Which account would you like to find the TE for?');
            } 
        }
        ,
    function (session, results, next) {
        if (results.response) {
            var account = results.response;
            console.log('Account ' + account + ' now recongized')
        }
        next({response: account});
    }
    ,

    function (session, results) {
        var searchAccount = "";
        var account = results.response;
        console.log('in lookup function, account = ' + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                 searchAccount = new RegExp('\^\\b' + account + '\\b', 'i');
        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // console.log("Looking for account " + searchAccount);
        while ( x < accountArray.length) {
            if (accountArray[x].Title.match(searchAccount)) {
            // post results to chat
                if(accountArray[x].AssignedTE) {
                DisplayTEBECard(session, accountArray[x], 'TE');
                    found = true;
                    }
                };
            x++;

            };
            if (!found) {
                console.log( "Sorry, I couldn't find the TE for " + account);
                session.send("Sorry, I couldn't find the TE for " + account);
            };
            // next line to assist with debug
            //   session.endDialog("Session Ended");
        }
    }    
]);
//===============================End of Find TE==========================

//===============================Beginning of Find BE====================
dialog.matches('Find_BE', [
    function (session, args, next) {
        console.log('Find_BE called');
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account');
        if (accountEntity) {
            var account = accountEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'Which account would you like to find the BE for?');
            } 
        }
    ,
    function (session, results, next) {
        if (results.response) {
            var account = results.response;
            console.log('Account ' + account + ' now recongized')
        }
        next({response: account});

    }
    ,
    function (session, results) {
        var searchAccount = "";
        var account = results.response;
        console.log('in lookup function, account = ' + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp('\\b' + account + '\\b', 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < accountArray.length) {
            if (accountArray[x].Title.match(searchAccount)) {
            //post results to chat
                if(accountArray[x].AssignedTE) {
                    DisplayTEBECard(session, accountArray[x], 'BE');
                    found = true;
                    }
                };
            x++;
;
            };
            if (!found) {
                console.log( "Sorry, I couldn't find the BE for " + account);
                session.send( "Sorry, I couldn't find the BE for " + account);
                };

            // next line to assist with debug
            //   session.endDialog("Session Ended");
            
        }

    }
]);
//===============================End of Find BE==========================

//===============================Beginning of Find Accounts==============

dialog.matches('Find_Accounts', [function (session, args, next) { 
    //handle the case where intent is List Accounts for BE or TE
    // use bot builder EntityRecognizer to parse out the LUIS entities
    var evangelist = builder.EntityRecognizer.findEntity(args.entities, 'Evangelist'); 
    // session.send( "Recognized Evangelist " + evangelist.entity); 

    // assemble the query using identified entities   
    var searchEvangelist = "";

    //create regex version of the searchEvangelist
    if (!evangelist) {
            session.send("Sorry, I couldn't make out the name of the evangelist you are looking for.");
    } else { 
            (searchEvangelist = new RegExp('\\b' + evangelist.entity + '\\b', 'i'))

            // Next line to assist with debugging
            // session.send( "Looking for the accounts for " + searchEvangelist); 

            //search mapping array for searchAccount
            var x = 0;
            var found = false;
            var resArr = new Array();
            var distinctArr = new Array();
            var choiceStr = '';
            var titleStr = '';
            var whichAlias = '';
            var whichName = '';
            var tooManyPossibles = false;

            if (DistinctPerson(session, accountArray, resArr, distinctArr, searchEvangelist, evangelist)){
                tooManyPossibles = true;
            };
            if (!tooManyPossibles){
                x=0;
                resArr=[];
                while ( x < accountArray.length) {
                    // if text string found as EITHER BE or TE
                    if ((accountArray[x].AssignedTE.match(searchEvangelist)) || (accountArray[x].AssignedBE.match(searchEvangelist))) {
                        resArr.push(accountArray[x].Title);
                    };
                    
                    if (accountArray[x].AssignedTE.match(searchEvangelist)){
                        titleStr = 'Technical Evangelist';
                        whichAlias = accountArray[x].AssignedTEAlias;
                        whichName = accountArray[x].AssignedTE;
                    }
                    if (accountArray[x].AssignedBE.match(searchEvangelist)){
                        titleStr = 'Business Evangelist';
                        whichAlias = accountArray[x].AssignedBEAlias;
                        whichName = accountArray[x].AssignedBE;
                    }
                    x++;
                };
                if (resArr.length == 0) {
                    session.send("Sorry, I couldn't find the accounts for " + evangelist.entity);    
                } else {
                    var y=0;
                    while (y < resArr.length){
                        choiceStr = (choiceStr + resArr[y] + ', ');
                        y++;
                    }
                    choiceStr = choiceStr.slice(0,(choiceStr.length-2));
                    
                    var msg = new builder.Message(session)
                        .attachments([
                            new builder.ThumbnailCard(session)
                                .title(whichName)
                                .subtitle(titleStr)
                                .text('Owned Accounts: ' + choiceStr)
                                .images([
                                    builder.CardImage.create(session, 'http://who/photos/' + whichAlias + '.jpg')
                                ])
                                .buttons([
                                    builder.CardAction.openUrl(session, 'mailto:' + whichAlias + '@microsoft.com', 'Email ' + whichName),
                                ])
                        ]);
                    session.send(msg);
                }
                    // next line to assist with debug
                    //   session.endDialog("Session Ended");
            }
            }
        },
        ]);   
//===============================End of Find Accounts==========================

//===============================Beginning of Find Both========================

dialog.matches('Find_Both', [function (session, args, next) { 
        //    console.log(args.entities); 

        // use bot builder EntityRecognizer to parse out the LUIS entities
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account'); 

        // assemble the query using identified entities   
        var searchAccount = "";

        //create regex version of the searchAccount
        if (!accountEntity) {
                session.send("Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp('\\b' + accountEntity.entity + '\\b', 'i'))

                // Next line to assist with debugging
                // session.send( "Looking for the TE for " + searchAccount); 

                //search mapping array for searchAccount
                var x = 0;

                var found = false;
                        // Next line to assist with debugging
                        // // console.log("Looking for account");
                while ( x < accountArray.length) {
                    if (accountArray[x].Title.match(searchAccount)) {
                    //post results to chat
                        if(accountArray[x].AssignedTE) {
                    DisplayTEBECard(session, accountArray[x], 'TE');
                            found = true;
                            }
                        if(accountArray[x].AssignedBE) {
                    DisplayTEBECard(session, accountArray[x], 'BE');
                            found = true;
                            }
                        };
                    x++;
                    };
                    if (!found) {
                        session.send("Sorry, I couldn't find the Evangelists for " + accountEntity.entity)
                        };

                    // next line to assist with debug
                    //   session.endDialog("Session Ended");
                    
                }}]);
//===============================End of Find Both==========================

//---------------------------------------------------------------------------------------------------    
//handle the case where there's a request to reload data

dialog.matches('Fetch', function (session, args, next) { 
    session.send( "Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner." ); 
    // session.send( "Local Partner data is live = " + (partnerISV.length > 0)); 
    //list all errors
    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item); 
    });
    session.send( "K9 data is live = " + (accountArray.length > 0)); 
                // session.endDialog("Session Ended");
    });

//---------------------------------------------------------------------------------------------------    
//handle the case where there's no recognized intent

dialog.matches('None', function (session, args, next) { 
    session.send( "Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner." ); 
    });
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is happy

dialog.matches('Happy', function (session, args, next) { 
    session.send( "Hope you enjoyed this as much as i did:-) " ); 

    });
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is sad

dialog.matches('Sad', function (session, args, next) { 
    session.send("Life? Don't talk to me about life. Did you know I've got this terrible pain in all the diodes down my left side?");
    });    
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is abuse

dialog.matches('Abuse', function (session, args, next) { 
    session.send("Hey, don't be mean to me:-)"); 
    });   

//---------------------------------------------------------------------------------------------------    
//handle the case where intent is help

dialog.matches('Help', function (session, args, next) { 
    session.send( "Ask me Who is the TE for Netflix?" ); 
    session.send( "... or Who is the TE for Amazon?" ); 
    session.send( "... or Who are the TE and BE for Facebook?" ); 
    session.send( "... or Which accounts does Ian manage?" ); 
        //   session.endDialog("Session Ended");
    });  

//---------------------------------------------------------------------------------------------------



dialog.onDefault(builder.DialogAction.send("Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner."));

// Setup Restify Server 

server.get('/', function (req, res) { 
    res.send('K9 Production Bot Running MASTER BRANCH' 
        + arrayErr.length + " " 
        + arrayErr[0] + " " 
        + arrayErr[1] + " " 
        + accountArray.length + " "
        + process.env.AppID + " "
        + process.env.AppSecret
        ); 
    arrayErr.forEach(function(item) { 
    // console.log( "K9 Bot = " + item);  
    }); 
    // res.send('K9 Production Bot Running');
}); 


