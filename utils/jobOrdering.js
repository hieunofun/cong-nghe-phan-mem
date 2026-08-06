const VIP_FIRST_JOB_ORDER_SQL = 'j.is_vip DESC, j.is_featured DESC, j.created_at DESC';

function isEnabled(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function sortJobsVipFirst(jobs) {
  return [...(jobs || [])].sort((left, right) => {
    const vipDifference = Number(isEnabled(right.is_vip)) - Number(isEnabled(left.is_vip));
    if (vipDifference) return vipDifference;

    const featuredDifference = Number(isEnabled(right.is_featured)) - Number(isEnabled(left.is_featured));
    if (featuredDifference) return featuredDifference;

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  });
}

module.exports = { VIP_FIRST_JOB_ORDER_SQL, sortJobsVipFirst };
