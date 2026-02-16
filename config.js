// config.js
const path = require('path');
require("dotenv").config();

module.exports = {
  port: 3000,
  serverName: process.env.DB_SERVER,
  backupDatabaseName: process.env.DB_DATABASE,
  logDatabaseName: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  backupDir: process.env.DB_backupDir,
  backupFileName: process.env.DB_backupFileName,
  get backupFilePath() {
    return path.join(this.backupDir, this.backupFileName);
  },
  get currentUser() {
    return process.env.USERNAME || process.env.USER || 'UnknownUser';
  }
};
