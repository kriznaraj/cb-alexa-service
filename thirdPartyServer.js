var express = require("express");
const models = require('./models');
var bodyParser = require("body-parser");
const _ = require('underscore')

var app = express();

app.use(bodyParser.json());

app.listen(3457, function () {
    console.log("Started Service on port 3457...");
})

var categories = {
    'milk': [ 'Babu', 'Nandy', 'Gowtham', 'Aavin', 'BadamFarms'],
    'medicine': [ 'MediCare', 'CureFit', 'SelfCare', 'HealthyLife', 'Joy', 'FunMeds' ],
    'rental': [ 'Rapido', 'Kira', 'Parker', 'Ola', 'Uber', 'JoJo'],
    'gym': [ 'FitMan', 'BeFit', 'cult', 'junglee', 'cs123', 'gymBoys', 'LimeTree' ]
}

app.post('/api/merchants', (req, res) => {
    var merchants = req.body.merchants || [];
    var category = req.body.category;
    merchants.sort(function() {
        return .5 - Math.random();
    });
    res.json(
        { 
            'chargebee_merchants' : merchants, 
            'other_merchants' : _.sample(categories[category],3) || [] 
        })
});
