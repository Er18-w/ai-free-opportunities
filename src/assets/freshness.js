// A fetch succeeding does not renew a human/Agent verification date.
export function reviewState(item, now = new Date()) {
  const deadline = item.validUntil;
  const end = deadline ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(deadline) ? `${deadline}T23:59:59+08:00` : deadline) : NaN;
  if (Number.isFinite(end) && now.getTime() > end) return 'expired';
  if (item.reviewStatus === 'needs_source_check') return 'pending';
  const checked = Date.parse(item.lastVerifiedAt ?? item.ruleCheckedAt ?? '');
  if (!Number.isFinite(checked) || checked > now.getTime() + 300000) return 'pending';
  const sensitive = item.sourceKind === 'offer' || /limited|campaign|membership|trial/.test(item.offerType ?? '');
  const maxAge = (item.reviewAfterHours ?? (sensitive ? 48 : 168)) * 3600000;
  return now.getTime() - checked > maxAge ? 'pending' : 'current';
}
