// app.js
const express = require('express');
const { exec } = require('child_process');
const config = require('../config');
const { backupDatabase, restoreDatabase } = require('./backupService');
const { validateHeaderName } = require('http');

// const app = express();
const app = express.Router();


app.get('/backup', async (req, res) => {
  console.log(" Received request: /backup");
  try {
    // Read UserID from query string (ex: /backup?UserID=20)
  const userId = req.query.UserID;

  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'UserID is required'
    });
  }
    const result = await backupDatabase(userId);
    res.json({
      status: 'success',
      message: `Backup completed `,
      result: result
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/last', (req, res) => {
  const query = `SELECT TOP 1 * FROM dbo.BackupLog ORDER BY Id DESC`;
  const sql = `sqlcmd -S "${config.serverName}" -U "${config.username}" -P "${config.password}" -d "${config.logDatabaseName}" -Q "${query}" -s "," -W`;

  exec(sql, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });

    const lines = stdout.trim().split('\n').filter(line => line.trim());
    if (lines.length >= 2) {
      const [columns, values] = lines;
      const keys = columns.split(',').map(k => k.trim());
      const vals = values.split(',').map(v => v.trim());
      const lastLog = {};
      keys.forEach((key, i) => lastLog[key] = vals[i]);
      res.json({ lastBackup: lastLog });
    } else {
      res.json({ lastBackup: null });
    }
  });
});

app.get('/logs', (req, res) => {
  // flatten query to one line
  const query = `
    SET NOCOUNT ON;
    SELECT 
      b.Id, 
      b.DatabaseName, 
      b.BackupFileName, 
      b.BackupPath, 
      b.Status, 
      ISNULL(b.ErrorMessage, '') AS ErrorMessage, 
      CONVERT(VARCHAR(19), b.BackupTime, 120) AS BackupTime,
      b.CreateBy,
      ISNULL(u.email, '') AS UserName
    FROM dbo.BackupLog b
    LEFT JOIN [dbo].[pereco_Users] u ON u.UserID = b.CreateBy
    ORDER BY b.Id DESC
  `.replace(/\s+/g, ' ').trim(); // <<< compress to one line

  const sql = `sqlcmd -S "${config.serverName}" -U "${config.username}" -P "${config.password}" -d "${config.logDatabaseName}" -Q "${query}" -s "|" -W -h -1`;

  exec(sql, (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const lines = stdout.trim().split('\n').filter(line => {
      return line.trim() && !line.includes("rows affected");
    });

    const logs = lines.map(line => {
      const values = line.split('|').map(v => v.trim());
      return {
        Id: values[0],
        DatabaseName: values[1],
        BackupFileName: values[2],
        BackupPath: values[3],
        Status: values[4],
        ErrorMessage: values[5],
        BackupTime: values[6],
        CreateBy: values[7],
        UserName: values[8] || null
      };
    });

    res.json(logs);
  });
});



app.get('/restore/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT TOP 1 DatabaseName, BackupPath FROM dbo.BackupLog WHERE Id=${id}`;
  const sql = `sqlcmd -S "${config.serverName}" -U "${config.username}" -P "${config.password}" -d "${config.logDatabaseName}" -Q "${query}" -s "," -W`;

  exec(sql, async (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });

    const lines = stdout.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(404).json({ error: `No backup found with Id=${id}` });
    }

    const [columns, values] = lines;
    const keys = columns.split(',').map(k => k.trim());
    const vals = values.split(',').map(v => v.trim());
    const row = {};
    keys.forEach((k, i) => row[k] = vals[i]);

    const { DatabaseName, BackupPath } = row;

    try {
      const result = await restoreDatabase(DatabaseName, BackupPath);
      res.json({
        status: 'success',
        message: `Restore completed for database: ${DatabaseName}`,
        result
      });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });
});

module.exports = app;
