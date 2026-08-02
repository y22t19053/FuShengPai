export function syncQuestionFromInput(input, stateRef) {
  const rawValue = input?.value ?? '';
  const nextValue = rawValue.trim();
  const resolvedValue = nextValue || stateRef.question || '';
  stateRef.question = resolvedValue;
  return resolvedValue;
}

export function createPeriodShareAction(stateRef, dataset = {}) {
  const fortuneType = dataset.fortuneType || stateRef.fortuneType || 'overall';
  const card = stateRef.periodCard || null;
  return {
    type: stateRef.periodType || 'daily',
    fortuneType,
    card,
    periodKey: stateRef.periodKey || null
  };
}
