import React from 'react';
import { Product } from '../types/product';

interface ProductListProps {
    products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {products.map((product) => (
                    <li key={product.id}>
                        <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                                <p className="text-lg font-semibold text-gray-900">
                                    ${product.price.toFixed(2)}
                                </p>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">{product.description}</p>
                            <p className="mt-2 text-xs text-gray-400">
                                Created: {new Date(product.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList; 