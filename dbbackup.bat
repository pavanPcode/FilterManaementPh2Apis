@echo off
setlocal

:: SQL Server details
set SERVER=GILGGPSRV268
set DATABASE=DFMG
set USER=sa
set PASSWORD=s@dguru123

:: Backup folder (set only once here)
set BACKUP_DIR=E:\Controlytics\Auto_Backup

:: Get timestamp in YYYYMMDD_HHMM format (safe across locales)
for /f "skip=1 tokens=1 delims=." %%a in ('wmic os get localdatetime') do if not defined ts set ts=%%a
set YYYY=%ts:~0,4%
set MM=%ts:~4,2%
set DD=%ts:~6,2%
set HH=%ts:~8,2%
set MIN=%ts:~10,2%

:: Destination file
set DEST=%BACKUP_DIR%\%DATABASE%_%YYYY%-%MM%-%DD%_%HH%-%MIN%.bak

:: Create folder if missing
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Run SQL Server backup
sqlcmd -S %SERVER% -U %USER% -P %PASSWORD% -Q "BACKUP DATABASE [%DATABASE%] TO DISK='%DEST%' WITH INIT"

echo Backup of %DATABASE% completed at %DATE% %TIME%

:: Delete backup files older than 7 days
forfiles /p "%BACKUP_DIR%" /s /m *.bak /d -7 /c "cmd /c del @path"

endlocal







@REM @echo off
@REM setlocal

@REM :: SQL Server details
@REM set SERVER=URI\SQLEXPRESS
@REM set DATABASE=RND_HR
@REM set USER=sa
@REM set PASSWORD=sadguru

@REM :: Backup folder (set only once here)
@REM set BACKUP_DIR=C:\SQLBackups


@REM :: Get date and time without spaces
@REM for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
@REM     set YYYY=%%d
@REM     set MM=%%b
@REM     set DD=%%c
@REM )
@REM for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
@REM     set HH=%%a
@REM     set MIN=%%b
@REM )

@REM :: Handle AM/PM format (if exists)
@REM set HH=%HH: =0%
@REM if "%time:~9,2%"=="PM" (
@REM     if %HH% lss 12 set /a HH=HH+12
@REM )
@REM if "%time:~9,2%"=="AM" (
@REM     if %HH%==12 set HH=00
@REM )

@REM :: Destination folder with clean timestamp
@REM set DEST=%BACKUP_DIR%\%DATABASE%_%YYYY%-%MM%-%DD%_%HH%-%MIN%.bak

@REM :: Create folder if missing
@REM if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

@REM :: Run SQL Server backup
@REM sqlcmd -S %SERVER% -U %USER% -P %PASSWORD% -Q "BACKUP DATABASE [%DATABASE%] TO DISK='%DEST%' WITH INIT"

@REM echo Backup of %DATABASE% completed at %DATE% %TIME%

@REM :: Delete backup files older than 7 days
@REM forfiles /p "%BACKUP_DIR%" /s /m *.bak /d -7 /c "cmd /c del @path"

@REM endlocal
