const Sequelize = require("sequelize");

module.exports = class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        userId: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        nickname: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        mbti: {
          type: Sequelize.STRING(4),
          allowNull: true,
        },
        profile: {
          type: Sequelize.STRING(200),
          allowNull: true,
          defaultValue: "none",
        },
        todoCounts: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        challengeCounts: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        snsId: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        provider: {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "local",
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: false,
        modelName: "User",
        tableName: "users",
        paranoid: false,
        charset: "utf8",
        collate: "utf8_general_ci",
        indexes: [
          {
            fields: ["email"],
            unique: true,
          },
          {
            fields: ["snsId"],
            unique: true,
          },
          { fields: ["snsId", "provider"], unique: true },
        ],
      }
    );
  }

  static associate(db) {
    db.User.hasMany(db.Todo, {
      foreignKey: "userId",
      sourceKey: "userId",
      onDelete: "CASCADE",
    });
    db.User.hasMany(db.ChallengedTodo, {
      foreignKey: "userId",
      sourceKey: "userId",
      onDelete: "CASCADE",
    });
    db.User.hasMany(db.Comment, {
      foreignKey: "userId",
      sourceKey: "userId",
      onDelete: "CASCADE",
    });
    db.User.hasMany(db.Follow, {
      foreignKey: "userIdFollower",
      sourceKey: "userId",
      onDelete: "CASCADE",
      as: "follower",
    });
    db.User.hasMany(db.Follow, {
      foreignKey: "userIdFollowing",
      sourceKey: "userId",
      onDelete: "CASCADE",
      as: "following",
    });
  }
};
