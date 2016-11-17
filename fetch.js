//dummy module - not functional

module.exports = {
    Label: 'Fetch',
    Dialog: function (session, args, next) { 
    session.send( "Welcome to K9 on Microsoft Bot Framework. I can tell you which TE or BE manages any GISV partner." ); 
    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item); 
    });
    session.send( "K9 data is live = " + (arrayIsvTE.length > 0)); 
    }
};