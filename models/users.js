'use strict';
module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define('Users', {
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    token: DataTypes.STRING,
    lat: DataTypes.STRING,
    long: DataTypes.STRING
  }, {});
  Users.associate = function(models) {
    Users.hasMany(models.Subscriptions, {
      foreignKey: 'user_id',
    });
    // associations can be defined here
  };
  return Users;
};