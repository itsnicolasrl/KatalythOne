import type { OnboardingMode, OnboardingStepKey } from "@/src/services/onboarding/onboardingTypes";

export const onboardingSteps: OnboardingStepKey[] = [
  "CHOOSE_COMPANY_MODE",
  "COMPANY_NAME",
  "COMPANY_PICK",
  "BUSINESS_STAGE",
  "YEARS_OPERATING",
  "TEAM_SIZE",
  "WHAT_DOES_COMPANY_DO",
  "WHAT_OFFERS",
  "TARGET_CUSTOMER",
  "CURRENT_CLIENT_TYPE",
  "ACTIVE_CLIENTS",
  "TOP_CLIENT_CONCENTRATION",
  "BUSINESS_FLOW",
  "INCOME_STREAMS",
  "EXPENSE_CATEGORIES",
  "MONTHLY_INCOME_RANGE",
  "MONTHLY_EXPENSE_RANGE",
  "MATURITY_LEVEL",
  "GOALS",
  "PROBLEMS",
];

export function getNextStep(params: {
  current: OnboardingStepKey;
  mode: OnboardingMode;
}): OnboardingStepKey | null {
  const { current, mode } = params;

  switch (current) {
    case "CHOOSE_COMPANY_MODE":
      return mode === "NEW" ? "COMPANY_NAME" : "COMPANY_PICK";
    case "COMPANY_NAME":
      return "BUSINESS_STAGE";
    case "COMPANY_PICK":
      return "BUSINESS_STAGE";
    case "BUSINESS_STAGE":
      return "YEARS_OPERATING";
    case "YEARS_OPERATING":
      return "TEAM_SIZE";
    case "TEAM_SIZE":
      return "WHAT_DOES_COMPANY_DO";
    case "WHAT_DOES_COMPANY_DO":
      return "WHAT_OFFERS";
    case "WHAT_OFFERS":
      return "TARGET_CUSTOMER";
    case "TARGET_CUSTOMER":
      return "CURRENT_CLIENT_TYPE";
    case "CURRENT_CLIENT_TYPE":
      return "ACTIVE_CLIENTS";
    case "ACTIVE_CLIENTS":
      return "TOP_CLIENT_CONCENTRATION";
    case "TOP_CLIENT_CONCENTRATION":
      return "BUSINESS_FLOW";
    case "BUSINESS_FLOW":
      return "INCOME_STREAMS";
    case "INCOME_STREAMS":
      return "EXPENSE_CATEGORIES";
    case "EXPENSE_CATEGORIES":
      return "MONTHLY_INCOME_RANGE";
    case "MONTHLY_INCOME_RANGE":
      return "MONTHLY_EXPENSE_RANGE";
    case "MONTHLY_EXPENSE_RANGE":
      return "MATURITY_LEVEL";
    case "MATURITY_LEVEL":
      return "GOALS";
    case "GOALS":
      return "PROBLEMS";
    case "PROBLEMS":
      return null;
    default:
      return null;
  }
}

