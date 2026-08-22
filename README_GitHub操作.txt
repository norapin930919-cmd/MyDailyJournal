GitHub 操作
1. 建立一個新的 Private repository。
2. 上傳這個資料夾內所有檔案；一定要包含 .github/workflows/build-ios.yml。
3. 到 Actions → Build unsigned iOS IPA → Run workflow。
4. 等綠色勾勾後，進入該次執行，在 Artifacts 下載 MyDailyJournal-unsigned-ipa。
5. 解壓縮取得 MyDailyJournal-unsigned.ipa，再交給 SideStore 嘗試重簽安裝。

注意：這是未簽署 IPA。SideStore 是否能成功重簽仍受 iOS、免費 Apple 帳號與 entitlement 限制影響。
