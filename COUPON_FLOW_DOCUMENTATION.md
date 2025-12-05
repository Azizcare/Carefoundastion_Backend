# Coupon & Wallet System Flow Documentation

## Complete Coupon Flow Implementation

### 1. Coupon Creation
- Admin creates coupon with:
  - Category: food_server, restaurant, food_grain_supplier, pathology_lab, hospital, milk_bread_vendor, etc.
  - Type: discount, cashback, free_item, service
  - Value: Amount (₹) OR Percentage (%)
  - Validity dates
  - Usage limits
  - Partner/Vendor assignment (optional)

### 2. Coupon Sending
**Endpoint:** `POST /api/coupons/:id/send`

**Flow:**
1. Admin sends coupon via WhatsApp, Email, and/or SMS
2. QR code is included in the message
3. **Auto-Wallet Addition:** If coupon has a partner/vendor assigned:
   - Automatically finds or creates vendor wallet
   - Adds coupon to wallet with calculated value
   - For percentage coupons: value = 0 (calculated on redemption)
   - For amount coupons: value = coupon amount
   - Creates transaction record: `coupon_received`

### 3. Coupon Value Calculation

**Helper Function:** `getCouponMonetaryValue(coupon)`

- **Percentage Coupons:** Returns 0 (actual value calculated on redemption with purchase amount)
- **Amount Coupons:** Returns the coupon amount
- **Free Item/Service:** Returns 0 (no monetary value)

### 4. Wallet System

**Wallet Structure:**
- `currentBalance`: Available balance for settlement
- `totalReceived`: Total coupons received (amount-based only)
- `totalRedeemed`: Total coupons redeemed
- `totalSettled`: Total amount settled by admin
- `coupons[]`: Array of coupons in wallet
- `transactions[]`: All wallet transactions

**Transaction Types:**
- `topup`: Admin adds funds directly
- `coupon_received`: Coupon added to wallet (only for amount > 0)
- `coupon_redeemed`: Coupon redeemed by customer
- `settlement`: Admin settles payment to vendor
- `adjustment`: Manual adjustments

### 5. Coupon Redemption

**Endpoint:** `POST /api/coupons/:id/redeem`

**Flow:**
1. Customer redeems coupon at vendor/partner
2. For percentage coupons: `purchaseAmount` required to calculate actual discount
3. Redemption amount calculated:
   - Amount coupon: Uses coupon amount
   - Percentage coupon: `(purchaseAmount * percentage) / 100`
4. **Wallet Update:**
   - Updates coupon status in wallet to `redeemed`
   - Adds to `totalRedeemed`
   - For amount coupons: Subtracts from `currentBalance`
   - For percentage coupons: Balance unchanged (settled separately)
   - Creates transaction: `coupon_redeemed`

### 6. Wallet Management (Admin)

**Top-up Wallet:**
- `POST /api/wallets/:vendorId/topup`
- Admin adds funds directly to vendor wallet
- Creates `topup` transaction
- Increases `currentBalance` and `totalReceived`

**Settle Wallet:**
- `POST /api/wallets/:vendorId/settle`
- Admin settles payment to vendor
- Deducts from `currentBalance`
- Adds to `totalSettled`
- Creates `settlement` transaction
- Updates `lastSettlement` record

### 7. Fraud Prevention

**Features:**
- Daily redemption limits per coupon
- Redemption tracking with timestamps
- Location-based verification (optional)
- Suspicious activity logging
- Code uniqueness enforcement
- QR code verification

**Tracking:**
- Each redemption logged with:
  - Redeemed by (user ID)
  - Redeemed at (timestamp)
  - Partner/location
  - Amount
  - Notes

### 8. Key Points

**Percentage Coupons:**
- Added to wallet with value = 0
- Actual value calculated on redemption
- Balance not affected until settlement
- Admin settles via settlement transaction

**Amount Coupons:**
- Added to wallet with actual amount
- Balance increased when received
- Balance decreased when redeemed
- Ready for settlement

**Wallet Balance Logic:**
- `currentBalance` = Amount-based coupons received - Amount-based coupons redeemed + Top-ups - Settlements
- Percentage coupons don't affect balance until settlement

### 9. API Endpoints Summary

**Coupons:**
- `POST /api/coupons` - Create coupon
- `GET /api/coupons` - Get all coupons
- `GET /api/coupons/:id` - Get coupon details
- `POST /api/coupons/:id/send` - Send coupon (auto-adds to wallet if partner exists)
- `POST /api/coupons/:id/redeem` - Redeem coupon (updates wallet)
- `POST /api/coupons/:id/add-to-wallet` - Manually add to wallet

**Wallets:**
- `GET /api/wallets/:vendorId` - Get vendor wallet
- `GET /api/wallets` - Get all wallets (admin)
- `POST /api/wallets/:vendorId/topup` - Top-up wallet (admin)
- `POST /api/wallets/:vendorId/settle` - Settle wallet (admin)
- `GET /api/wallets/:vendorId/transactions` - Get transactions

### 10. Frontend Display

**Wallet Dashboard Shows:**
- Current Balance
- Total Received
- Total Redeemed
- Total Settled
- List of coupons (pending/redeemed)
- Transaction history

**Coupon Display:**
- Shows percentage or amount value
- QR code for redemption
- Validity dates
- Usage status


