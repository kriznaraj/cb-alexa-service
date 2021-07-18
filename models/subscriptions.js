'use strict';
module.exports = (sequelize, DataTypes) => {
  const Subscriptions = sequelize.define('Subscriptions', {
    cb_customer_id: DataTypes.STRING,
    cb_subscription_id: DataTypes.STRING,
    status: DataTypes.STRING
  }, {});
  Subscriptions.associate = function(models) {
    Subscriptions.belongsTo(models.Merchants, {
      foreignKey: 'merchant_id',
    });
    Subscriptions.belongsTo(models.Plans, {
      foreignKey: 'plan_id',
    });
    Subscriptions.belongsTo(models.Users, {
      foreignKey: 'user_id',
    });
    Subscriptions.belongsTo(models.Categories, {
      foreignKey: 'category_id',
    });
  }
  return Subscriptions;
};