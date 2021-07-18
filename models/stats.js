'use strict';
module.exports = (sequelize, DataTypes) => {
  const Stats = sequelize.define('Stats', {
    name: DataTypes.STRING,
    category: DataTypes.STRING,
    count: DataTypes.INTEGER
  }, {});
  Stats.associate = function(models) {
  };
  return Stats;
};