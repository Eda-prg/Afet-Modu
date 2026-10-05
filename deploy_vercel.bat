@echo off
chcp 65001 >nul
title Afet Modu - Vercel Canlıya Alma (Production Deploy)
echo ==========================================================
echo        AFET MODU SİSTEMİ - VERCEL İLE CANLIYA ALMA
echo ==========================================================
echo.
echo 1) Vercel CLI başlatılıyor...
echo 2) İlk kez çalıştırıyorsanız tarayıcınızda Vercel onay ekranı açılacaktır.
echo 3) Onayladıktan sonra birkaç saniye içinde "https://...vercel.app" linkiniz hazır olacak!
echo.
npx vercel --prod
echo.
echo ==========================================================
echo Canlıya alma işlemi tamamlandı. Yukarıdaki linkten projenizi açabilirsiniz!
echo ==========================================================
pause
