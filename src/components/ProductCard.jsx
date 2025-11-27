export default function ProductCard({ product, size = "md" }) {
  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer p-4 flex flex-col">
      
      {/* IMAGE */}
      <div className="w-full aspect-square overflow-hidden rounded-lg bg-gray-100 relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* OPTIONAL BADGE */}
        {product.badge && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {product.badge}
          </span>
        )}
      </div>

      {/* TITLE */}
      <h3 className="mt-4 font-semibold text-gray-800 text-sm md:text-base line-clamp-2">
        {product.name}
      </h3>

      {/* PRICE */}
      <p className="text-gray-900 font-bold mt-1 text-sm md:text-base">
        {product.price ? `₹${product.price}` : "Contact for price"}
      </p>

      {/* OPTIONAL QUICK ACTIONS */}
      {product.actions && (
        <div className="mt-2 flex gap-2">
          {product.actions.map((action, i) => (
            <button
              key={i}
              className="text-xs md:text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
