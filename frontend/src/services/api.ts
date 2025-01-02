import axios from 'axios';
import { Product, CreateProductInput } from '../types/product';

const API_URL = '/api';

export interface ProductsResponse {
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ProductFilters {
    page: number;
    limit: number;
    sort: string;
    order: 'asc' | 'desc';
    search: string;
}

export const api = {
    async getProducts(filters: ProductFilters): Promise<ProductsResponse> {
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
            sort: filters.sort,
            order: filters.order,
            search: filters.search
        });
        const response = await axios.get(`${API_URL}/products?${params}`);
        return response.data;
    },

    async createProduct(product: CreateProductInput): Promise<Product> {
        const response = await axios.post(`${API_URL}/products`, product);
        return response.data;
    },

    async deleteProduct(id: string): Promise<void> {
        await axios.delete(`${API_URL}/products/${id}`);
    }
}; 