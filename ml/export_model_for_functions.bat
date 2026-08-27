@echo off
REM Export trained field_classifier.joblib into functions/models/field_classifier.json
cd /d "%~dp0\.."
echo Exporting RandomForest for Cloud Functions...
python -m ml.export_rf_json
if errorlevel 1 (
  echo.
  echo If training is missing, run ml\train_eurosat.bat first.
  pause
  exit /b 1
)
echo.
echo Model JSON ready under functions\models\field_classifier.json
echo Deploy with:
echo   npx firebase deploy --only functions:classifyLocation --project prithviscan
pause
