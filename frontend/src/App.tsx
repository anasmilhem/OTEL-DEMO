import React, { useEffect, useState } from 'react';
import { Product } from './types/product';
import { api, ProductsResponse, ProductFilters } from './services/api';
import ProductTable from './components/ProductTable';
import ProductForm from './components/ProductForm';

function App() {
    const [productsData, setProductsData] = useState<ProductsResponse>({
        products: [],
        total: 0,
        page: 1,
        totalPages: 1
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        limit: 10,
        sort: 'name',
        order: 'asc',
        search: ''
    });

    const fetchProducts = async () => {
        try {
            const data = await api.getProducts(filters);
            setProductsData(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch products');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [filters]);

    const handleSort = (field: string) => {
        setFilters(prev => ({
            ...prev,
            sort: field,
            order: prev.sort === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSearch = (value: string) => {
        setFilters(prev => ({
            ...prev,
            search: value,
            page: 1
        }));
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteProduct(id);
            fetchProducts();
        } catch (err) {
            setError('Failed to delete product');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Product Management
                    </h1>

                    <div className="mb-8">
                        <ProductForm onProductCreated={fetchProducts} />
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value={filters.search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center">Loading...</div>
                    ) : (
                        <ProductTable
                            products={productsData.products}
                            total={productsData.total}
                            page={productsData.page}
                            totalPages={productsData.totalPages}
                            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                            onSort={handleSort}
                            sortField={filters.sort}
                            sortOrder={filters.order}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default App; 