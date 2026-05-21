- [ ] Edit backend api/paystack/verify-wallet-funding.js to return alreadyProcessed payload when wallet_deposits.status === 'successful' and never call Paystack again.
- [ ] Edit frontend src/pages/WalletFundingCallbackPage.jsx:
  - [ ] Prevent showing fallback error after 4 seconds; show only after 15-20 seconds.
  - [ ] If backend returns success true, show Account Funded Successfully immediately.
  - [ ] Treat alreadyProcessed/already_processed as success.
  - [ ] Do not await retryFetchUserData before showing success; run it in the background.
  - [ ] Prevent duplicate verification calls for the same reference.
  - [ ] Update fallback copy to: "Payment verification is taking longer than expected. If your Available Amount has updated, your funding was successful." (non-error styling).
- [ ] Run npm run build and fix any lint/build errors.

