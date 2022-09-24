"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("Todos", "date", {
      type: Sequelize.STRING(10),
    });
    await queryInterface.addColumn("ChallengedTodos", "date", {
      type: Sequelize.STRING(10),
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("Todos", "date");
    await queryInterface.removeColumn("ChallengedTodos", "date");
  },
};

// 서비스 런칭 후 테이블이나 컬럼의 변경이 생길 경우, sequelize Synchronization의 force와 alter 옵션은 DB를 파괴할(?) 수도 있어서 sequelize-cli의 migration 기능 사용하기
// npx sequelize migration:create --name [파일 이름]
// npx sequelize db:migrate   // up 실행
// npx sequelize db:migrate:undo    // down 실행
