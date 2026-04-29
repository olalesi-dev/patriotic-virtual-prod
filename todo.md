# TODO

- [ ] Re-enable homepage identity verification modal (temporarily disabled for screen demo)
  - File: `emr-portal/src/features/landing/components/LandingModals.tsx`
  - Restore `setAuthMode("verify")` in `handleGoogleAuth` and `handleRegister`.
  - Remove temporary bypass (`setAuthModalOpen(false); onLoginSuccess();`) added right after registration.
  - Validate `VOUCHED_DONE` flow still writes `vouchedJobId` / `isIdentityVerified` and proceeds to consult modal.
