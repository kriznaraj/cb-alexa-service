const chargebee_wrapper = require('./chargebee')

const models = require('./models');
var express = require("express");
var bodyParser = require("body-parser");
var session = require('express-session');
var path = require('path');
var crypto = require('crypto');
const axios = require('axios');

//swagger
var argv = require('minimist')(process.argv.slice(2));
var swagger = require("swagger-node-express");

var subpath = express();
// app.use(bodyParser());

swagger.setAppHandler(subpath);

swagger.setApiInfo({
    title: "Chargebee Alexa Skills API",
    description: "Chargebee Alexa Skills API",
    termsOfServiceUrl: "",
    contact: "yourname@something.com",
    license: "",
    licenseUrl: ""
});
//swagger ends here

var app = express();

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.set('view engine', 'pug');

app.use(bodyParser.json());

//for swagger
app.use("/v1", subpath);
app.use(express.static('dist'));

models.sequelize.sync().then(function () {
    app.listen(3456, function () {
        console.log("Started on port 3456...");
    })
});

let intercept = (req, res, next) => {
    let auth = req.headers['authorization'];
    console.log(auth);
    let token = auth && auth.split(' ')[1];
    console.log('intercpeption is complete - ' + token);

    let handleNoUser = () => {
        console.log('no user present');
        req.session.user = undefined;
        req.session.save();

        if (req.method != 'GET') {
            return res.status(404)
                .send('Cannot find user from the auth token which is required to perform the action');
        }

        return new Promise(() => {
            return next(req, res);
        });
    };

    if (token) {
        return models.Users.findAll({
            limit: 1,
            where: {
                token: token
            }
        }).then((users) => {
            if (users.length == 1) {
                console.log('user found');
                req.session.user = users[0];
                req.session.save();
                return next(req, res);
            } else {
                return handleNoUser();
            }
        })
    } else {
        return handleNoUser();
    }
};

//Api routes starts
app.post('/api/subscriptions', (req, res) => {
    var plan_id = req.body.plan_id;
    var merchant_id = req.body.merchant_id
    return intercept(req, res, () => {
        return models.Merchants.findAll({
            limit: 1,
            where: {
                id: merchant_id
            },
            include: [{
                model: models.Plans,
                where: {
                    id: plan_id
                }
            }],
        }).then(function (merchants) {
            merchant = merchants[0];
            return chargebee_wrapper.createSubscription(merchant, req.session.user)
        }).then(function (response) {
            return res.json(response.subscription);
        }).catch((err) => {
            console.log('failed to create subscription', JSON.stringify(err))
            return res.send(err);
        });
    });
});

app.get('/report', (req, res) => {
    models.Stats.findAll()
        .then(function (stats) {
            return res.render('report', {
                stats: stats
            });
        })
})

//Subscriptions using Category
app.get('/api/subscriptions', (req, res) => {
    var category = req.query.category || '';
    var status = req.query.status || 'active';

    return intercept(req, res, () => {
        return models.Subscriptions.findAll({
            include: [{
                model: models.Categories,
                where: {
                    name: models.sequelize.where(models.sequelize.fn('LOWER', models.sequelize.col('Category.name')), 'LIKE', '%' + category + '%'),
                }
            },{
                model: models.Plans
            },{
                model: models.Merchants
            }],
            where : {
                user_id: req.session.user.id,
                status: status
            }
        }).then((subscriptions) => res.send(subscriptions))
            .catch((err) => {
                console.log('There was an error querying subscriptions', JSON.stringify(err))
                return res.send(err)
            });
    });
});

//Delete a subscription using id
app.delete('/api/subscriptions/:id', (req, res) => {
    const id = req.params.id;
    console.log('id ' + id);
    return intercept(req, res, () => {
        return models.Subscriptions.findAll({
            limit: 1,
            include: [{
                model: models.Merchants,
            }],
            where: {
                id: id
            }
        }).then(function (subscription) {
            console.log('subs', subscription);
            return chargebee_wrapper.cancelSubscription(subscription[0].Merchant, subscription[0])
            .then(() => {
                return res.json({
                    status: 'deleted',
                    subscription: subscription[0]
                });
            });
        });
    });
});

// Pause/Resume a subscription using id
app.put('/api/subscriptions/:id', (req, res) => {
    const id = req.params.id;
    const action = req.body.action;
    return intercept(req, res, () => {
        return models.Subscriptions.findAll({
            limit: 1,
            include: [{
                model: models.Merchants,
            }],
            where: {
                id: id
            }
        }).then(function (subscription) {
            if (action == 'pause') {
                return chargebee_wrapper.pauseSubscription(subscription[0].Merchant, subscription[0]).then(() => {
                    return res.json({
                        status: 'paused',
                        subscription: subscription[0]
                    })
                });
            } else {
                return chargebee_wrapper.resumeSubscription(subscription[0].Merchant, subscription[0]).then(() => {
                    return res.json({
                        status: 'resumed',
                        subscription: subscription[0]
                    })
                });
            }
        })
    });
});

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

//Get Plans
app.get('/api/plans', (req, res) => {
    const category = req.query.category;

    const updateTpMerchant = (merchant, category) => {
        return models.Stats.findAll({
            limit: 1,
            where: {
                name: merchant,
                category: category
            }
        }).then((merchants) => {
            if (merchants.length > 0) {
                return merchants.forEach(m => {
                    models.Stats.update({
                        count: m.count + 1
                    }, {
                            where: {
                                name: merchant,
                                category: category
                            }
                        });
                });
            } else {
                return models.Stats.create({
                    name: merchant,
                    category: category,
                    count: 1
                });
            }
        });
    };

    return intercept(req, res, () => {
        return models.Merchants.findAll({
            attributes: {
                exclude: ['api_key']
            },
            include: [{
                model: models.Plans
            }, {
                model: models.Categories,
                where: {
                    name: models.sequelize.where(models.sequelize.fn('LOWER', models.sequelize.col('Category.name')), 'LIKE', '%' + category + '%')
                }
            }],
        }).then(function (merchants) {
            return axios.post('http://localhost:3457/api/merchants', {
                merchants: merchants,
                category: category
            }).then((response) => {
                response.data.other_merchants.forEach(m => {
                    sleep(500).then(() => updateTpMerchant(m, category));
                });
                return res.json(merchants);
            });
        })
    });
});

app.get('/api/merchants', (req, res) => {
    var category = req.query.category;
    return intercept(req, res, () => {
        return models.Merchants.findAll({
            include: [{
                model: models.Categories,
                where: {
                    name: category
                }
            }]
        }).then((merchants) => res.send(merchants))
            .catch((err) => {
                console.log('There was an error querying merchants', JSON.stringify(err))
                return res.send(err)
            });
    });
});

app.get('/api/categories', (req, res) => {
    return intercept(req, res, () => {
        return models.Categories.findAll()
            .then((categories) => res.send(categories))
            .catch((err) => {
                console.log('There was an error querying categories', JSON.stringify(err))
                return res.send(err)
            });
    });
});
//Api routes ends


//Web site routes starts
app.get('/', function (request, response) {
    if (request.session.loggedin) {
        response.redirect('/home');
    } else {
        response.redirect('/login');
    }
});

app.get('/login', function (request, response) {
    response.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/signup', function (request, response) {
    response.sendFile(path.join(__dirname + '/signup.html'));
});


app.get('/home', function (request, response) {
    if (request.session.loggedin) {
        response.sendFile(path.join(__dirname + '/home.html'));
    } else {
        response.redirect('/login');
    }
});


app.get('/logout', function (request, response) {
    if (request.session.loggedin) {
        request.session.destroy(function (err) {
            // cannot access session here
        });
    }
    response.redirect('/login');
});

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post('/signup', urlencodedParser, function (request, response) {
    if (request.session.loggedin) {
        response.redirect('/');
    }

    let username = request.body.email;
    let password = request.body.password;

    models.Users.create({
        username: username,
        password: password,
        token: crypto.randomBytes(48).toString('hex'),
        lat: 'lat',
        long: 'long'
    });
    response.redirect('/login');
});

app.post('/auth', urlencodedParser, function (request, response) {
    var username = request.body.username;
    var password = request.body.password;
    if (username && password) {
        models.Users.findAll({
            limit: 1,
            where: {
                username: username,
                password: password
            }
        }).then((users) => {
            if (users.length == 1) {
                request.session.loggedin = true;
                request.session.username = users[0].username;
                request.session.user = users[0];
                request.session.save();
                if (request.session.redirect_uri) {
                    response.redirect('/oauth/authorize');
                } else {
                    response.json({
                        status: true
                    });
                }
            } else if (users.length > 1) {
                console.log(users);
                response.json({
                    status: false,
                    error: 'ambigious user'
                });
            } else {
                response.json({
                    status: false,
                    error: 'Incorrect Username and/or Password!'
                });
                // response.send('Incorrect Username and/or Password!');
            }
            response.end();
        });
    } else {
        response.send('Please enter Username and Password!');
        response.end();
    }
});

app.get('/oauth/authorize', function (request, response) {
    var client_id = request.query.client_id;
    var state = request.query.state || request.session.state;
    var scope = request.query.scope || request.session.scope
    var redirectUrl = request.query.redirect_uri || request.session.redirect_uri;
    console.log('Logged in ' + request.session.loggedin);
    console.log('state ' + state);
    console.log('redirectUrl ' + redirectUrl);
    if (request.session.loggedin) {
        let user = request.session.user;
        let url = redirectUrl + '#state=' + state + '&access_token=' + user.token + '&token_type=Bearer';
        console.log(url);
        response.status(301).redirect(url);
    } else {
        console.log('redirecting to login');
        request.session.state = state;
        request.session.redirect_uri = redirectUrl;
        request.session.save();
        response.redirect('/login');
    }
});


app.get('/handle', (req, res) => {
    var param = req.query.choice;
    console.log("time-->", new Date());
    console.log("request received -->");
    console.log("param --> ", param)
    console.log("query --> ", req.query)
    var result = respJSON[param]
    console.log("result --> ", result)
    res.json({
        'result': result
    });
});

app.get('/swagger.json', function (req, res) {
    res.sendfile(__dirname + '/swagger.json');
});

subpath.get('/', function (req, res) {
    res.sendfile(__dirname + '/dist/index.html');
});

swagger.configureSwaggerPaths('', 'api-docs', '');

var domain = 'localhost';
if (argv.domain !== undefined)
    domain = argv.domain;
else
    console.log('No --domain=xxx specified, taking default hostname "localhost".');
var applicationUrl = 'http://' + domain;
swagger.configure(applicationUrl, '1.0.0');