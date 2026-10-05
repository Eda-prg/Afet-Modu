@echo off
chcp 65001 >nul
title Afet Modu - Netlify Canlıya Alma (Production Deploy)
echo ==========================================================
echo        AFET MODU SİSTEMİ - NETLIFY İLE CANLIYA ALMA
echo ==========================================================
echo.
echo 1) Netlify CLI başlatılıyor...
echo 2) İlk kez çalıştırıyorsanız tarayıcınızda oturum açma sayfası açılacaktır.
echo.
npx netlify-cli deploy --prod --dir=.
echo.
echo ==========================================================
echo İşlem tamamlandı! Verilen Live URL adresinden sitenize erişebilirsiniz.
echo ==========================================================
pause
