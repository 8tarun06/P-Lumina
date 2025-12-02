export function deriveRibbon(product) {
  if (!product) return null;

  const now = Date.now();

  // CreatedAt handling (Firestore timestamp)
  let createdAt = null;
  if (product.createdAt) {
    createdAt = product.createdAt.seconds
      ? product.createdAt.toMillis()
      : new Date(product.createdAt).getTime();
  }

  const daysOld = createdAt
    ? (now - createdAt) / (1000 * 60 * 60 * 24)
    : Infinity;

  const stock = typeof product.stock === "number" ? product.stock : null;

  const discount = product.discountPercentage || 0;

  const sales = typeof product.salesCount === "number"
    ? product.salesCount
    : null;

  // Fallback reviews count if needed
  const reviewsCount = product.reviewsCount
    || (Array.isArray(product.reviews) ? product.reviews.length : 0);

  // 1) LOW STOCK
  if (stock !== null && stock <= 5) {
    return {
      key: "lowstock",
      label: "Low Stock",
      className: "ribbon-limited"
    };
  }

  // 2) NEW PRODUCT (7 days)
  if (daysOld <= 7) {
    return {
      key: "new",
      label: "New",
      className: "ribbon-new"
    };
  }

  // 3) TRENDING (primary = salesCount, fallback = reviews)
  if ((sales !== null && sales >= 50) || reviewsCount >= 20) {
    return {
      key: "trending",
      label: "Bestseller",
      className: "ribbon-trending"
    };
  }

  // 4) DISCOUNT
  if (discount >= 10) {
    return {
      key: "discount",
      label: `${discount}% OFF`,
      className: "ribbon-discount"
    };
  }

  return null;
}
