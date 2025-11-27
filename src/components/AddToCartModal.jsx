// components/AddToCartModal.jsx
import React, { useState, useEffect } from 'react';
import { useGlobalModal } from "../context/ModalContext";

const AddToCartModal = ({ product, isOpen, onClose, onAddToCart }) => {
  const { showModal } = useGlobalModal();
  const [selectedVariants, setSelectedVariants] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Initialize variants when product changes
  useEffect(() => {
    if (product) {
      const initialVariants = {};
      
      // Initialize color variant
      if (product.variants?.colors) {
        const availableColor = product.variants.colors.find(color => color.inStock !== false);
        if (availableColor) {
          initialVariants.color = availableColor.value;
        }
      }
      
      // Initialize size variant
      if (product.sizes) {
        const availableSize = product.sizes.find(size => size.inStock !== false);
        if (availableSize) {
          initialVariants.size = availableSize.value;
        }
      }

      // Initialize storage variant
      if (product.variants?.storage) {
        const availableStorage = product.variants.storage.find(storage => storage.inStock !== false);
        if (availableStorage) {
          initialVariants.storage = availableStorage.value;
        }
      }

      setSelectedVariants(initialVariants);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  // Get product images
  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.displayImage || product.image];

  // Calculate current price with variants
  const calculateCurrentPrice = () => {
    let price = product.price || 0;
    
    // Add variant prices
    Object.entries(selectedVariants).forEach(([type, value]) => {
      if (product.variants) {
        const variantKey = product.variants[type] ? type : type === "color" ? "colors" : type;
        const variantOptions = product.variants[variantKey];
        if (variantOptions) {
          const variantOption = variantOptions.find(opt => opt.value === value);
          if (variantOption && variantOption.price) {
            price += variantOption.price;
          }
        }
      }
    });

    return price;
  };

  const currentPrice = calculateCurrentPrice();

  const handleVariantSelect = (variantType, value) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantType]: value
    }));
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    const productWithVariants = {
      ...product,
      selectedVariants,
      quantity,
      displayPrice: currentPrice,
      variantImages: productImages,
      image: productImages[0]
    };

    onAddToCart(productWithVariants);
    onClose();
    
    showModal({
      title: "Added to Cart",
      message: `${product.name} has been added to your cart`,
      type: "success"
    });
  };

  const getVariantDisplayName = (variantType, value) => {
    if (!product.variants) return value;
    
    const variantKey = product.variants[variantType] ? variantType : variantType === "color" ? "colors" : variantType;
    const variantOptions = product.variants[variantKey];
    
    if (variantOptions) {
      const option = variantOptions.find(opt => opt.value === value);
      return option ? option.name : value;
    }
    
    return value;
  };

  // Render variant selector
  const renderVariantSelector = (variantType, options, label) => {
    if (!options || options.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{label}</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((option, index) => (
            <button
              key={index}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedVariants[variantType] === option.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-500 ring-opacity-20'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              } ${option.inStock === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => option.inStock !== false && handleVariantSelect(variantType, option.value)}
              disabled={option.inStock === false}
            >
              {option.name}
              {option.price && option.price > 0 && (
                <span className="text-xs ml-1">(+₹{option.price})</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render color selector
  const renderColorSelector = (colors) => {
    if (!colors || colors.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Color</h3>
        <div className="flex flex-wrap gap-3">
          {colors.map((color, index) => (
            <button
              key={index}
              className={`relative p-1 border-2 rounded-lg transition-all duration-200 ${
                selectedVariants.color === color.value
                  ? 'border-pink-500 ring-2 ring-pink-500 ring-opacity-20'
                  : 'border-gray-300 hover:border-gray-400'
              } ${color.inStock === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => color.inStock !== false && handleVariantSelect('color', color.value)}
              disabled={color.inStock === false}
              title={color.inStock === false ? 'Out of stock' : color.name}
            >
              <div
                className="w-10 h-10 rounded-md border border-gray-200"
                style={{ backgroundColor: color.hex || color.value }}
              />
              {selectedVariants.color === color.value && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render size selector
  const renderSizeSelector = (sizes) => {
    if (!sizes || sizes.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((size, index) => (
            <button
              key={index}
              className={`py-2 px-3 border rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedVariants.size === size.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-500 ring-opacity-20'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              } ${size.inStock === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => size.inStock !== false && handleVariantSelect('size', size.value)}
              disabled={size.inStock === false}
            >
              {size.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Select Options</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="p-6">
              {/* Product Info */}
              <div className="flex gap-4 mb-6">
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={productImages[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-pink-600">₹{currentPrice.toFixed(2)}</span>
                    {product.originalPrice && product.originalPrice > currentPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">₹{product.originalPrice.toFixed(2)}</span>
                        <span className="text-sm font-medium text-green-600">
                          {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span>({product.reviewCount || 0} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Variant Selectors */}
              {product.variants?.colors && renderColorSelector(product.variants.colors)}
              {product.sizes && renderSizeSelector(product.sizes)}
              {product.variants?.storage && renderVariantSelector('storage', product.variants.storage, 'Storage')}
              {product.variants?.ram && renderVariantSelector('ram', product.variants.ram, 'RAM')}

              {/* Quantity Selector */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quantity</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 10}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Selected Variants Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Options</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {Object.entries(selectedVariants).map(([type, value]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span className="font-medium">{getVariantDisplayName(type, value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span className="font-bold text-lg text-pink-600">₹{(currentPrice * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Add to Cart - ₹{(currentPrice * quantity).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToCartModal;