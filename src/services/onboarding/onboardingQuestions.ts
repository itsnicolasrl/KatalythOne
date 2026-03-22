import type { OnboardingQuestion, OnboardingStepKey, OnboardingMode } from "@/src/services/onboarding/onboardingTypes";

export function getQuestion(params: { stepKey: OnboardingStepKey; mode?: OnboardingMode }): OnboardingQuestion {
  switch (params.stepKey) {
    case "CHOOSE_COMPANY_MODE":
      return {
        stepKey: "CHOOSE_COMPANY_MODE",
        prompt: "¿Tu empresa es nueva o ya existe?",
        input: {
          type: "buttons",
          options: [
            { label: "Empresa nueva", value: "NEW" },
            { label: "Empresa existente", value: "EXISTING" },
          ],
        },
      };
    case "COMPANY_NAME":
      return {
        stepKey: "COMPANY_NAME",
        prompt: "¿Cómo se llama tu empresa?",
        input: { type: "textarea", placeholder: "Ej: Katalyth One Servicios..." },
      };
    case "COMPANY_PICK":
      return {
        stepKey: "COMPANY_PICK",
        prompt: "Selecciona la empresa a la que quieres dar formato al modelo digital:",
        input: { type: "select", options: [] }, // se rellena desde el endpoint
      };
    case "BUSINESS_STAGE":
      return {
        stepKey: "BUSINESS_STAGE",
        prompt: "¿En qué etapa está tu empresa hoy?",
        input: {
          type: "buttons",
          options: [
            { label: "Idea / validación inicial", value: "IDEA" },
            { label: "Operando con pocos clientes", value: "EARLY_OPERATION" },
            { label: "Operando de forma estable", value: "STABLE_OPERATION" },
            { label: "Escalando", value: "SCALING" },
          ],
        },
      };
    case "YEARS_OPERATING":
      return {
        stepKey: "YEARS_OPERATING",
        prompt: "¿Cuánto tiempo lleva operando?",
        input: {
          type: "buttons",
          options: [
            { label: "Aún no inicio", value: "0" },
            { label: "Menos de 1 año", value: "0-1" },
            { label: "1 a 3 años", value: "1-3" },
            { label: "Más de 3 años", value: "3+" },
          ],
        },
      };
    case "TEAM_SIZE":
      return {
        stepKey: "TEAM_SIZE",
        prompt: "¿Cómo está conformado el equipo?",
        input: {
          type: "buttons",
          options: [
            { label: "Trabajo solo", value: "SOLO" },
            { label: "2 a 5 personas", value: "2-5" },
            { label: "6 a 10 personas", value: "6-10" },
            { label: "Más de 10", value: "10+" },
          ],
        },
      };
    case "WHAT_DOES_COMPANY_DO":
      return {
        stepKey: "WHAT_DOES_COMPANY_DO",
        prompt:
          "¿Qué hace la empresa? Describe qué ofrece, qué problema resuelve y cómo se diferencia.",
        input: { type: "textarea", placeholder: "Ej: Ofrecemos consultoría..." },
      };
    case "WHAT_OFFERS":
      return {
        stepKey: "WHAT_OFFERS",
        prompt: "¿Qué ofrece? Lista productos/servicios (uno por línea).",
        input: { type: "textarea", placeholder: "- Servicio de ...\n- Producto de ..."} ,
      };
    case "TARGET_CUSTOMER":
      return {
        stepKey: "TARGET_CUSTOMER",
        prompt:
          "¿Quién es el cliente objetivo? Describe el perfil (industria, tamaño, contexto) y el problema que resuelve.",
        input: { type: "textarea", placeholder: "Ej: pymes de ..." },
      };
    case "CURRENT_CLIENT_TYPE":
      return {
        stepKey: "CURRENT_CLIENT_TYPE",
        prompt: "¿Qué tipo de clientes atiendes hoy principalmente?",
        input: {
          type: "buttons",
          options: [
            { label: "Personas", value: "B2C" },
            { label: "Empresas", value: "B2B" },
            { label: "Mixto", value: "MIXED" },
          ],
        },
      };
    case "ACTIVE_CLIENTS":
      return {
        stepKey: "ACTIVE_CLIENTS",
        prompt: "¿Cuántos clientes activos tienes aproximadamente?",
        input: {
          type: "buttons",
          options: [
            { label: "0 a 5", value: "0-5" },
            { label: "6 a 20", value: "6-20" },
            { label: "21 a 50", value: "21-50" },
            { label: "Más de 50", value: "50+" },
          ],
        },
      };
    case "TOP_CLIENT_CONCENTRATION":
      return {
        stepKey: "TOP_CLIENT_CONCENTRATION",
        prompt: "¿Qué porcentaje aproximado de ingresos depende de tu cliente principal?",
        input: {
          type: "buttons",
          options: [
            { label: "Menos del 20%", value: "<20" },
            { label: "20% a 50%", value: "20-50" },
            { label: "50% a 70%", value: "50-70" },
            { label: "Más del 70%", value: ">70" },
          ],
        },
      };
    case "BUSINESS_FLOW":
      return {
        stepKey: "BUSINESS_FLOW",
        prompt:
          "Cuéntame el flujo del negocio: desde que aparece la oportunidad hasta que se entrega y se cobra. (uno por línea)",
        input: { type: "textarea", placeholder: "- Prospección...\n- Venta...\n- Entrega...\n- Cobranza..." },
      };
    case "INCOME_STREAMS":
      return {
        stepKey: "INCOME_STREAMS",
        prompt: "Ingresa tus ingresos: lista streams de ingresos (uno por línea). Si puedes, separa nombre y descripción con `:`",
        input: { type: "textarea", placeholder: "- Consultoría: ...\n- Mantenimiento: ..." },
      };
    case "EXPENSE_CATEGORIES":
      return {
        stepKey: "EXPENSE_CATEGORIES",
        prompt: "Ingresa tus gastos: lista categorías de gastos (uno por línea). Si puedes, separa nombre y descripción con `:`",
        input: { type: "textarea", placeholder: "- Nómina: ...\n- Software: ..." },
      };
    case "MONTHLY_INCOME_RANGE":
      return {
        stepKey: "MONTHLY_INCOME_RANGE",
        prompt: "¿Cuál es tu rango aproximado de ingresos mensuales?",
        input: {
          type: "buttons",
          options: [
            { label: "Menos de $1.000", value: "<1000" },
            { label: "$1.000 a $5.000", value: "1000-5000" },
            { label: "$5.001 a $20.000", value: "5001-20000" },
            { label: "Más de $20.000", value: ">20000" },
          ],
        },
      };
    case "MONTHLY_EXPENSE_RANGE":
      return {
        stepKey: "MONTHLY_EXPENSE_RANGE",
        prompt: "¿Cuál es tu rango aproximado de gastos mensuales?",
        input: {
          type: "buttons",
          options: [
            { label: "Menos de $1.000", value: "<1000" },
            { label: "$1.000 a $5.000", value: "1000-5000" },
            { label: "$5.001 a $20.000", value: "5001-20000" },
            { label: "Más de $20.000", value: ">20000" },
          ],
        },
      };
    case "MATURITY_LEVEL":
      return {
        stepKey: "MATURITY_LEVEL",
        prompt: "¿Qué tan estructurada está hoy tu operación?",
        input: {
          type: "buttons",
          options: [
            { label: "Informal (sin procesos definidos)", value: "LOW" },
            { label: "Intermedia (algo de control)", value: "MEDIUM" },
            { label: "Estructurada (procesos y métricas)", value: "HIGH" },
          ],
        },
      };
    case "GOALS":
      return {
        stepKey: "GOALS",
        prompt: "¿Qué objetivos quieres lograr en los próximos 6-12 meses? (uno por línea)",
        input: { type: "textarea", placeholder: "- Crecer ventas\n- Mejorar margen\n- Contratar equipo..." },
      };
    case "PROBLEMS":
      return {
        stepKey: "PROBLEMS",
        prompt:
          "¿Qué problemas quieres resolver primero? Lista (uno por línea). Esto nos ayudará a generar el diagnóstico inicial.",
        input: { type: "textarea", placeholder: "- Baja rentabilidad\n- Clientes que no pagan\n- Costos altos..." },
      };
    default: {
      // Exhaustividad
      return {
        stepKey: params.stepKey,
        prompt: "Continuemos.",
        input: { type: "textarea" },
      };
    }
  }
}

