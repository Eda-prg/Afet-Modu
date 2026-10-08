@echo off
chcp 65001 >nul
title Afet Modu - Vercel Canliya Alma
color 0b

echo ==========================================================
echo        AFET MODU SISTEMI - VERCEL ILE CANLIYA ALMA
echo ==========================================================
echo.
echo ADIM 1: Vercel hesabiniza giris yapiliyor...
echo Tarayiciniz acilacak, GitHub veya Google ile giris yapin.
echo Giris tamamlandiktan sonra bu pencereye geri donun.
echo.
call npx -y vercel login
echo.
echo ----------------------------------------------------------
echo ADIM 2: Proje canliya yukleniyor...
echo ----------------------------------------------------------
echo.
call npx -y vercel deploy dist --prod --yes
echo.
if %ERRORLEVEL% EQU 0 (
    echo ==========================================================
    echo [BASARILI] Projeniz canliya alindi!
    echo Yukaridaki Production linkini tarayicinizda acin.
    echo ==========================================================
) else (
    echo ==========================================================
    echo [HATA] Deploy basarisiz. Tekrar deneyin.
    echo ==========================================================
)
echo.
pause
