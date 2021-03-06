var async = require("async");
var User = require('./models/user');
var Roles = require('./models/role');
var UserAchievement = require('./models/userAchievement');

var REDIRECT_TO_PROFILE = '/profile';
var REDIRECT_TO_QUIZZES = '/quizzes';

module.exports = function (app, passport) {
    "use strict";
    /*
     * Home page
     */
    app.get('/', function (req, res) {
        if (req.user) {
            res.redirect(REDIRECT_TO_QUIZZES);
        } else {
            res.render('index.ejs', {
                message: req.flash('loginMessage'),
                shouldShowThirdPartyLogins: (!req.user || (req.user && (!req.user.facebook.token || !req.user.twitter.token))),
                shouldShowFacebookLogin: (!req.user || (req.user && !req.user.facebook.token)),
                shouldShowTwitterLogin: (!req.user || (req.user && !req.user.twitter.token))
            });
        }
    });

    /*
     * Useful tools
     */
    app.use(function (req, res, next) {
        var now = new Date((new Date() - 1000 * 60 * 60)).toISOString();
        console.log(now.slice(0, 10) + " " + now.slice(11, 16));
        next();
    });

    app.get('/isSandbox', function (req, res) {
        res.send("isSandbox: " + (app.get("appSecret") === "itsNotASecretAnyMore"));
    });

    app.get('/isAdmin', isAdmin, function (req, res) {
        res.send("isAdmin: true (if it could be false, you would be redirected to homepage)");
    });

    app.get('/errorTemp', isAdmin, function (req, res) {
        res.send(JSON.stringify(req.session.errorTemp));
    });

    /*
     * FAQ
     */
    app.get('/faq', function (req, res) {
        res.render('faq.ejs', {
            loggedIn: req.isAuthenticated()
        });
    });

    /*
     * Authentication
     */
    app.post('/login',
        passport.authenticate('local-login', {
            successRedirect: REDIRECT_TO_PROFILE,
            failureRedirect: '/',
            failureFlash: true
        })
    );

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/profile', isLoggedIn, function (req, res) {
        var user_achievements = [];
        var admin = false;
        async.series([
            function (callback) {
                UserAchievement.findOne({'userId': req.user.id}, function (err, achievements) {
                    if (err) return callback(err);
                    if (achievements !== null) {
                        user_achievements = achievements.achievements;
                    }
                    callback();
                });
            },
            function (callback) {
                setUserRoleStateInSession(req, callback);
            }
        ], function (err) {
            if (err) return next(err);
            console.log(" req.session.roleState: ",  req.session.roleState);
            res.render('profile.ejs', {
                user: req.user,
                admin: req.session.roleState,
                achievements: user_achievements
            });
        });
    });

    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback',
        passport.authenticate('twitter', {
            successRedirect: REDIRECT_TO_PROFILE,
            failureRedirect: '/'
        })
    );

    app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email'}));
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect: REDIRECT_TO_PROFILE,
            failureRedirect: '/'
        })
    );

    app.get('/connect/facebook', passport.authorize('facebook', {scope: 'email'}));
    app.get('/connect/facebook/callback',
        passport.authorize('facebook', {
            successRedirect: REDIRECT_TO_PROFILE,
            failureRedirect: '/'
        })
    );

    app.get('/connect/twitter', passport.authorize('twitter', {scope: 'email'}));
    app.get('/connect/twitter/callback',
        passport.authorize('twitter', {
            successRedirect: REDIRECT_TO_PROFILE,
            failureRedirect: '/'
        })
    );

    app.get('/unlink/local', function (req, res) {
        var user = req.user;
        user.local.name = undefined;
        user.local.password = undefined;
        user.save(function (err) {
            res.redirect(REDIRECT_TO_PROFILE);
        });
    });

    app.get('/unlink/facebook', function (req, res) {
        var user = req.user;
        user.facebook.token = undefined;
        user.save(function (err) {
            res.redirect(REDIRECT_TO_PROFILE);
        });
    });

    app.get('/unlink/twitter', function (req, res) {
        var user = req.user;
        user.twitter.token = undefined;
        user.twitter.profilePhoto = undefined;
        user.save(function (err) {
            res.redirect(REDIRECT_TO_PROFILE);
        });
    });

    app.post('/update-display-name', isLoggedInV2, function (req, res) {
        var updatedUser = req.user;
        var newDisplayName = req.body.data.trim();
        if (!newDisplayName || newDisplayName === "") {
            res.send({
                error: true,
                message: "New display Name was not given",
                subMessage: "Please provide a new name"
            });
            return;
        }
        async.series([
            function (callback) {
                User.findOne({'displayName': newDisplayName}, function (err, user) {
                    if (err) return callback(err);
                    if (user === null) {
                        updatedUser.displayName = newDisplayName;
                    } else {
                        res.send({
                            error: true,
                            message: "Unable to update the display name",
                            subMessage: "That display name is already taken"
                        });
                        return;
                    }
                    callback();
                });
            }
        ], function (err) {
            if (err) return next(err);
            updatedUser.save(function (err) {
                if (err) res.send({
                    error: true,
                    message: "unable to save the user to db",
                    subMessage: "reason: " + err
                });
                res.send({error: false});
            });
        });
    });

    app.post('/update-user-fast-ansers', isLoggedInV2, function (req, res) {
        var updatedUser = req.user;
        var shouldUseFastAnswers = req.body.data === "true";
        async.series([
            function (callback) {
                User.findById(req.user.id, function (err, user) {
                    if (err) return callback(err);
                    if (user === null) {
                        res.send({
                            error: true,
                            message: "Unable to update the display name",
                            subMessage: "That display name is already taken"
                        });
                        return;
                    } else {
                        updatedUser.shouldUseFastAnswers = shouldUseFastAnswers;
                    }
                    callback();
                });
            }
        ], function (err) {
            if (err) return next(err);
            updatedUser.save(function (err) {
                if (err) res.send({
                    error: true,
                    message: "unable to save the user to db",
                    subMessage: "reason: " + err
                });
                res.send({error: false});
            });
        });
    });
};


// private methods ======================================================================
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();
    res.redirect('/');
}

function isLoggedInV2(req, res, next) {
    if (req.isAuthenticated())
        return next();
    res.send({
        error: true,
        message: "Not logged in",
        subMessage: "please log in before using the app"
    });
}

var isAdmin = function (req, res, next) {
    async.series([
        function (callback) {
            if (req.user) {
                Roles.findOne({'userId': req.user.id}, function (err, user_role) {
                    if (err) return callback(err);
                    if (user_role !== null && user_role.role === "admin") {
                        return next();
                    } else {
                        res.redirect('/');
                    }
                    callback();
                });
            } else {
                callback();
            }
        }
    ], function (err) {
        if (err) return next(err);
        res.redirect('/');
    });
};

var setUserRoleStateInSession = function (req, cb) {
    async.series([
        function (callback) {
            if (req.user) {
                Roles.findOne({'userId': req.user.id}, function (err, user_role) {
                    if (err) return callback(err);
                    if (user_role !== null) {
                        req.session.roleState = user_role.role;
                    } else {
                        req.session.roleState = "guest";
                    }
                    callback();
                });
            } else {
                callback();
            }
        }
    ], function () {
        cb();
    });
};
