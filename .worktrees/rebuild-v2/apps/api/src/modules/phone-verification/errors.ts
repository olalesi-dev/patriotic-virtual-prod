export const getPhoneVerificationErrorStatus = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

  switch (error.message) {
    case 'Phone number must include a valid country code or be a valid 10-digit US number.': {
      return 400;
    }
    case 'Verification code was not accepted.': {
      return 400;
    }
    case 'No pending verification was found for this phone number.': {
      return 404;
    }
    case 'No pending verification code was found. Please request a new code.': {
      return 409;
    }
    case 'Verification code has expired. Please request a new code.': {
      return 410;
    }
    case 'Maximum verification attempts exceeded. Please request a new code.':
    case 'Only one SMS per user is allowed per minute.': {
      return 429;
    }
    default: {
      return 500;
    }
  }
};
