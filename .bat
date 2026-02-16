@echo off
REM This batch file calls your Scheler Services URL

curl https://ggp-fms.granulesindia.com/runScheduleJob

curl https://ggp-fms.granulesindia.com/checkPasswordExpiry

REM Optional: Pause to view output if running manually
REM pause
