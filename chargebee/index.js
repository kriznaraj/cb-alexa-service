const chargebee = require("chargebee");
const models = require('../models');

var chargebee_actions = {};

async function resumeSubscription(merchant, subscription) {
    chargebee.configure({
        site: merchant.site_name,
        api_key: merchant.api_key
    })
    return chargebee.subscription.resume(subscription.cb_subscription_id,{
    }).request(function(error,result) {
    if(error){
        console.log(error);
    }else{
        if ( result.subscription.status === "active" ){
            models.Subscriptions.update(
                {
                    status: 'active'
                },
                {
                    where: { 
                        id: subscription.id
                    }
                }
            )
        }
    }
    });
}

async function pauseSubscription(merchant, subscription) {
    chargebee.configure({
        site: merchant.site_name,
        api_key: merchant.api_key
    })
    return chargebee.subscription.pause(subscription.cb_subscription_id,{
    }).request(function(error,result) {
    if(error){
        console.log(error);
    }else{
        if ( result.subscription.status === "paused" ){
            models.Subscriptions.update(
                {
                    status: 'paused'
                },
                {
                    where: { 
                        id: subscription.id
                    }
                }
            )
        }
    }
    });
}


async function cancelSubscription(merchant, subscription) {
    chargebee.configure({
        site: merchant.site_name,
        api_key: merchant.api_key
    })
    return chargebee.subscription.cancel(subscription.cb_subscription_id,{
    end_of_term : true
    }).request(function(error,result) {
    if(error){
        //handle error
        console.log(error);
    }else{
        if ( result.subscription.status === "non_renewing" ){
            models.Subscriptions.update(
                {
                    status: 'cancelled'
                },
                {
                    where: { 
                        id: subscription.id
                    }
                }
            )
        }
    }
    });
}

async function createSubscription(merchant, user) {
    chargebee.configure({
        site: merchant.site_name,
        api_key: merchant.api_key
    })
    return chargebee.subscription.create({
        plan_id: merchant.Plans[0].plan_chargebee_id,
        auto_collection: "off",
        customer: {
            id: user.username,
            first_name: user.username,
            email: user.email,
        }
    }).request(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            var subscription = result.subscription;
            var customer = result.customer;
            return models.Subscriptions.create({
                    "cb_subscription_id": subscription.id,
                    "status": subscription.status,
                    "cb_customer_id": customer.id,
                    "merchant_id": merchant.id,
                    "category_id": merchant.category_id,
                    "plan_id": merchant.Plans[0].id,
                    "user_id": user.id
                }).error(function (err) {
                    console.log(err);
                }).then(function (subscription) {
                    console.log( "subscription added -->", subscription )
                    return subscription;
                });
        }
    });
}

async function addData(site, site_api_key) {
    chargebee.configure({
        site: site,
        api_key: site_api_key,
    });
    await chargebee.plan
        .list()
        .request(function (error, result) {
            if (error) {
                //handle error
                console.log(error);
            } else {
                for (var i = 0; i < result.list.length; i++) {
                    var entry = result.list[i]
                    var plan = entry.plan;
                    addPlans(plan, site)
                }
            }
        });
}

async function addPlans(plan, site) {
    models.Merchants.findAll({
        limit: 1,
        where: {
            "site_name": site
        }
    }).then(function (entries) {
        models.Plans.create({
            "name": plan.name,
            "price": plan.price,
            "frequency": 1,
            "plan_chargebee_id": plan.id,
            "merchant_id": entries[0].id
        }).error(function (err) {
            console.log(err);
        }).then(function () {
            console.log("plan added -->" + plan.name);
        });
    })
}

async function addCategories(plan) {
    await models.Categories.findOrCreate({
        where: {
            "name": plan.cf_category
        }
    }).error(function (err) {
        console.log(err);
    }).then(function () {
        console.log("callback!!");
    });
}

chargebee_actions.addData = addData
chargebee_actions.createSubscription = createSubscription
chargebee_actions.cancelSubscription = cancelSubscription
chargebee_actions.pauseSubscription = pauseSubscription
chargebee_actions.resumeSubscription = resumeSubscription
module.exports = chargebee_actions;