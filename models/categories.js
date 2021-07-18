'use strict';
module.exports = (sequelize, DataTypes) => {
  const Categories = sequelize.define('Categories', {
    name: DataTypes.STRING
  }, {});
  Categories.associate = function(models) {
    Categories.hasMany(models.Merchants, {
      foreignKey: 'category_id'  
    });
    Categories.hasMany(models.Subscriptions, {
      foreignKey: 'category_id'  
    });
    // associations can be defined here
  };
  return Categories;
};