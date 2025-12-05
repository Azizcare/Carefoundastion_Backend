const couponPackages = [
  {
    id: 'FOOD_100',
    title: 'Food Coupon – ₹100',
    description: 'Redeem a ₹100 food voucher at any partner restaurant or food server. Valid for one meal.',
    category: 'food',
    type: 'discount',
    amount: 100,
    currency: 'INR',
    validityDays: 30,
    maxUses: 1,
    isUnlimited: false,
    maxRedemptionsPerDay: 1,
    partnerCategories: ['food', 'food_server', 'restaurant'],
    codePrefix: 'FOOD',
    recommendedPartners: ['food']
  },
  {
    id: 'HEALTH_500',
    title: 'Health Checkup – ₹500',
    description: 'Cover diagnostics and consultation up to ₹500 at verified health partners.',
    category: 'medical',
    type: 'discount',
    amount: 500,
    currency: 'INR',
    validityDays: 60,
    maxUses: 1,
    isUnlimited: false,
    maxRedemptionsPerDay: 1,
    partnerCategories: ['medical', 'pathology_lab', 'hospital'],
    codePrefix: 'HEAL',
    recommendedPartners: ['medical']
  }
];

const getCouponPackageById = (id) => {
  if (!id) return null;
  return couponPackages.find((pkg) => pkg.id === id);
};

const getCouponPackages = () => {
  return couponPackages.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    category: pkg.category,
    type: pkg.type,
    amount: pkg.amount,
    currency: pkg.currency,
    validityDays: pkg.validityDays,
    maxUses: pkg.maxUses,
    partnerCategories: pkg.partnerCategories,
    recommendedPartners: pkg.recommendedPartners
  }));
};

module.exports = {
  couponPackages,
  getCouponPackageById,
  getCouponPackages
};

