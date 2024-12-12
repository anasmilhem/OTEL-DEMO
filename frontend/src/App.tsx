import React, { useEffect, useState } from 'react';
import { Product } from './types/product';
import { api } from './services/api';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';

function App() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch products');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleProductCreated = async () => {
        await fetchProducts();
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Product Management
                    </h1>

                    <div className="mb-8">
                        <ProductForm onProductCreated={handleProductCreated} />
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center">Loading...</div>
                    ) : (
                        <ProductList products={products} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default App; 