@echo off
REM Train PrithviScan field classifier from your EuroSAT_RGB folder.
REM Dataset path (from your PC):
set EUROSAT=D:\Kushal\EuroSAT_RGB\EuroSAT_RGB

cd /d "%~dp0\.."

if not exist "%EUROSAT%\AnnualCrop" (
  echo ERROR: EuroSAT not found at:
  echo   %EUROSAT%
  echo Make sure folders like AnnualCrop, Forest, Residential exist there.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv .venv
  call .venv\Scripts\activate.bat
  pip install -r ml\requirements.txt
) else (
  call .venv\Scripts\activate.bat
)

echo.
echo Training from: %EUROSAT%
echo field classes: AnnualCrop, PermanentCrop, Pasture
echo not_field: Residential, Industrial, Highway, River, SeaLake, Forest, HerbaceousVegetation
echo.

python -m ml.train_field_classifier --eurosat "%EUROSAT%"

echo.
echo Done. Model saved to ml\models\field_classifier.joblib
pause
