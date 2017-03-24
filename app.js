var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer(); 
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});


// /*-----------------------------------------------------------------------------
// This Bot demonstrates how to use an IntentDialog with a LuisRecognizer to add 
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

//arrayIsvTE is sourced from SQL Server
var arrayIsvTE = new Array();

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
      
        request = new Request("SELECT Title, AssignedTE, AssignedBE FROM dbo.PartnerIsvs", function(err) {
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
            columns.forEach(function(column) {
              if (column.value === null) {
                arrayIsvTE.push('');
              } else {
                arrayIsvTE.push(column.value);
                  }
            });
        }); 

        connection.execSql(request);
    };



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
                (searchAccount = new RegExp(account, 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < arrayIsvTE.length) {
            if (arrayIsvTE[x].match(searchAccount)) {
            //post results to chat
                if(arrayIsvTE[x+1]) {
                    // var msg = "The TE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+1];
                    // console.log( msg); 
                    session.send("The TE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+1]);
                    found = true;
                    }
                };
            x++;
            x++;
            x++;
            };
            if (!found) {
                console.log( "Sorry, I couldn't find the TE for " + account);
                session.send( "Sorry, I couldn't find the TE for " + account);
                };

            // next line to assist with debug
            //   session.endDialog("Session Ended");
            
        }

    }
]);
//===============================End of Find TE==========================

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
                (searchAccount = new RegExp(account, 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < arrayIsvTE.length) {
            if (arrayIsvTE[x].match(searchAccount)) {
            //post results to chat
                if(arrayIsvTE[x+2]) {
                    // var msg = "The TE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+1];
                    // console.log( msg); 
                    session.send("The BE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+2]);
                    found = true;
                    }
                };
            x++;
            x++;
            x++;
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
            (searchEvangelist = new RegExp(evangelist.entity, 'i'))

            // Next line to assist with debugging
            // session.send( "Looking for the accounts for " + searchEvangelist); 

            //search mapping array for searchAccount
            var x = 0;
            var found = false;
                    // Next line to assist with debugging
                    // // console.log("Looking for account");
            while ( x < arrayIsvTE.length) {
                if (arrayIsvTE[x+1].match(searchEvangelist)) {
                //found TE match
                    if(arrayIsvTE[x]) {
                        session.send( arrayIsvTE[x+1] + " is TE for " + arrayIsvTE[x]); 
                        found = true;
                        }
                    };
                if (arrayIsvTE[x+2].match(searchEvangelist)) {
                //found BE match
                    if(arrayIsvTE[x]) {
                        session.send( arrayIsvTE[x+2] + " is BE for " + arrayIsvTE[x]); 
                        found = true;
                        }
                    };
                x++
                x++;
                x++;
                };
                if (!found) {
                    session.send( "Sorry, I couldn't find the accounts for " + evangelist.entity)
                    };

                // next line to assist with debug
                //   session.endDialog("Session Ended");
                
            }
        }]);   






//===============================End of Find Accounts==========================

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
                (searchAccount = new RegExp(accountEntity.entity, 'i'))

                // Next line to assist with debugging
                // session.send( "Looking for the TE for " + searchAccount); 

                //search mapping array for searchAccount
                var x = 0;
                var found = false;
                        // Next line to assist with debugging
                        // // console.log("Looking for account");
                while ( x < arrayIsvTE.length) {
                    if (arrayIsvTE[x].match(searchAccount)) {
                    //post results to chat
                        if(arrayIsvTE[x+1]) {
                            session.send( "The TE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+1]); 
                            found = true;
                            }
                        if(arrayIsvTE[x+2]) {
                            session.send( "The BE for " + arrayIsvTE[x] + " is " + arrayIsvTE[x+2]); 
                            found = true;
                            }
                        };
                    x++;
                    x++;
                    x++;
                    };
                    if (!found) {
                        session.send( "Sorry, I couldn't find the Evangelists for " + accountEntity.entity)
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
    session.send( "K9 data is live = " + (arrayIsvTE.length > 0)); 
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
    session.send( "Life? Don't talk to me about life. Did you know I've got this terrible pain in all the diodes down my left side? " );
    });    
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is abuse

dialog.matches('Abuse', function (session, args, next) { 
    session.send( "Hey, don't be mean to me:-) " ); 
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
        + arrayIsvTE.length + " "
        + process.env.AppID + " "
        + process.env.AppSecret
        ); 
    arrayErr.forEach(function(item) { 
    // console.log( "K9 Bot = " + item);  
    }); 
    // res.send('K9 Production Bot Running');
}); 



