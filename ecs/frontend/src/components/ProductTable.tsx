import React, { useState } from 'react';
import { Product } from '../types/product';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ProductTableProps {
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onSort: (field: string) => void;
    sortField: string;
    sortOrder: 'asc' | 'desc';
    onDelete: (id: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
    products,
    total,
    page,
    totalPages,
    onPageChange,
    onSort,
    sortField,
    sortOrder,
    onDelete
}) => {
    const renderSortIcon = (field: string) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? (
            <ChevronUpIcon className="w-4 h-4 inline" />
        ) : (
            <ChevronDownIcon className="w-4 h-4 inline" />
        );
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => onSort('name')}
                        >
                            Name {renderSortIcon('name')}
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => onSort('price')}
                        >
                            Price {renderSortIcon('price')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                        <tr key={product._id}>
                            <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">${product.price.toFixed(2)}</td>
                            <td className="px-6 py-4">{product.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                    onClick={() => onDelete(product._id)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                            <span className="font-medium">
                                {Math.min(page * 10, total)}
                            </span>{' '}
                            of <span className="font-medium">{total}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pageNum
                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTable; 