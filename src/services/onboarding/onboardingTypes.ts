export type OnboardingMode = "NEW" | "EXISTING";
export type OnboardingStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type OnboardingStepKey =
  | "CHOOSE_COMPANY_MODE"
  | "COMPANY_NAME"
  | "COMPANY_PICK"
  | "BUSINESS_STAGE"
  | "YEARS_OPERATING"
  | "TEAM_SIZE"
  | "WHAT_DOES_COMPANY_DO"
  | "WHAT_OFFERS"
  | "TARGET_CUSTOMER"
  | "CURRENT_CLIENT_TYPE"
  | "ACTIVE_CLIENTS"
  | "TOP_CLIENT_CONCENTRATION"
  | "BUSINESS_FLOW"
  | "INCOME_STREAMS"
  | "EXPENSE_CATEGORIES"
  | "MONTHLY_INCOME_RANGE"
  | "MONTHLY_EXPENSE_RANGE"
  | "MATURITY_LEVEL"
  | "GOALS"
  | "PROBLEMS";

export type ChatMessage = {
  id: string;
  role: "bot" | "user";
  content: string;
};

export type OnboardingQuestion =
  | {
      stepKey: OnboardingStepKey;
      prompt: string;
      input:
        | { type: "buttons"; options: Array<{ label: string; value: string }> }
        | { type: "select"; options: Array<{ label: string; value: string }> }
        | { type: "textarea"; placeholder?: string };
    };

export type ParsedListItem = { name: string; description?: string };

