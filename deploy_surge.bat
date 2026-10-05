@echo off
chcp 65001 >nul
title Afet Modu - Surge Hızlı Canlıya Alma
echo ==========================================================
echo        AFET MODU SİSTEMİ - SURGE İLE ANINDA CANLIYA ALMA
echo ==========================================================
echo.
echo Proje dizini taranıyor ve yayına hazırlanıyor...
echo.
npx surge .
echo.
echo ==========================================================
echo Yayına alma tamamlandı! Google Chrome ve tüm cihazlarda açabilirsiniz.
echo ==========================================================
pause
