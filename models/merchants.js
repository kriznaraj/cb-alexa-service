'use strict';
module.exports = (sequelize, DataTypes) => {
  const Merchants = sequelize.define('Merchants', {
    name: DataTypes.STRING,
    site_name: DataTypes.STRING,
    api_key: DataTypes.STRING,
    lat: DataTypes.STRING,
    long: DataTypes.STRING
  }, {});
  
  Merchants.associate = function(models) {
    Merchants.belongsTo(models.Categories, {
      foreignKey: 'category_id',
    });
    Merchants.hasMany(models.Subscriptions, {
      foreignKey: 'merchant_id',
    });
    Merchants.hasMany(models.Plans, {
      foreignKey: 'merchant_id',
    });
  }

  return Merchants;
};