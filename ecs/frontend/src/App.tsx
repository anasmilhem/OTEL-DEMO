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

                    <div className="mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search products by name or description..."
                                className="pl-10 pr-4 py-2 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md"
                                value={filters.search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        {filters.search && (
                            <div className="mt-2 text-sm text-gray-500">
                                Searching for "{filters.search}"
                                <button
                                    onClick={() => handleSearch('')}
                                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
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