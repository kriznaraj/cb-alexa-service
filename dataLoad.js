const fs = require('fs')
const chargebee_wrapper = require('./chargebee')
const models = require('./models');

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

try {
    console.log("Deleting old db...")
    fs.unlinkSync('database.sqlite3')
} catch (err) {
    console.error(err)
}

let rawData = fs.readFileSync('api_keys.json');
let json = JSON.parse(rawData);

console.log("Loading Data to DB")
models.sequelize.sync().then(function () {
    json.forEach(
        function (site_data) {
            addMerchant(site_data)
            sleep(500).then(() => {
                chargebee_wrapper.addData(site_data.site_name, site_data.api_key);
            });
        }
    );
});

async function addMerchant(site_data) {
    models.Categories.findOrCreate({
        where: {
            "name": site_data.category
        }
    }).then(function (entries) {
        models.Merchants.create({
            "name": site_data.merchant,
            "site_name": site_data.site_name,
            "api_key": site_data.api_key,
            "category_id": entries[0].id,
            "lat": "13.082680",
            "long": "80.270721"
        }).error(function (err) {
            console.log(err);
        }).then(function () {
            console.log("merchant added -->" + site_data.site_name);
        });
    });
}
