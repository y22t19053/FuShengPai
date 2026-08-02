export function resolveApiModel(provider, explicitModel, fallbackModel = '') {
  const trimmed = (explicitModel || '').trim();
  if (trimmed) return trimmed;
  return fallbackModel || '';
}
