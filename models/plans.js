'use strict';
module.exports = (sequelize, DataTypes) => {
  const Plans = sequelize.define('Plans', {
    name: DataTypes.STRING,
    plan_chargebee_id: DataTypes.STRING,
    price: DataTypes.DECIMAL,
    frequency: DataTypes.INTEGER
  }, {});
  Plans.associate = function(models) {
    Plans.belongsTo(models.Merchants, {
      foreignKey: 'merchant_id',
    });
  }
  return Plans;
};