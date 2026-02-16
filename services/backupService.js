const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const {
  serverName,
  backupDatabaseName,
  logDatabaseName,
  username,
  password,
  backupDir,
  currentUser
} = config;


// // Generate dynamic backup file name
// function generateBackupFileName() {
//   const now = new Date();
//   const timestamp = now
//     .toISOString()
//     .replace(/[:.]/g, '-')   // safe filename
//     .replace('T', '_')
//     .slice(0, 19);
//   return `${backupDatabaseName}_${timestamp}.bak`;
// }

// Generate dynamic backup file name with Indian time (IST)
function generateBackupFileName() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };

  // Format date-time in IST
  const istTime = new Intl.DateTimeFormat("en-GB", options).format(now);

  // Replace characters for safe filename
  const safeTimestamp = istTime.replace(/[/, ]/g, "_").replace(/:/g, "-");

  return `${backupDatabaseName}_${safeTimestamp}.bak`;
}


// Insert logs into BackupLog and pereco_ActivityLog
function logBackup(status, backupFilePath, errorMessage = '',userId) {
  const backupFileName = path.basename(backupFilePath);
  const escapedError = errorMessage.replace(/'/g, "''");
  const escapedServerName = serverName.replace(/\\/g, '\\\\');
  const escapedBackupPath = backupFilePath.replace(/\\/g, '\\\\');

  const actionDesc = status === 'Success'
    ? `Backup succeeded by ${currentUser}`
    : `Backup failed by ${currentUser}: ${escapedError}`;

  const logQuery =
    `INSERT INTO dbo.BackupLog (DatabaseName, BackupFileName, BackupPath, Status, ErrorMessage, CreateBy) VALUES ` +
    `(N'${backupDatabaseName}', N'${backupFileName}', N'${escapedBackupPath}', N'${status}', N'${escapedError}', N'${userId}'); ` +
    `INSERT INTO dbo.pereco_ActivityLog (ActivityType, PerformedBy, PerformedOn, Notes, Location, IsSucces, LogType) VALUES ` +
    `(1, N'${userId}', GETDATE(), N'${actionDesc}', N'${escapedServerName}', ${status === 'Success' ? 1 : 0}, 1);`;

  const logCommand = `sqlcmd -S "${serverName}" -U "${username}" -P "${password}" -d "${logDatabaseName}" -Q "${logQuery}"`;

  console.log(" Inserting logs:\n", logCommand);

  exec(logCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(" Failed to insert logs:", err.message);
      return;
    }
    console.log(" Backup and audit logs inserted.");
  });
}


// Perform the actual DB backup
function backupDatabase(userId) {
  return new Promise((resolve, reject) => {
    const backupFileName = generateBackupFileName();
    const backupFilePath = path.join(backupDir, backupFileName);

    const sqlCommand = `sqlcmd -S "${serverName}" -U "${username}" -P "${password}" -Q "BACKUP DATABASE [${backupDatabaseName}] TO DISK='${backupFilePath}' WITH INIT"`;

    console.log(" Executing SQLCMD:\n", sqlCommand);

    exec(sqlCommand, (error, stdout, stderr) => {
      if (error) {
        logBackup('Failed', backupFilePath, error.message,userId);
        return reject(new Error(`Backup failed: ${error.message}`));
      }

      fs.access(backupFilePath, fs.constants.F_OK, (err) => {
        if (err) {
          logBackup('Failed', backupFilePath, 'Backup file not found after backup',userId);
          return reject(new Error(`Backup completed but file not found at ${backupFilePath}`));
        }

        logBackup('Success', backupFilePath,'',userId);
        resolve({ backupFileName, backupFilePath });
      });
    });
  });
}
function restoreDatabase(databaseName, backupFilePath) {
  return new Promise((resolve, reject) => {
    console.log(`Starting restore for DB=${databaseName}, file=${backupFilePath}`);

    const setSingleUserCmd = `sqlcmd -S "${serverName}" -U "${username}" -P "${password}" -Q "ALTER DATABASE [${databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"`;
    const restoreCmd = `sqlcmd -S "${serverName}" -U "${username}" -P "${password}" -Q "RESTORE DATABASE [${databaseName}] FROM DISK='${backupFilePath}' WITH REPLACE, RECOVERY"`;
    const setMultiUserCmd = `sqlcmd -S "${serverName}" -U "${username}" -P "${password}" -Q "ALTER DATABASE [${databaseName}] SET MULTI_USER"`;

    exec(setSingleUserCmd, (err1) => {
      if (err1) return reject(new Error(`Restore failed (single user): ${err1.message}`));

      exec(restoreCmd, (err2, stdout, stderr) => {
        console.log("Restore output:", stdout, stderr);
        if (err2) {
          exec(setMultiUserCmd, () => {});
          return reject(new Error(`Restore failed: ${err2.message}`));
        }

        exec(setMultiUserCmd, (err3) => {
          if (err3) console.warn("Warning: Could not set DB back to MULTI_USER:", err3.message);
          resolve(`Restore completed successfully for ${databaseName} from ${backupFilePath}`);
        });
      });
    });
  });
}



module.exports = {
  backupDatabase,
  restoreDatabase,
  logBackup
};
