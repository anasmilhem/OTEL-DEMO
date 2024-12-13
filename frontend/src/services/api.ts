import axios from 'axios';
import { Product, CreateProductInput } from '../types/product';

// Use the relative path since we're using nginx proxy
const API_URL = '/api';

export const api = {
    async getProducts(): Promise<Product[]> {
        const response = await axios.get(`${API_URL}/products`);
        return response.data;
    },

    async createProduct(product: CreateProductInput): Promise<Product> {
        const response = await axios.post(`${API_URL}/products`, product);
        return response.data;
    }
}; 