/*jslint
    for, white
*/

var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer();
server.listen(process.env.port || 3978, function () {
    console.log("%s listening to %s", server.name, server.url);
});

//Connect to SQL Server
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;
var Connection = require('tedious').Connection;

//accountArray is sourced from SQL Server
var accountArray = [];

//error logging array
var arrayErr = [];

// set up SQL server connection using Application Environment Variables
var config = {
        userName: process.env.SQLuserName,
        password: process.env.SQLpassword,
        server: process.env.SQLserver,
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
        console.log("Connected to " + config.server + " " + config.options.database);
        arrayErr.push("Connected to " + config.server);
        fullQueryText = "SELECT Title, AssignedTE, AssignedBE, AssignedTEAlias, AssignedTELocation, AssignedBEAlias FROM dbo.PartnerIsvs";
        queryText = fullQueryText;
        loadMappingArray(queryText);
    }
});

//function to execute SQL query
function loadMappingArray(queryText) {
    request = new Request(queryText, function(err) {

        if (err) {
        console.log(err);
        arrayErr.push(err);
        }
    else {
        console.log("SQL request succeeded");
        arrayErr.push("SQL request succeeded");
        }
    });

    //unpack data from SQL query
    request.on('row', function(columns) {
        rowObject = [];
        columns.forEach(function(column) {
            if (column.value === null) {
            rowObject[column.metadata.colName] = "unknown";
            } else {
            rowObject[column.metadata.colName] = column.value;
                }
        });
        accountArray.push(rowObject);
    });
    connection.execSql(request);
}

//function to display results Card for TE or BE
function DisplayTEBECard (session, accountInfo, BEorTE){
    if (BEorTE === "TE"){
        var whichTitle = "Technical";
        var whichAlias = accountInfo.AssignedTEAlias;
        var whichLocation = accountInfo.AssignedTELocation;
        var whichOwner = accountInfo.AssignedTE;
        var srchStr = "BE";
    } else if (BEorTE === "BE"){
        whichTitle = "Business";
        whichAlias = accountInfo.AssignedBEAlias;
        whichLocation = "unknown";
        whichOwner = accountInfo.AssignedBE;
        srchStr = "TE";
    }
    var msg = new builder.Message(session)
        .attachments([
            new builder.HeroCard(session)
                .title(whichOwner)
                .subtitle(whichTitle + " Evangelist for " + accountInfo.Title)
                .text("Alias: " + whichAlias +  "\n" + "Location: " + whichLocation)
                .buttons([
                    builder.CardAction.openUrl(session, "mailto:" + whichAlias + "@microsoft.com", "Email " + whichOwner),
                    builder.CardAction.postBack(session, "which accounts does " + whichOwner + " own?", "Other Accounts", "Other Accounts"),
                    builder.CardAction.postBack(session, srchStr + " for " + accountInfo.Title, srchStr + " for " + accountInfo.Title + "?")
                ])
        ]);
    session.send(msg);
}
// **** Receipt Card not yet supported in Skype.  Simply sending account list as text for now in primary function.
// function DisplayAccountCard(session, accountInfo, queryText){
//     loadMappingArray(queryText);
//     var msg = new builder.Message(session)
//         .attachments([
//             new builder.ReceiptCard(session)
//                 .title(accountInfo.Title)
//                 .items([
//                     builder.ReceiptItem.create(session, accountInfo.AssignedTE, "Technical Evangelist: "),
//                     builder.ReceiptItem.create(session, accountInfo.AssignedBE, "Business Evangelist: ")
//                 ])
//                 .buttons([
//                      builder.CardAction.openUrl(session, "mailto:" + accountInfo.AssignedTEAlias + "@microsoft.com", "Email " + accountInfo.AssignedTE),
//                      builder.CardAction.openUrl(session, "mailto:" + accountInfo.AssignedBEAlias + "@microsoft.com", "Email " + accountInfo.AssignedBE)
//                  ])
//             ]);
//     session.send(msg);
    // reset queryText?
//}

// Capitalize First Letter of a String
function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
}

//function to narrow down result set to discreet individual
function DistinctPerson(session, accountArray, resArr, distinctArr, searchEvangelist, evangelist){
    // build an array of matching BEs and TEs from search string
    for (x=0; x < accountArray.length; x+=1) {
            if (accountArray[x].AssignedTE.match(searchEvangelist)) {
            resArr.push(accountArray[x].AssignedTE);
        } else if (accountArray[x].AssignedBE.match(searchEvangelist)) {
            resArr.push(accountArray[x].AssignedBE);
        }
    }
    for (x=0;x<resArr.length;x+=1) {
        if(distinctArr.indexOf(resArr[x])===-1)
            {
            distinctArr.push(resArr[x]);
            }
    }
    // If there is more than one Evangelist returned from the search, prompt for which one you want to know more about
    if (distinctArr.length>1) {
        session.send("There is more than one person named " + capitalizeFirstLetter(evangelist.entity) + ". Please be more specific.");
        return true;
    }
}

// Create bot and bind to chat
var connector = new builder.ChatConnector({
    appId: process.env.AppID,
    appPassword: process.env.AppSecret
    });
var bot = new builder.UniversalBot(connector);
server.post("/api/messages", connector.listen());

// Create LUIS recognizer that points at our model and add it as the root "/" dialog for our Cortana Bot.
var model = process.env.LUISServiceURL;
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog("/", dialog);
var account = "";

// Add intent handlers

//===============================Beginning of Find TE==========================
dialog.matches("Find_TE", [
    function (session, args, next) {
        console.log("Find_TE called");
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, "Account");
        if (accountEntity) {
            account = accountEntity.entity;
            // console.log("Account " + account + " recognized");
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, "Which account would you like to find the TE for?");
            }
    },
    function (session, results, next) {
        if (results.response) {
            account = results.response;
            console.log("Account " + account + " now recongized");
        }
        next({response: account});
    },
    function (session, results) {
        var searchAccount = "";
        account = results.response;
        console.log("in lookup function, account = " + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else {
                 searchAccount = new RegExp("\^\\b" + account + "\\b", "i");
        //search mapping array for searchAccount
        var found = false;
                // Next line to assist with debugging
                // console.log("Looking for account " + searchAccount);
        for (var x=0; x < accountArray.length; x+=1) {
            if (accountArray[x].Title.match(searchAccount)) {
            // post results to chat
                if(accountArray[x].AssignedTE) {
                DisplayTEBECard(session, accountArray[x], "TE");
                    found = true;
                    }
                }
            }
            if (!found) {
                console.log( "Sorry, I couldn't find the TE for " + account);
                session.send("Sorry, I couldn't find the TE for " + account);
            }
            // next line to assist with debug
            //   session.endDialog("Session Ended");
        }
    }
]);
//===============================End of Find TE==========================

//===============================Beginning of Find BE====================
dialog.matches("Find_BE", [
    function (session, args, next) {
        console.log("Find_BE called");
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, "Account");
        if (accountEntity) {
            account = accountEntity.entity;
            // console.log("Account " + account + " recognized");
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, "Which account would you like to find the BE for?");
            }
    },
    function (session, results, next) {
        if (results.response) {
            account = results.response;
            console.log("Account " + account + " now recongized");
        }
        next({response: account});
    },
    function (session, results) {
        var searchAccount = "";
        account = results.response;
        console.log("in lookup function, account = " + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else {
            searchAccount = new RegExp("\\b" + account + "\\b", "i");

        //search mapping array for searchAccount
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        for (x=0; x < accountArray.length; x+=1) {
            if (accountArray[x].Title.match(searchAccount)) {
            //post results to chat
                if(accountArray[x].AssignedTE) {
                    DisplayTEBECard(session, accountArray[x], "BE");
                    found = true;
                    }
                }
            }
            if (!found) {
                console.log( "Sorry, I couldn't find the BE for " + account);
                session.send( "Sorry, I couldn't find the BE for " + account);
                }
        }
    }
]);
//===============================End of Find BE==========================

//===============================Beginning of Find Accounts==============

dialog.matches("Find_Accounts", [
    function (session, args, next) {
    //handle the case where intent is List Accounts for BE or TE
    // use bot builder EntityRecognizer to parse out the LUIS entities
    var evangelist = builder.EntityRecognizer.findEntity(args.entities, "Evangelist");
    // session.send( "Recognized Evangelist " + evangelist.entity);

    // assemble the query using identified entities
    var searchEvangelist = "";

    //create regex version of the searchEvangelist
    if (!evangelist) {
            session.send("Sorry, I couldn't make out the name of the evangelist you are looking for.");
    } else { 
        searchEvangelist = new RegExp("\\b" + evangelist.entity + "\\b", "i");

            var x = 0;
            var found = false;
            var resArr = [];
            var distinctArr = [];
            var choiceStr = "";
            var choiceArr = [];
            var titleStr = "";
            var whichAlias = "";
            var whichName = "";
            var tooManyPossibles = false;
            
            if (DistinctPerson(session, accountArray, resArr, distinctArr, searchEvangelist, evangelist)){
                tooManyPossibles = true;
            }
            if (!tooManyPossibles){
                resArr=[];
                for (x=0; x < accountArray.length; x+=1) {
                    // if text string found as EITHER BE or TE
                    if ((accountArray[x].AssignedTE.match(searchEvangelist)) || (accountArray[x].AssignedBE.match(searchEvangelist))) {
                        resArr.push(accountArray[x].Title);
                    }
                    if (accountArray[x].AssignedTE.match(searchEvangelist)){
                        titleStr = "Technical Evangelist";
                        whichAlias = accountArray[x].AssignedTEAlias;
                        whichName = accountArray[x].AssignedTE;
                    }
                    if (accountArray[x].AssignedBE.match(searchEvangelist)){
                        titleStr = "Business Evangelist";
                        whichAlias = accountArray[x].AssignedBEAlias;
                        whichName = accountArray[x].AssignedBE;
                    }
                }
                resArr.sort();
                if (resArr.length === 0) {
                    session.send("Sorry, I couldn't find the accounts for " + evangelist.entity);
                } else {
                    for (x=0; x < resArr.length; x+=1){
                        if (x===0) {
                            choiceStr = resArr[x];
                        } else {
                            choiceStr = choiceStr + ', ' + resArr[x];
                        }
                    }
                var msg = new builder.Message(session)
                    .attachments([
                        new builder.HeroCard(session)
                            .title("Accounts owned by " + whichName)
                            .text(choiceStr)
                            .buttons([
                                builder.CardAction.openUrl(session, "mailto:" + whichAlias + "@microsoft.com", "Email " + whichName),
                            ])
                    ]);
                session.send(msg);
                }
            }
        }
    },
    function (session, results, next) {
        queryText = ("SELECT AssignedTE, AssignedBE, AssignedTEAlias, AssignedBEAlias FROM dbo.PartnerIsvs WHERE Title = '" + results.response.entity + "'");
        DisplayAccountCard(session, results.response.entity, queryText); 
    }
    ]);
//===============================End of Find Accounts==========================

//===============================Beginning of Find Both========================

dialog.matches("Find_Both", [
    function (session, args, next) {
        //    console.log(args.entities);

        // use bot builder EntityRecognizer to parse out the LUIS entities
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, "Account");

        // assemble the query using identified entities
        var searchAccount = "";

        //create regex version of the searchAccount
        if (!accountEntity) {
                session.send("Sorry, I couldn't make out the name of the account you are looking for.");
        } else {
            searchAccount = new RegExp("\\b" + accountEntity.entity + "\\b", "i");

                //search mapping array for searchAccount
                var found = false;
                for (x=0; x < accountArray.length; x+=1) {
                    if (accountArray[x].Title.match(searchAccount)) {
                        DisplayAccountCard(session, accountArray[x]);
                        found = true;
                        }
                    }
                    if (!found) {
                        session.send("Sorry, I couldn't find the Evangelists for " + accountEntity.entity);
                        }

                    // next line to assist with debug
                    //   session.endDialog("Session Ended");

                }}]);
//===============================End of Find Both==========================

//---------------------------------------------------------------------------------------------------
//handle the case where there"s a request to reload data

dialog.matches("Fetch", function (session, args, next) {
    session.send( "Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner." );
    // session.send( "Local Partner data is live = " + (partnerISV.length > 0));
    //list all errors
    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item);
    });
    session.send("K9 data is live = " + (accountArray.length > 0));
                // session.endDialog("Session Ended");
    });

//---------------------------------------------------------------------------------------------------
//handle the case where there's no recognized intent

dialog.matches("None", function (session, args, next) {
    session.send( "Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner." );
    });
//---------------------------------------------------------------------------------------------------
//handle the case where intent is happy

dialog.matches("Happy", function (session, args, next) {
    session.send( "Hope you enjoyed this as much as i did:-) " );

    });
//---------------------------------------------------------------------------------------------------
//handle the case where intent is sad

dialog.matches("Sad", function (session, args, next) {
    session.send("Life? Don't talk to me about life. Did you know I've got this terrible pain in all the diodes down my left side?");
    });
//---------------------------------------------------------------------------------------------------
//handle the case where intent is abuse

dialog.matches("Abuse", function (session, args, next) {
    session.send("Hey, don't be mean to me:-)");
    });

//---------------------------------------------------------------------------------------------------
//handle the case where intent is help

dialog.matches("Help", function (session, args, next) {
    session.send( "Ask me Who is the TE for Netflix?" );
    session.send( "... or Who is the TE for Amazon?" );
    session.send( "... or Who are the TE and BE for Facebook?" );
    session.send( "... or Which accounts does Ian manage?" );
        //   session.endDialog("Session Ended");
    });

//---------------------------------------------------------------------------------------------------

dialog.onDefault(builder.DialogAction.send("Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner."));

server.get("/", function (req, res) {
    res.send("K9 Production Bot Running MASTER BRANCH"
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
    // res.send("K9 Production Bot Running");
});


