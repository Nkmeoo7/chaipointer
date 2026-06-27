/**
 * Test helpers — expose internal functions for testing without exporting from production code.
 */

function generateCouponCodeForTest(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CHAI-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = { generateCouponCodeForTest };
