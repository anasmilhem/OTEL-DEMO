import axios from 'axios';
import { Product, CreateProductInput } from '../types/product';

const API_URL = (process.env.REACT_APP_API_URL as string) || 'http://localhost:3000';

export const api = {
    async getProducts(): Promise<Product[]> {
        const response = await axios.get(`${API_URL}/api/products`);
        return response.data;
    },

    async createProduct(product: CreateProductInput): Promise<Product> {
        const response = await axios.post(`${API_URL}/api/products`, product);
        return response.data;
    }
}; 